import dbConnectionPromise from "../config/db.js";
import bcrypt from "bcryptjs";
import logger from "../libs/logger.js";

import {
  handleValidationErrors,
  createError
} from "../utils/validationHelper.js";

import {
  asyncHandler,
  withTransaction
} from '../utils/paginationHelper.js';

import { generateTokens, setTokenCookie } from '../utils/authHelper.js';

// reset password
export const resetPassword = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { password } = req.body;
  const user_id = req.user?.id;

  if (!user_id) {
    throw createError("Unauthorized / User ID missing", 401);
  }

  const db = await dbConnectionPromise;

  await withTransaction(db, async (connection) => {
    const [[user]] = await connection.query(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [user_id]
    );

    if (!user) {
      throw createError("User not found. Please log in again...", 404);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { accessToken, refreshToken } = generateTokens(user.id, 'USER');

    const [updateResult] = await connection.query(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, user.id]
    );

    if (updateResult.affectedRows === 0) {
      throw createError("Failed to update password. Try again...", 500);
    }

    await connection.query(
      "UPDATE user_devices SET rem_token = ? WHERE user_id = ?",
      [refreshToken, user.id]
    );

    setTokenCookie(res, refreshToken);

    return res.status(200).json({
      isSuccess: true,
      message: "Password reset successful!",
      token: accessToken
    });
  });
});
