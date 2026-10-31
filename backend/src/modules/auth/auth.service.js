import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { verifyPassword, hashPassword } from '../../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.js';

/** Elimina el hash de contraseña antes de exponer el admin. */
export function sanitizeAdmin(admin) {
  if (!admin) return admin;
  const { passwordHash, ...rest } = admin;
  return rest;
}

function issueTokens(admin) {
  const payload = { sub: admin.id, role: admin.role, email: admin.email, type: 'admin' };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function login({ email, password }) {
  const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin || admin.status !== 'ACTIVE') {
    throw ApiError.unauthorized('Credenciales inválidas');
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('Credenciales inválidas');
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return { admin: sanitizeAdmin(admin), ...issueTokens(admin) };
}

export async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Refresh token inválido o expirado');
  }

  if (payload.type !== 'admin') {
    throw ApiError.unauthorized('Refresh token inválido o expirado');
  }

  const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
  if (!admin || admin.status !== 'ACTIVE') {
    throw ApiError.unauthorized('La cuenta ya no está activa');
  }

  return issueTokens(admin);
}

export async function getProfile(adminId) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw ApiError.notFound('Administrador no encontrado');
  return sanitizeAdmin(admin);
}

export async function changePassword(adminId, { currentPassword, newPassword }) {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw ApiError.notFound('Administrador no encontrado');

  const valid = await verifyPassword(currentPassword, admin.passwordHash);
  if (!valid) throw ApiError.badRequest('La contraseña actual no es correcta');

  await prisma.admin.update({
    where: { id: adminId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
}
