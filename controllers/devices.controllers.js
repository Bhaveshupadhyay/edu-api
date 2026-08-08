import dbConnectionPromise from "../config/db.js";
import {
  handleValidationErrors,
  createError
} from "../utils/validationHelper.js";
import {
  asyncHandler,
  sendSuccess,
} from '../utils/paginationHelper.js';

export const connected_devices = asyncHandler(async (req, res) => {
  const user_id = req.user?.id;
  const db = await dbConnectionPromise;

  const [ connectedDevices ] = await db.query(
    "SELECT device_id, device_type, seen_at FROM user_devices WHERE user_id = ?",
    [user_id]
  );

  const [ subscriptionRows ] = await db.query(
    `SELECT p.max_screens AS "deviceLimit"
     FROM user_subscriptions us
     LEFT JOIN plans p ON p.id = us.plan_id
     WHERE us.user_id = ? LIMIT 1`,
    [user_id]
  );

  const deviceLimit = subscriptionRows[0]?.deviceLimit || 1;
  const totalConnected = connectedDevices.length;

  const reasonCode = totalConnected > deviceLimit ? 2 : 1;
  const message = reasonCode === 2
    ? `Please remove ${totalConnected - deviceLimit} ${totalConnected - deviceLimit === 1 ? 'device' : 'devices'} to continue.`
    : "";

  return res.status(200).json({
    isSuccess: true,
    data: {
      message,
      result: connectedDevices,
      reasonCode,
      deviceLimit
    }
  });
});

export const remove_device = asyncHandler(async (req, res) => {
  handleValidationErrors(req);
  const db = await dbConnectionPromise;

  const user_id = req.user?.id;
  const { current_device_id, device_id } = req.body;

  if (current_device_id === device_id) {
    return res.status(200).json({
      isRemoved: false,
      message: "You can't remove the currently logged-in device."
    });
  }

  const { rowCount } = await db.query(
    "DELETE FROM user_devices WHERE user_id = ? AND device_id = ?",
    [user_id, device_id]
  );

  await db.query(
    "DELETE FROM user_profiles WHERE user_id = ? AND device_id = ?",
    [user_id, device_id]
  );

  if (rowCount === 0) {
    throw createError("No such user device found.", 404);
  }

  res.clearCookie("XXAFIT", {
    sameSite: "None",
    httpOnly: true,
    secure: true
  });

  return sendSuccess(res, { "isRemoved": true, "message": "Success" });
});
