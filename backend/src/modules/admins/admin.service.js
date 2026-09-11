import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { hashPassword } from '../../utils/password.js';
import { paginationMeta } from '../../utils/http.js';
import { sanitizeAdmin } from '../auth/auth.service.js';

const SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

export async function listAdmins(query, pagination) {
  const where = {};
  if (query.role) where.role = query.role;
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      select: SELECT,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.admin.count({ where }),
  ]);

  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}

export async function getAdmin(id) {
  const admin = await prisma.admin.findUnique({ where: { id }, select: SELECT });
  if (!admin) throw ApiError.notFound('Administrador no encontrado');
  return admin;
}

export async function createAdmin(data) {
  const exists = await prisma.admin.findUnique({ where: { email: data.email.toLowerCase() } });
  if (exists) throw ApiError.conflict('Ya existe un administrador con ese email');

  const admin = await prisma.admin.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: await hashPassword(data.password),
      role: data.role ?? 'ADMIN',
    },
    select: SELECT,
  });
  return admin;
}

export async function updateAdmin(id, data, actingAdmin) {
  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) throw ApiError.notFound('Administrador no encontrado');

  // Evita que un SUPER_ADMIN se quite a sí mismo el rol o se desactive y quede el sistema sin acceso.
  if (actingAdmin.id === id && (data.role && data.role !== 'SUPER_ADMIN' || data.status === 'INACTIVE')) {
    throw ApiError.badRequest('No puedes cambiar tu propio rol o desactivar tu cuenta');
  }

  const payload = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.role !== undefined) payload.role = data.role;
  if (data.status !== undefined) payload.status = data.status;
  if (data.password !== undefined) payload.passwordHash = await hashPassword(data.password);

  return prisma.admin.update({ where: { id }, data: payload, select: SELECT });
}

export async function deleteAdmin(id, actingAdmin) {
  if (actingAdmin.id === id) {
    throw ApiError.badRequest('No puedes eliminar tu propia cuenta');
  }
  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) throw ApiError.notFound('Administrador no encontrado');

  const superAdmins = await prisma.admin.count({ where: { role: 'SUPER_ADMIN', status: 'ACTIVE' } });
  if (target.role === 'SUPER_ADMIN' && superAdmins <= 1) {
    throw ApiError.badRequest('Debe existir al menos un super administrador activo');
  }

  await prisma.admin.delete({ where: { id } });
}

export { sanitizeAdmin };
