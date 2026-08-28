import jwt from "jsonwebtoken";
import { SHORT_TOKEN_SECRET } from "../config/env.js";
import logger from "../libs/logger.js";
import { createError } from "../utils/validationHelper.js";

/**
 * Middleware to check whether the email verification token is valid and not expired (10-minute validity)
 */
const verifyEmailMiddleware = async (req, res, next) => {
  try {
    let token = req.query.q;

    if (!token) {
      // if (req.method === "GET" && req.accepts("html")) {
      //   return res.status(400).send(`
      //     <!DOCTYPE html>
      //     <html lang="es">
      //     <head><title>Token faltante - Edu Garcia Movimiento</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
      //     <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc;">
      //       <div style="background: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 450px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin: 20px;">
      //         <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
      //         <h2 style="color: #dc2626; margin-top: 0;">Token no proporcionado</h2>
      //         <p style="color: #64748b; line-height: 1.6;">No se encontró ningún token de verificación en la solicitud.</p>
      //       </div>
      //     </body>
      //     </html>
      //   `);
      // }
      throw createError("Verification token is required", 400);
    }

    try {
      const verifiedUser = jwt.verify(token, SHORT_TOKEN_SECRET);
      req.user = verifiedUser;
      next();
    } catch (err) {
      logger.error("Email verification token expired or invalid", { error: err.message });
      // if (req.method === "GET" && req.accepts("html")) {
      //   return res.status(401).send(`
      //     <!DOCTYPE html>
      //     <html lang="es">
      //     <head><title>Enlace expirado o no válido - Edu Garcia Movimiento</title><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
      //     <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc;">
      //       <div style="background: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 450px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin: 20px;">
      //         <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
      //         <h2 style="color: #dc2626; margin-top: 0;">Enlace expirado o no válido</h2>
      //         <p style="color: #64748b; line-height: 1.6;">El enlace de verificación ha expirado (límite de 10 minutos) o no es válido. Por favor solicita un nuevo enlace de verificación.</p>
      //       </div>
      //     </body>
      //     </html>
      //   `);
      // }
      const error = createError("Verification token has expired or is invalid. Please request a new verification email.", 401);
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

export default verifyEmailMiddleware;
