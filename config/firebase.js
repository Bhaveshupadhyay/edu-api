import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import logger from "../libs/logger.js";
import { 
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
} from "../config/env.js";

if (!admin.apps.length) {
  try {
    let serviceAccount = {
        type: type,
        project_id: project_id,
        private_key_id: private_key_id,
        private_key: private_key,
        client_email: client_email,
        client_id: client_id,
        auth_uri: auth_uri,
        token_uri: token_uri,
        auth_provider_x509_cert_url: auth_provider_x509_cert_url,
        client_x509_cert_url: client_x509_cert_url,
        universe_domain: universe_domain
    };

    if (serviceAccount && serviceAccount.private_key) {
      // Fix key newlines if they are escaped as string '\n'
      if (typeof serviceAccount.private_key === 'string' && serviceAccount.private_key.includes('\\n')) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      logger.info("Firebase Admin initialized successfully");
    } else {
      logger.warn("Firebase credentials not found in env variables or file path. Push notifications will be disabled.");
    }
  } catch (error) {
    logger.error("Firebase Admin initialization failed:", error);
  }
}

export default admin;
