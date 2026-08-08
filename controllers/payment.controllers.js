import { getOrSetCache, clearCache } from "../utils/cache.js";
import redisClient from "../config/redis.js";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import dbConnectionPromise from "../config/db.js";
import {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  BASE_URL1,
  WEB_TOKEN_SECRET
} from "../config/env.js";

import {
  handleValidationErrors,
  createError
} from "../utils/validationHelper.js";

import {
  sendSuccess,
  asyncHandler,
  getCursorPaginationParams,
  getCursorResults,
  sendCursorPaginatedResponse
} from '../utils/paginationHelper.js';

import logger from "../libs/logger.js";
import { webhookQueue } from "../libs/queue.js";
import { generateTokens, setTokenCookie, isReviewer } from "../utils/authHelper.js";

const stripe = new Stripe(STRIPE_SECRET_KEY);

// ========== HELPER FUNCTIONS ==========

async function getCustomerByUserId(user_id) {
  const db = await dbConnectionPromise;
  const [[user]] = await db.query(
    "SELECT email, stripe_customer_id FROM users WHERE id = ?",
    [user_id]
  );

  if (!user) {
    throw createError("User not found.", 404);
  }

  // If user already has a stripe_customer_id, return it
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  // Otherwise, check Stripe by email to avoid duplicates
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  
  let customerId;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  } else {
    // Create customer if not exists
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user_id.toString() }
    });
    customerId = customer.id;
  }

  // Save the customer ID to the users table
  await db.query(
    "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
    [customerId, user_id]
  );
  
  return customerId;
}

// ========== CONTROLLERS ==========

export const get_token_verified = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { token, device_id } = req.body;
  if (!token) throw createError("Token is required", 400);

  const verifiedUser = jwt.verify(token, WEB_TOKEN_SECRET);
  if (!verifiedUser?.id) throw createError("Invalid token", 401);

  const userId = verifiedUser.id;
  const db = await dbConnectionPromise;
  const [[user]] = await db.query("SELECT id, email FROM users WHERE id = ?", [userId]);
  if (!user) throw createError("User not found", 404);

  const email = user.email;
  const isUserReviewer = isReviewer(email);

  const [subscriptions] = await db.query(
    `SELECT up.name as profile_name, up.bio as profile_bio, s.status, s.current_period_end, s.stripe_sub_id, 
    p.plan_name, p.monthly_price, p.duration_value, p.duration_unit
     FROM user_subscriptions s
     JOIN plans p ON s.plan_id = p.id
     LEFT JOIN user_profiles up ON up.user_id = s.user_id AND up.device_id = ?
     WHERE s.user_id = ? 
     ORDER BY s.id DESC LIMIT 1`,
    [device_id || null, userId]
  );

  const sub = subscriptions[0];
  const nowTime = new Date();
  const isValidStatus = sub && ['active', 'trialing'].includes(sub.status);
  const isNotExpired = sub && new Date(sub.current_period_end) > nowTime;
  const hasActiveSub = (isValidStatus && isNotExpired) || isUserReviewer;

  const userData = {
    email: email,
    profile_name: sub?.profile_name || 'Member', 
    profile_bio: sub?.profile_bio || null,
    is_subscribed: hasActiveSub ? 1 : 0,
    is_reviewer: isUserReviewer ? 1 : 0,
    subscription_details: sub ? {
        sub_id: sub.stripe_sub_id,
        plan: sub.plan_name,
        plan_duration_value: sub.duration_value,
        plan_duration_type: sub.duration_unit,
        max_devices: (isValidStatus && isNotExpired) ? sub.max_screens : 1,
        expiry: sub.current_period_end,
        status: (isValidStatus && isNotExpired) ? sub.status : 'expired',
        amount: sub.monthly_price
    } : null
  };

  await redisClient.setex(`user_profile:${userId}`, 3600, JSON.stringify(userData));

  const { accessToken, refreshToken } = generateTokens(userId);
  setTokenCookie(res, refreshToken);

  return sendSuccess(res, {
    user: userData,
    accessToken,
    reasonCode: 1
  });
});

export const post_subscription_plan = asyncHandler(async (req, res) => {
  const plans = await getOrSetCache("active_plans", async () => {
    const db = await dbConnectionPromise;
    const [rows] = await db.query("SELECT * FROM plans WHERE is_active = TRUE");
    return rows;
  }, 3600); // Cache for 1 hour
  return sendSuccess(res, { plans });
});

export const post_subscription = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { plan, device_id } = req.body; 
  const planName = plan.toLowerCase();
  const user_id = req.user.id;

  const db = await dbConnectionPromise;
  
  const [[planData]] = await db.query("SELECT id, stripe_price_id FROM plans WHERE plan_name = ? AND is_active = 1", [planName]);

  if (!planData) {
    throw createError("Invalid or inactive plan selected.", 400);
  }

  // Verify device ownership
  const [[device]] = await db.query(
    "SELECT 1 FROM user_devices WHERE user_id = ? AND device_id = ? LIMIT 1",
    [user_id, device_id]
  );
  if (!device) throw createError("Device not found or not registered to this user.", 403);

  const customerId = await getCustomerByUserId(user_id);

  // Check if user already has an active subscription
  const [[existingSub]] = await db.query(
    "SELECT 1 FROM user_subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')",
    [user_id]
  );

  if (existingSub) {
    throw createError("You already have an active subscription.", 400);
  }

  // const session = await stripe.checkout.sessions.create({
  //   mode: "subscription",
  //   payment_method_types: ["card"],
  //   customer: customerId,
  //   line_items: [{
  //     price: planData.stripe_price_id,
  //     quantity: 1
  //   }],
  //   metadata: {
  //     user_id: user_id.toString(),
  //     plan_id: planData.id.toString(),
  //     device_id: device_id
  //   },
  //   success_url: `${BASE_URL1}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
  //   cancel_url: `${BASE_URL1}/payment-cancelled`
  // });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    // CHANGE THIS: Instead of forcing just "card", use 'automatic' 
    // or include sepa_debit if enabled in your dashboard
    payment_method_types: ["card", "sepa_debit"], 
    customer: customerId,
    line_items: [{
      price: plan.stripe_price_id,
      quantity: 1
    }],
    metadata: {
      user_id: user_id.toString(),
      plan_id: plan_id.toString(),
      device_id: device_id
    },
    subscription_data: {
      metadata: {
        user_id: user_id.toString(),
        plan_id: plan_id.toString(),
        device_id: device_id
      },
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        // ADD THIS: Instructs Stripe how to behave if the first payment 
        // fallback requires asynchronous handling (like SEPA bank processing)
        payment_method_options: {
          card: {
            request_three_d_secure: 'any' // Forces SCA setup check on day one
          }
        }
      }
    },
    success_url: `${BASE_URL1}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL1}/payment-cancelled`
});

  return sendSuccess(res, { url: session.url });
});

export const get_subscription_status = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const { session_id } = req.query;
  const user_id = req.user.id;
  const db = await dbConnectionPromise;

  // 1. Try to find it in our Database first
  let [[subscription]] = await db.query(
    `SELECT us.*, p.monthly_price, p.plan_name, p.duration_value, p.duration_unit FROM user_subscriptions us
     JOIN plans p ON us.plan_id = p.id
     WHERE us.user_id = ? ORDER BY us.id DESC LIMIT 1`,
    [user_id]
  );

  // 2. If NOT in DB, check Stripe Checkout Session directly
  if (!subscription) {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    // If Stripe says it's paid, but our DB is empty, the webhook is likely still processing
    if (session.payment_status === 'paid') {
      return sendSuccess(res, {
        isActive: true,
        sub_id: null,
        amount: null,
        status: 'processing', // Tell frontend to show "Setting up your account..."
        message: "We're finalizing your subscription. This will take a moment.",
        plan: "Loading...",
        expiry: null
      });
    }
    throw createError("Subscription not found.", 404);
  }

  return sendSuccess(res, {
    isActive: ['active', 'trialing'].includes(subscription.status),
    sub_id: subscription?.stripe_subscription_id,
    status: subscription.status,
    plan: subscription.plan_name,
    amount: subscription.monthly_price,
    expiry: subscription.current_period_end
  });
});

export const get_user_subscriptions = asyncHandler(async (req, res) => {
  const user_id = req.user.id;
  const { limit, cursor } = getCursorPaginationParams(req.query);
  const cacheKey = `user_subscriptions_list:${user_id}:limit=${limit}:cursor=${cursor || 'none'}`;

  const data = await getOrSetCache(cacheKey, async () => {
    const db = await dbConnectionPromise;

    return await getCursorResults(
      db,
      `SELECT us.*, p.plan_name, p.monthly_price, p.duration_value, p.duration_unit 
       FROM user_subscriptions us
       JOIN plans p ON us.plan_id = p.id
       WHERE us.user_id = ?`,
      [user_id],
      cursor,
      limit,
      'us.id'
    );
  }, 3600);

  return sendCursorPaginatedResponse(res, data.result, { nextCursor: data.nextCursor, hasMore: data.hasMore });
});

export const cancel_subscription = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const { subs_id } = req.body;
  const user_id = req.user.id;

  const db = await dbConnectionPromise;

  const [[subscription]] = await db.query(
    "SELECT 1 FROM user_subscriptions WHERE stripe_sub_id = ? AND user_id = ?",
    [subs_id, user_id]
  );

  if (!subscription) {
    throw createError("Subscription not found or unauthorized.", 404);
  }

  // Delete immediately in Stripe
  await stripe.subscriptions.cancel(subs_id);

  await db.query(
    "UPDATE user_subscriptions SET status = 'canceled' WHERE stripe_sub_id = ?",
    [subs_id]
  );

  // Clear relevant caches
  await Promise.all([
    clearCache(`user_subscriptions_list:${user_id}:*`),
    clearCache(`user_profile:${user_id}`),
    clearCache(`user_profiles:${user_id}`)
  ]);

  return sendSuccess(res, { message: "Subscription cancelled successfully." });
});

export const stripe_webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Add job to BullMQ queue
    await webhookQueue.add(event.type, { event });

    res.json({ received: true });
  } catch (error) {
    logger.error(`Error adding webhook to queue (${event.type}): ${error.message}`);
    res.status(500).json({ error: 'Failed to enqueue webhook' });
  }
};
