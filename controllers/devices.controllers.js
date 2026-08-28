import dbConnectionPromise from "../config/db.js";
import {
  handleValidationErrors,
  createError
} from "../utils/validationHelper.js";
import {
  asyncHandler,
  sendSuccess,
} from '../utils/paginationHelper.js';
import { generateDeviceFingerprint } from "../utils/authHelper.js";
import { clearCache } from "../utils/cache.js";

export const connected_devices = asyncHandler(async (req, res) => {
  const user_id = req.user?.id;
  const db = await dbConnectionPromise;

  let [ connectedDevices ] = await db.query(
    "SELECT device_fingerprint, device_type, seen_at FROM user_devices WHERE user_id = ? ORDER BY seen_at ASC",
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

  // If total devices exceed deviceLimit, auto remove web devices according to seen_at (oldest first)
  if (connectedDevices.length > deviceLimit) {
    const webDevices = connectedDevices.filter(d => d.device_type === 'web');
    if (webDevices.length > 0) {
      for (const webDev of webDevices) {
        await db.query(
          "DELETE FROM user_devices WHERE user_id = ? AND device_fingerprint = ?",
          [user_id, webDev.device_fingerprint]
        );
        await db.query(
          "DELETE FROM user_profiles WHERE user_id = ? AND device_fingerprint = ?",
          [user_id, webDev.device_fingerprint]
        );
      }
      [ connectedDevices ] = await db.query(
        "SELECT device_fingerprint, device_type, seen_at FROM user_devices WHERE user_id = ? ORDER BY seen_at ASC",
        [user_id]
      );
    }
  }

  // Count non-web devices (web devices are not counted towards the device limit)
  const countableDevices = connectedDevices.filter(d => d.device_type !== 'web');
  const totalConnected = countableDevices.length;

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

  const currentFp = /^[a-f0-9]{64}$/i.test(current_device_id)
    ? current_device_id
    : generateDeviceFingerprint(current_device_id);

  const targetFp = /^[a-f0-9]{64}$/i.test(device_id)
    ? device_id
    : generateDeviceFingerprint(device_id);

  if (
    current_device_id === device_id ||
    (currentFp && targetFp && currentFp === targetFp) ||
    currentFp === device_id ||
    current_device_id === targetFp
  ) {
    return res.status(200).json({
      isRemoved: false,
      message: "You can't remove the currently logged-in device."
    });
  }

  const [result] = await db.query(
    "DELETE FROM user_devices WHERE user_id = ? AND (device_fingerprint = ? OR device_fingerprint = ?)",
    [user_id, targetFp, device_id]
  );

  await db.query(
    "DELETE FROM user_profiles WHERE user_id = ? AND (device_fingerprint = ? OR device_fingerprint = ?)",
    [user_id, targetFp, device_id]
  );

  await Promise.all([
    clearCache(`user_session:${user_id}:${targetFp}`),
    clearCache(`user_devices:${user_id}`),
    clearCache(`user_profile:${user_id}`),
    clearCache(`user_profiles:${user_id}`)
  ]);

  if (result.affectedRows === 0) {
    throw createError("No such user device found.", 404);
  }

  res.clearCookie("XXAFIT", {
    sameSite: "None",
    httpOnly: true,
    secure: true
  });

  return sendSuccess(res, { "isRemoved": true, "message": "Success" });
});
