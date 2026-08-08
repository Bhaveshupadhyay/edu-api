import dbConnectionPromise from "../config/db.js";
import {
  handleValidationErrors,
  createError
} from "../utils/validationHelper.js";
import {
  asyncHandler,
  sendSuccess,
} from '../utils/paginationHelper.js';

// ---------- USER DETAILS CRUD ----------

export const getUserDetails = asyncHandler(async (req, res) => {
  const user_id = req.user?.id;
  const { device_id } = req.query;
  if (!user_id) throw createError("Unauthorized", 401);

  const db = await dbConnectionPromise;

  // Verify device ownership
  const [[device]] = await db.query(
    "SELECT 1 FROM user_devices WHERE user_id = ? AND device_id = ? LIMIT 1",
    [user_id, device_id]
  );
  if (!device) throw createError("Device not found or not registered to this user.", 403);

  const [rows] = await db.query(
    "SELECT name, bio, avatar_url FROM user_profiles WHERE user_id = ? AND device_id = ? LIMIT 1",
    [user_id, device_id]
  );

  return sendSuccess(res, rows[0] || {});
});

export const updateUserDetails = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const user_id = req.user?.id;
  if (!user_id) throw createError("Unauthorized", 401);

  const { device_id, name, bio, avatar_url } = req.body;
  const db = await dbConnectionPromise;

  // Verify device ownership
  const [[device]] = await db.query(
    "SELECT 1 FROM user_devices WHERE user_id = ? AND device_id = ? LIMIT 1",
    [user_id, device_id]
  );
  if (!device) throw createError("Device not found or not registered to this user.", 403);

  await db.query(
    `INSERT INTO user_profiles (user_id, device_id, name, bio, avatar_url)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
     name = VALUES(name), 
     bio = VALUES(bio), 
     avatar_url = VALUES(avatar_url)`,
    [user_id, device_id, name, bio, avatar_url]
  );

  return sendSuccess(res, { message: 'Profile updated successfully' });
});
