import crypto from 'node:crypto';

import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { verifyPassword, hashPassword } from '../../utils/password.js';
import { sendMail } from '../../utils/mailer.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';

/** Elimina el hash de contraseña antes de exponer el emprendedor. */
export function sanitizeEntrepreneur(entrepreneur) {
  if (!entrepreneur) return entrepreneur;
  const { passwordHash, ...rest } = entrepreneur;
  return rest;
}

function issueTokens(entrepreneur) {
  const payload = { sub: entrepreneur.id, email: entrepreneur.email, type: 'entrepreneur' };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function register({ firstName, lastName, email, password, phone, country, city }) {
  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.entrepreneur.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw ApiError.conflict('Ya existe una cuenta registrada con ese email');
  }

  const entrepreneur = await prisma.entrepreneur.create({
    data: {
      firstName,
      lastName,
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      phone,
      country,
      city,
    },
  });

  return { entrepreneur: sanitizeEntrepreneur(entrepreneur), ...issueTokens(entrepreneur) };
}

export async function login({ email, password }) {
  const entrepreneur = await prisma.entrepreneur.findUnique({ where: { email: email.toLowerCase() } });
  if (!entrepreneur || entrepreneur.status !== 'ACTIVE' || !entrepreneur.passwordHash) {
    throw ApiError.unauthorized('Credenciales inválidas');
  }

  const valid = await verifyPassword(password, entrepreneur.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('Credenciales inválidas');
  }

  await prisma.usageEvent.create({
    data: {
      entrepreneurId: entrepreneur.id,
      type: 'LOGIN',
      metadata: { source: 'mobile' },
    },
  });

  return { entrepreneur: sanitizeEntrepreneur(entrepreneur), ...issueTokens(entrepreneur) };
}

export async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Refresh token inválido o expirado');
  }

  if (payload.type !== 'entrepreneur') {
    throw ApiError.unauthorized('Refresh token inválido o expirado');
  }

  const entrepreneur = await prisma.entrepreneur.findUnique({ where: { id: payload.sub } });
  if (!entrepreneur || entrepreneur.status !== 'ACTIVE') {
    throw ApiError.unauthorized('La cuenta ya no está activa');
  }

  return issueTokens(entrepreneur);
}

export async function getProfile(entrepreneurId) {
  const entrepreneur = await prisma.entrepreneur.findUnique({ where: { id: entrepreneurId } });
  if (!entrepreneur) throw ApiError.notFound('Cuenta no encontrada');
  return sanitizeEntrepreneur(entrepreneur);
}

export async function changePassword(entrepreneurId, { currentPassword, newPassword }) {
  const entrepreneur = await prisma.entrepreneur.findUnique({ where: { id: entrepreneurId } });
  if (!entrepreneur || !entrepreneur.passwordHash) throw ApiError.notFound('Cuenta no encontrada');

  const valid = await verifyPassword(currentPassword, entrepreneur.passwordHash);
  if (!valid) throw ApiError.badRequest('La contraseña actual no es correcta');

  await prisma.entrepreneur.update({
    where: { id: entrepreneurId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}

const RESET_CODE_TTL_MINUTES = 15;
const RESET_CODE_MAX_ATTEMPTS = 5;
const RESET_CODE_RESEND_SECONDS = 60;

function hashResetCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/** Genera y envía por correo un código de 6 dígitos. No falla si el email no existe. */
export async function forgotPassword({ email }) {
  const entrepreneur = await prisma.entrepreneur.findUnique({ where: { email: email.toLowerCase() } });
  if (!entrepreneur || entrepreneur.status !== 'ACTIVE') return;

  const lastCode = await prisma.passwordResetCode.findFirst({
    where: { entrepreneurId: entrepreneur.id },
    orderBy: { createdAt: 'desc' },
  });
  // Ignora reenvíos muy seguidos sin error, para no revelar que la cuenta existe.
  if (lastCode && Date.now() - lastCode.createdAt.getTime() < RESET_CODE_RESEND_SECONDS * 1000) return;

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  await prisma.$transaction([
    // Solo el último código pedido es válido.
    prisma.passwordResetCode.updateMany({
      where: { entrepreneurId: entrepreneur.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetCode.create({
      data: {
        entrepreneurId: entrepreneur.id,
        codeHash: hashResetCode(code),
        expiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  await sendMail({
    to: entrepreneur.email,
    subject: `${code} es tu código de EmprendeSmart`,
    text:
      `Hola ${entrepreneur.firstName},\n\n` +
      `Tu código para restablecer la contraseña es: ${code}\n\n` +
      `Vence en ${RESET_CODE_TTL_MINUTES} minutos. Si no lo pediste, ignora este correo.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0D1B3E">
        <h2 style="color:#1A6FF0;margin-bottom:4px">EmprendeSmart</h2>
        <p>Hola ${entrepreneur.firstName},</p>
        <p>Usa este código para restablecer tu contraseña:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#F4F7FC;padding:16px;text-align:center;border-radius:12px">${code}</p>
        <p style="color:#5B6B85">Vence en ${RESET_CODE_TTL_MINUTES} minutos. Si no lo pediste, ignora este correo.</p>
      </div>`,
  });
}

/** Valida el código y cambia la contraseña. */
export async function resetPassword({ email, code, newPassword }) {
  const invalid = () => ApiError.badRequest('El código es inválido o ya venció');

  const entrepreneur = await prisma.entrepreneur.findUnique({ where: { email: email.toLowerCase() } });
  if (!entrepreneur || entrepreneur.status !== 'ACTIVE') throw invalid();

  const resetCode = await prisma.passwordResetCode.findFirst({
    where: { entrepreneurId: entrepreneur.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!resetCode) throw invalid();
  if (resetCode.attempts >= RESET_CODE_MAX_ATTEMPTS) {
    throw ApiError.badRequest('Demasiados intentos con este código. Pide uno nuevo');
  }

  const matches = crypto.timingSafeEqual(Buffer.from(hashResetCode(code)), Buffer.from(resetCode.codeHash));
  if (!matches) {
    await prisma.passwordResetCode.update({
      where: { id: resetCode.id },
      data: { attempts: { increment: 1 } },
    });
    throw invalid();
  }

  await prisma.$transaction([
    prisma.passwordResetCode.update({ where: { id: resetCode.id }, data: { usedAt: new Date() } }),
    prisma.entrepreneur.update({
      where: { id: entrepreneur.id },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
  ]);
}

// Recuperación sin código (pedido de la dueña del proyecto, app de pruebas/demos): basta con que el
// email exista para cambiar la contraseña. Quien conozca un email registrado puede cambiar su clave.
async function findActiveByEmailOrThrow(email) {
  const entrepreneur = await prisma.entrepreneur.findUnique({ where: { email: email.toLowerCase() } });
  if (!entrepreneur || entrepreneur.status !== 'ACTIVE') {
    throw ApiError.notFound('No encontramos una cuenta activa con ese correo');
  }
  return entrepreneur;
}

/** Verifica que el email esté registrado y devuelve el nombre para saludar en la app. */
export async function checkResetEmail({ email }) {
  const entrepreneur = await findActiveByEmailOrThrow(email);
  return { firstName: entrepreneur.firstName };
}

/** Cambia la contraseña de la cuenta con ese email, sin código de verificación. */
export async function directResetPassword({ email, newPassword }) {
  const entrepreneur = await findActiveByEmailOrThrow(email);
  await prisma.entrepreneur.update({
    where: { id: entrepreneur.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}
