import jwt from "jsonwebtoken";
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
  NODE_ENV,
  REVIEWER_EMAIL
} from "../config/env.js";

/**
 * Generate a name from an email address
 * @param {string} email 
 * @returns {string}
 */
export const generateNameFromEmail = (email) => {
  if (!email) return 'User';
  const namePart = email.split('@')[0];
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
};

/**
 * Check if the given email belongs to a reviewer.
 * @param {string} email - Email to check.
 * @returns {boolean} True if it's a reviewer.
 */
export const isReviewer = (email) => {
  if (!email || !REVIEWER_EMAIL) return false;
  return email.toLowerCase() === REVIEWER_EMAIL.toLowerCase();
};

/**
 * Generate Access and Refresh tokens
 * @param {number|string} userId - User ID
 * @param {string} userType - User type ('user' or 'admin', default: 'user')
 * @returns {Object} { accessToken, refreshToken }
 */
export const generateTokens = (userId, userType) => {
  const accessToken = jwt.sign({ id: userId, role: userType }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN
  });

  const refreshToken = jwt.sign({ id: userId, role: userType }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN
  });

  return { accessToken, refreshToken };
};

/**
 * Set Refresh Token cookie
 * @param {Object} res - Express response object
 * @param {string} refreshToken - Refresh token string
 */
export const setTokenCookie = (res, refreshToken) => {
  res.cookie("XXAFIT", refreshToken, {
    httpOnly: true,
    secure: true, // only for HTTPS
    sameSite: "None", // required for cross-site cookies
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });
};

/**
 * Verify a JWT token
 * @param {string} token - Token to verify
 * @param {string} secret - Secret key
 * @returns {Promise<Object>} Verified payload
 */
export const verifyToken = (token, secret) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
};

/**
 * Generate a specific purpose token
 * @param {Object} payload - Data to encode
 * @param {string} secret - Secret key
 * @param {string} expiresIn - Expiry time
 * @returns {string} Signed token
 */
export const generateSpecificToken = (payload, secret, expiresIn) => {
  return jwt.sign(payload, secret, { expiresIn });
};
