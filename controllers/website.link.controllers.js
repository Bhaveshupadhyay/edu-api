import dbConnectionPromise from "../config/db.js";
import {
  ACCESS_TOKEN_SECRET,
  WEB_TOKEN_SECRET,
  WEB_EXPIRES_IN
} from "../config/env.js";
import { asyncHandler } from '../utils/paginationHelper.js';
import { verifyToken, generateSpecificToken } from '../utils/authHelper.js';
import { handleValidationErrors, createError } from "../utils/validationHelper.js";

export const generateWebsiteToken = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const { device_id } = req.params;
  const user_id = req.user?.id;

  if (!user_id) {
    throw createError("Unauthorized / User ID missing", 401);
  }

  const db = await dbConnectionPromise;

  const [[user]] = await db.query(
    "SELECT 1 FROM users WHERE id = ? LIMIT 1",
    [user_id]
  );

  if (!user) {
    throw createError("User not found. Please log in again.", 404);
  }

  const webToken = generateSpecificToken(
    { id: user_id },
    WEB_TOKEN_SECRET,
    WEB_EXPIRES_IN
  );

  return res.status(200).json({
    isSuccess: true,
    link: `https://www.edumovimiento.com/?src=iosApp&nftoken=${webToken}&device_id=${device_id}`
  });
});
