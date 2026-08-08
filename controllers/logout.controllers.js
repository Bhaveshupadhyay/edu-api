import dbConnectionPromise from "../config/db.js";
import {
  handleValidationErrors,
  createError
} from "../utils/validationHelper.js";
import {
  asyncHandler
} from '../utils/paginationHelper.js';

export const signOutAdmin = asyncHandler(async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.XXAFIT) {
    return res.sendStatus(204);
  }

  const refreshToken = cookies.XXAFIT;
  const db = await dbConnectionPromise; 

  await db.query(
    "UPDATE admin SET rem_token = NULL WHERE rem_token = ?", 
    [refreshToken]
  );

  res.clearCookie("XXAFIT", {
    sameSite: "None",
    httpOnly: true,
    secure: true
  });
      
  return res.sendStatus(204);
});

export const signOut = asyncHandler(async (req, res) => {
  handleValidationErrors(req);

  const user_id = req.user?.id;
  const cookies = req.cookies;

  // console.log(req.cookies);

  if (!cookies?.XXAFIT) {
    return res.sendStatus(204);
  }

  const refreshToken = cookies.XXAFIT;

  const { device_id } = req.body;
  const db = await dbConnectionPromise; 

  if (device_id) {
    await db.query(
      "UPDATE user_devices SET rem_token = NULL WHERE device_id = ? AND user_id = ?",
      [device_id, user_id]
    );
  } else {
    await db.query(
      "UPDATE user_devices SET rem_token = NULL WHERE rem_token = ?", 
      [refreshToken]
    );
  }

  res.clearCookie("XXAFIT", {
    sameSite: "None",
    httpOnly: true,
    secure: true
  });
      
  return res.sendStatus(204);
});
