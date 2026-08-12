import { config } from "dotenv";

config({
  path: `.env.${process.env.NODE_ENV || 'production'}.local`,
  override: true  // Force override system environment variables
});

export const {
  NODE_ENV,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  SHORT_TOKEN_SECRET,
  OTP_TOKEN_SECRET,
  WEB_TOKEN_SECRET,
  CHECKSUM_SECRET,
  BASE_URL,
  BASE_URL1,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
  SHORT_EXPIRES_IN,
  OTP_EXPIRES_IN,
  WEB_EXPIRES_IN,
  HOST,
  USER,
  PASSWORD,
  DATABASE,
  REVIEWER_EMAIL,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  IDENTIFIER,
  RPASSWORD,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  FIREBASE_SERVICE_ACCOUNT_PATH,
  FIREBASE_CREDENTIALS,
  FIREBASE_SERVICE_ACCOUNT,
  type,
  project_id,
  private_key_id,
  private_key,
  client_email,
  client_id,
  auth_uri,
  token_uri,
  auth_provider_x509_cert_url,
  client_x509_cert_url,
  universe_domain
} = process.env;

export const PORT = process.env.PORT || 3000;