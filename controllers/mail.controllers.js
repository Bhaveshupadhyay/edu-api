import { Resend } from 'resend';
import { 
  MAILENV, 
  RESEND_FROM_EMAIL, 
  BASE_URL, 
  SHORT_TOKEN_SECRET 
} from "../config/env.js";
import logger from "../libs/logger.js";
import dbConnectionPromise from "../config/db.js";
import { 
  verifyToken, 
  generateSpecificToken, 
  generateNameFromEmail 
} from "../utils/authHelper.js";
import { 
  asyncHandler, 
  sendSuccess 
} from "../utils/paginationHelper.js";
import { 
  handleValidationErrors, 
  createError 
} from "../utils/validationHelper.js";
import { clearCache } from "../utils/cache.js";

const resend = new Resend(MAILENV);

/**
 * Format sender address to satisfy Resend's strict RFC 5322 format:
 * 'email@example.com' or 'Name <email@example.com>'
 * @param {string} rawSender 
 * @returns {string}
 */
export const formatSenderEmail = (rawSender) => {
  const defaultSender = 'Edu Garcia Movimiento <noreply@mail.edumovimiento.com>';
  if (!rawSender || typeof rawSender !== 'string' || !rawSender.trim()) {
    return defaultSender;
  }

  const trimmed = rawSender.trim();

  // If already full 'Name <email@domain.com>'
  if (/^.+<[^<@\s]+@[^<@\s]+\.[^<@\s]+>$/.test(trimmed)) {
    return trimmed;
  }

  // If plain email 'email@domain.com'
  if (/^[^<@\s]+@[^<@\s]+\.[^<@\s]+$/.test(trimmed)) {
    return `Edu Garcia Movimiento <${trimmed}>`;
  }

  // If bare domain e.g. 'mail.edumovimiento.com' or 'edumovimiento.com'
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return `Edu Garcia Movimiento <noreply@${trimmed}>`;
  }

  return defaultSender;
};

/**
 * Generic email dispatcher using Resend
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML body content
 * @param {string} [options.text] - Plain text fallback
 * @param {string} [options.from] - Sender email address
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const sendEmail = async ({ to, subject, html, text, from }) => {
  if (!resend) {
    logger.warn('Resend client is not initialized (missing MAILENV / RESEND_API_KEY)');
    return { success: false, error: 'Resend API key missing' };
  }

  const sender = formatSenderEmail(from || RESEND_FROM_EMAIL);

  try {
    const { data, error } = await resend.emails.send({
      from: sender,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, '')
    });

    if (error) {
      logger.error('Resend email delivery failed', { error: error.message || error });
      return { isSuccess: false, error: error.message || error };
    }

    logger.info(`Email sent successfully...`);
    return { isSuccess: true, data };
  } catch (err) {
    logger.error('Error sending email via Resend', { error: err.message });
    return { isSuccess: false, error: err.message };
  }
};


/**
 * Send OTP verification email for password reset / forget password
 * @param {string} email - Recipient email address
 * @param {string|number} otp - Generated numeric OTP
 * @returns {Promise<Object>}
 */
export const sendOtpEmail = async (email, otp) => {
  const subject = `${otp} es tu código de verificación - Edu Garcia Movimiento`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Código de verificación</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { text-align: center; margin-bottom: 24px; }
        .app-name { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; }
        .title { font-size: 18px; font-weight: 600; color: #334155; margin-top: 16px; }
        .otp-box { background: #f1f5f9; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #2563eb; font-family: monospace; }
        .text { font-size: 14px; line-height: 1.6; color: #64748b; margin: 12px 0; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="app-name">Edu Garcia Movimiento</h1>
          <h2 class="title">Restablecimiento de contraseña</h2>
        </div>
        <p class="text">Hola,</p>
        <p class="text">Has solicitado un código para restablecer la contraseña de tu cuenta en <strong>Edu Garcia Movimiento</strong>.</p>
        <div class="otp-box">
          <span class="otp-code">${otp}</span>
        </div>
        <p class="text">Este código es válido por 10 minutos. Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Edu Garcia Movimiento. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Edu Garcia Movimiento\n\nTu código de verificación para restablecer tu contraseña es: ${otp}\n\nEste código es válido por 10 minutos. Si no solicitaste este cambio, por favor ignora este correo.`;

  return await sendEmail({
    to: email,
    subject,
    html,
    text
  });
};

/**
 * Send welcome email after sign-in / registration
 * @param {string} email - Recipient email address
 * @param {string} [name='Miembro'] - User's name
 * @returns {Promise<Object>}
 */
export const sendWelcomeEmail = async (email, name = 'Miembro') => {
  const displayName = name || 'Miembro';
  const subject = `¡Bienvenido a Edu Garcia Movimiento!`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido a Edu Garcia Movimiento</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { text-align: center; margin-bottom: 24px; }
        .app-name { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
        .greeting { font-size: 18px; font-weight: 600; color: #334155; margin-top: 16px; }
        .text { font-size: 14px; line-height: 1.6; color: #475569; margin: 14px 0; }
        .highlight-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="app-name">Edu Garcia Movimiento</h1>
          <h2 class="greeting">¡Hola, ${displayName}! 👋</h2>
        </div>
        <p class="text">Te damos la bienvenida a <strong>Edu Garcia Movimiento</strong>. Estamos encantados de acompañarte en tu proceso y desarrollo de movimiento, movilidad y entrenamiento.</p>
        <div class="highlight-box">
          <p class="text" style="margin: 0; color: #1e40af; font-weight: 500;">
            Tu cuenta ha sido activada correctamente. Ya puedes acceder a todas tus clases, módulos y contenidos desde cualquiera de tus dispositivos.
          </p>
        </div>
        <p class="text">Si tienes alguna pregunta o necesitas ayuda, no dudes en ponerte en contacto con nuestro equipo.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Edu Garcia Movimiento. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `¡Hola ${displayName}!\n\nBienvenido a Edu Garcia Movimiento. Tu cuenta ha sido activada correctamente y estamos felices de tenerte con nosotros.\n\nAccede a tus clases y contenidos desde la plataforma.\n\n© ${new Date().getFullYear()} Edu Garcia Movimiento`;

  return await sendEmail({
    to: email,
    subject,
    html,
    text
  });
};

/**
 * Send email verification link with a "Verify Your Email" button (10 minutes expiration)
 * @param {string} email - Recipient email address
 * @param {string} token - 10-minute verification token
 * @param {string} [name='Miembro'] - User's name
 * @returns {Promise<Object>}
 */
export const sendVerificationEmail = async (email, token, device, name = 'Miembro') => {
  const displayName = name || 'Miembro';
  const subject = `Verifica tu correo electrónico - Edu Garcia Movimiento`;
  
  const verifyLink = `${BASE_URL}/api/v1/auth/verify-email?q=${encodeURIComponent(token)}`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifica tu correo electrónico</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { text-align: center; margin-bottom: 24px; }
        .app-name { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
        .greeting { font-size: 18px; font-weight: 600; color: #334155; margin-top: 16px; }
        .text { font-size: 14px; line-height: 1.6; color: #475569; margin: 14px 0; }
        .btn-container { text-align: center; margin: 32px 0; }
        .btn { background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25); }
        .note { font-size: 13px; color: #64748b; margin-top: 20px; line-height: 1.5; }
        .link-text { word-break: break-all; color: #2563eb; font-size: 12px; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="app-name">Edu Garcia Movimiento</h1>
          <h2 class="greeting">¡Hola, ${displayName}! 👋</h2>
        </div>
        <p class="text">Gracias por formar parte de <strong>Edu Garcia Movimiento</strong>. Para confirmar tu dirección de correo electrónico, por favor haz clic en el siguiente botón:</p>
        
        <div class="btn-container">
          <a href="${verifyLink}" target="_blank" class="btn">Verificar mi correo electrónico</a>
        </div>
        
        <p class="note"><strong>Nota:</strong> Este enlace de verificación expirará en <strong>10 minutos</strong>. Si tú no creaste esta cuenta, puedes ignorar este correo de forma segura.</p>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Edu Garcia Movimiento. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `¡Hola ${displayName}!\n\nPor favor verifica tu correo electrónico para Edu Garcia Movimiento haciendo clic en el siguiente enlace:\n${verifyLink}\n\nEste enlace expirará en 10 minutos.\n\n© ${new Date().getFullYear()} Edu Garcia Movimiento`;

  return await sendEmail({
    to: email,
    subject,
    html,
    text
  });
};

/**
 * Send access steps email with direct "Access now" button opening in a new tab
 * @param {string|Object} emailOrOptions - Recipient email address or options object
 * @param {string} [link] - One-time / web access URL
 * @param {string} [name='Miembro'] - User's name
 * @returns {Promise<Object>}
 */
export const sendAccessStepsEmail = async (emailOrOptions, link, name = 'Miembro') => {
  let email, accessLink, displayName;

  email = emailOrOptions;
  accessLink = link;
  displayName = name || 'Miembro';

  const subject = `Pasos para acceder a tu cuenta - Edu Garcia Movimiento`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pasos para acceder a tu cuenta</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { text-align: center; margin-bottom: 24px; }
        .app-name { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
        .greeting { font-size: 18px; font-weight: 600; color: #334155; margin-top: 16px; }
        .text { font-size: 14px; line-height: 1.6; color: #475569; margin: 14px 0; }
        .steps-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0; }
        .btn-container { text-align: center; margin: 32px 0; }
        .btn { background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25); }
        .note { font-size: 13px; color: #64748b; margin-top: 20px; line-height: 1.5; }
        .link-text { word-break: break-all; color: #2563eb; font-size: 12px; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="app-name">Edu Garcia Movimiento</h1>
          <h2 class="greeting">¡Hola, ${displayName}! 👋</h2>
        </div>
        <p class="text">Has solicitado los pasos para acceder a tu plataforma y contenidos en <strong>Edu Garcia Movimiento</strong>.</p>
        
        <div class="steps-box">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 32px; vertical-align: top; padding-bottom: 12px;">
                <div style="background-color: #2563eb; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">1</div>
              </td>
              <td style="vertical-align: top; padding-bottom: 12px; font-size: 14px; color: #334155; line-height: 1.5;">
                Haz clic en el botón <strong>"Access now"</strong> a continuación.
              </td>
            </tr>
            <tr>
              <td style="width: 32px; vertical-align: top; padding-bottom: 12px;">
                <div style="background-color: #2563eb; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">2</div>
              </td>
              <td style="vertical-align: top; padding-bottom: 12px; font-size: 14px; color: #334155; line-height: 1.5;">
                El enlace se abrirá de forma segura en una nueva pestaña de tu navegador e iniciará tu sesión automáticamente.
              </td>
            </tr>
            <tr>
              <td style="width: 32px; vertical-align: top;">
                <div style="background-color: #2563eb; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">3</div>
              </td>
              <td style="vertical-align: top; font-size: 14px; color: #334155; line-height: 1.5;">
                Disfruta de tus clases, programas y seguimiento de entrenamiento sin interrupciones.
              </td>
            </tr>
          </table>
        </div>

        <div class="btn-container">
          <a href="${accessLink}" target="_blank" rel="noopener noreferrer" class="btn" style="background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block;">Access now</a>
        </div>

        <p class="note">Si el botón no funciona, copia y pega el siguiente enlace directamente en tu navegador:</p>
        <p style="margin: 8px 0;"><a href="${accessLink}" target="_blank" rel="noopener noreferrer" class="link-text">${accessLink}</a></p>

        <p class="note"><strong>Nota de seguridad:</strong> Este enlace de acceso es personal y exclusivo para tu cuenta. Si no solicitaste este acceso, por favor desestima este correo.</p>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Edu Garcia Movimiento. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `¡Hola ${displayName}!\n\nHas solicitado los pasos para acceder a tu plataforma en Edu Garcia Movimiento.\n\nPasos de acceso:\n1. Haz clic en el siguiente enlace o botón 'Access now':\n${accessLink}\n2. El enlace abrirá una nueva pestaña en tu navegador e iniciará tu sesión automáticamente.\n3. Disfruta de todo tu contenido y entrenamientos.\n\nSi no solicitaste este correo, puedes ignorarlo de forma segura.\n\n© ${new Date().getFullYear()} Edu Garcia Movimiento`;

  return await sendEmail({
    to: email,
    subject,
    html,
    text
  });
};


export default {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendAccessStepsEmail,
  formatSenderEmail
};