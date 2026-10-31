import nodemailer from 'nodemailer';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from './apiError.js';

let gmailTransport;

function getGmailTransport() {
  gmailTransport ??= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.mail.gmailUser, pass: env.mail.gmailAppPassword },
  });
  return gmailTransport;
}

async function sendWithGmail({ to, subject, html, text }) {
  await getGmailTransport().sendMail({
    from: `EmprendeSmart <${env.mail.gmailUser}>`,
    to,
    subject,
    html,
    text,
  });
}

async function sendWithResend({ to, subject, html, text }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.mail.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.mail.from, to, subject, html, text }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend respondió ${response.status}: ${detail}`);
  }
}

function logToConsole(reason, { to, subject, text }) {
  logger.warn(`[mailer] ${reason}; correo mostrado aquí en su lugar.\nPara: ${to}\nAsunto: ${subject}\n${text}`);
}

/**
 * Envía un correo. Usa Gmail si GMAIL_USER/GMAIL_APP_PASSWORD están definidos (llega a cualquier
 * destinatario), si no Resend. En desarrollo, si no hay proveedor o el envío falla, muestra el
 * correo en la consola para no bloquear las pruebas.
 */
export async function sendMail(message) {
  const useGmail = Boolean(env.mail.gmailUser && env.mail.gmailAppPassword);
  if (!useGmail && !env.mail.resendApiKey) {
    if (env.isProd) throw ApiError.badGateway('El envío de correos no está configurado');
    logToConsole('Sin proveedor de correo configurado', message);
    return;
  }

  try {
    await (useGmail ? sendWithGmail(message) : sendWithResend(message));
  } catch (error) {
    logger.error(`[mailer] Error enviando con ${useGmail ? 'Gmail' : 'Resend'}: ${error.message}`);
    if (env.isProd) throw ApiError.badGateway('No se pudo enviar el correo, intenta más tarde');
    logToConsole('No se pudo enviar', message);
  }
}
