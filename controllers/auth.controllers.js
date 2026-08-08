import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ReasonCode } from "../utils/reasonCode.js";
import dbConnectionPromise from "../config/db.js";
import crypto from "crypto";
import {
  OTP_TOKEN_SECRET,
  OTP_EXPIRES_IN,
  STRIPE_SECRET_KEY
} from "../config/env.js";
import logger from "../libs/logger.js";
import stripe from "stripe";
const stripeInstance = new stripe(STRIPE_SECRET_KEY);

import {
  handleValidationErrors,
  createError
} from "../utils/validationHelper.js";

import {
  asyncHandler,
  withTransaction,
  sendSuccess
} from '../utils/paginationHelper.js';

import { 
  generateTokens, 
  setTokenCookie, 
  generateNameFromEmail, 
  isReviewer 
} from '../utils/authHelper.js';
import redisClient from "../config/redis.js";
import { clearCache } from "../utils/cache.js";

function generateSecureOTP() {
  const otp = crypto.randomInt(10000, 100000); 
  return otp.toString();
}

/**
 * Core Auth Sync Logic (Used by login/register flows)
 */
const syncAuthBackend = async (req, res, emailInput, deviceId, deviceTypeInput, password, isRegistration = false) => {
  const email = (emailInput || "").toLowerCase();

  try {
    const result = await withTransaction(dbConnectionPromise, async (connection) => {
      
      // 1. Initial Check based on Email
      const [users] = await connection.execute("SELECT * FROM users WHERE email = ?", [email]);
      
      if (isRegistration && users.length > 0) {
        return { error: "Account already exists. Please try again later.", status: 400 };
      }

      if (!isRegistration && users.length === 0) {
        return { error: "Account not found. Please sign-up first.", status: 404 };
      }

      let user;
      let userId;
      let stripeCustomerId = users.length > 0 ? users[0].stripe_customer_id : null;

      if (isRegistration) {
        // Handle Registration
        if (!password) {
            return { error: "Password is required for registration", status: 400 };
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            const customers = await stripeInstance.customers.list({ email, limit: 1 });
            if (customers.data.length > 0) {
              stripeCustomerId = customers.data[0].id;
            } else {
              const customer = await stripeInstance.customers.create({
                email,
                name: generateNameFromEmail(email)
              });
              stripeCustomerId = customer.id;
            }
        } catch (stripeErr) {
            logger.error("Stripe customer operation failed", { error: stripeErr.message });
            return { error: `Payment setup failed: ${stripeErr.message}`, status: 400 };
        }

        const [insertResult] = await connection.execute(
          `INSERT INTO users (email, password, stripe_customer_id) VALUES (?, ?, ?)`,
          [email, hashedPassword, stripeCustomerId]
        );
        userId = insertResult.insertId;
        user = { id: userId, email, stripe_customer_id: stripeCustomerId };
      } else {
        // Handle Login
        user = users[0];
        userId = user.id;

        if (password) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return { error: "Incorrect email or password. Please try again.", status: 401 };
            }
        }

        if (!stripeCustomerId) {
            try {
                const customers = await stripeInstance.customers.list({ email, limit: 1 });
                if (customers.data.length > 0) {
                    stripeCustomerId = customers.data[0].id;
                } else {
                    const customer = await stripeInstance.customers.create({
                        email,
                        name: generateNameFromEmail(email)
                    });
                    stripeCustomerId = customer.id;
                }
                await connection.execute("UPDATE users SET stripe_customer_id = ? WHERE id = ?", [stripeCustomerId, userId]);
            } catch (stripeErr) {
                logger.error("Stripe sync failed during login", { error: stripeErr.message });
            }
        }
      }

      const { accessToken, refreshToken } = generateTokens(userId);
      setTokenCookie(res, refreshToken);

      let currentDeviceCount = 0;
      if (deviceId) {
        // Normalize device type to match enum: 'android', 'ios', 'web', 'tv'
        const type = ['android', 'ios', 'web', 'tv'].includes(deviceTypeInput) ? deviceTypeInput : 'web';

        // ALIGNED WITH NEW user_devices SCHEMA (using device_type, seen_at auto-updates)
        await connection.execute(
          `INSERT INTO user_devices (user_id, device_id, device_type, rem_token) 
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           rem_token = VALUES(rem_token),
           device_type = VALUES(device_type)`,
          [userId, deviceId, type, refreshToken]
        );
        
        const [[{ count }]] = await connection.execute(
          "SELECT COUNT(*) as count FROM user_devices WHERE user_id = ?",
          [userId]
        );
        currentDeviceCount = count;

        await Promise.all([
          clearCache(`user_session:${userId}:${deviceId}`),
          clearCache(`user_devices:${userId}`),
          clearCache(`user_profile:${userId}`),
          clearCache(`user_profiles:${userId}`)
        ]);

        await connection.execute(
          `INSERT INTO user_profiles (user_id, device_id, name) 
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE name = name`,
          [userId, deviceId, 'Member']
        );
      }

      const isUserReviewer = isReviewer(email);
      let authReasonCode = null;

      const [subscriptions] = await connection.execute(
        `SELECT up.name as profile_name, up.bio as profile_bio, s.status, s.current_period_end, s.stripe_sub_id, 
        p.plan_name, p.monthly_price, p.max_screens, p.duration_value, p.duration_unit
         FROM user_subscriptions s
         JOIN plans p ON s.plan_id = p.id
         LEFT JOIN user_profiles up ON up.user_id = s.user_id AND up.device_id = ?
         WHERE s.user_id = ? 
         ORDER BY s.id DESC LIMIT 1`,
        [deviceId, userId]
      );

      const sub = subscriptions[0];
      const nowTime = new Date();
      const isValidStatus = sub && ['active', 'trialing'].includes(sub.status);
      const isNotExpired = sub && new Date(sub.current_period_end) > nowTime;
      const hasActiveSub = (isValidStatus && isNotExpired) || isUserReviewer;

      // console.log(currentDeviceCount);

      if (hasActiveSub && !isUserReviewer) {
        const maxScreens = sub.max_screens || 1;
        if (currentDeviceCount > maxScreens) {
          authReasonCode = 2; // Device limit reached
        }
      }

      const userData = {
        // id: userId,
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

      return {
        user: userData,
        accessToken,
        reasonCode: authReasonCode || 1
      };
    });

    if (result && result.error) {
      return res.status(result.status || 400).json({
        isSuccess: false,
        message: result.error,
        ...(result.reasonCode && { reasonCode: result.reasonCode })
      });
    }

    return res.status(200).json({
      isSuccess: true,
      message: ReasonCode[result.reasonCode || 1],
      data: result
    });

  } catch (error) {
    logger.error("Auth Sync Failed", { email, error: error.message });
    return res.status(500).json({
      isSuccess: false,
      message: "Internal server error during authentication sync."
    });
  }
};

export const signUp = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const { email, password, device_id, device_type } = req.body;
  return await syncAuthBackend(req, res, email, device_id, device_type, password, true);
});

export const signIn = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const { email, password, device_id, device_type } = req.body;
  return await syncAuthBackend(req, res, email, device_id, device_type, password, false);
});

export const sendOTP = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const email = req.body.email?.toLowerCase();
  const db = await dbConnectionPromise;
  const [[user]] = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (!user) throw createError("User not found", 404);

  const otp = generateSecureOTP();
  const otpToken = jwt.sign({ id: user.id, number: otp }, OTP_TOKEN_SECRET, { expiresIn: OTP_EXPIRES_IN });
  console.log(`OTP for ${email}: ${otp}`);
  return res.status(200).json({ isSuccess: true, token: otpToken });
});

export const signInAdmin = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const email = req.body.email?.toLowerCase();
  const { password } = req.body;
  const db = await dbConnectionPromise;

  const [[admin]] = await db.query("SELECT id, password FROM admin WHERE email = ? LIMIT 1", [email]);
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    throw createError("Invalid email or password", 401);
  }

  const { accessToken, refreshToken } = generateTokens(admin.id);
  await db.query("UPDATE admin SET rem_token = ? WHERE id = ?", [refreshToken, admin.id]);
  setTokenCookie(res, refreshToken);

  return sendSuccess(res, { token: accessToken }, "successfully logged in");
});
