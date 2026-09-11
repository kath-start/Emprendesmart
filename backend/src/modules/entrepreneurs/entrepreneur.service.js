import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { paginationMeta } from '../../utils/http.js';
import { buildOrderBy } from '../../utils/validation.js';

const SORTABLE = ['firstName', 'lastName', 'registeredAt', 'createdAt', 'plan', 'status'];

function buildWhere(query) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.plan) where.plan = query.plan;
  if (query.country) where.country = { equals: query.country, mode: 'insensitive' };
  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.registeredFrom || query.registeredTo) {
    where.registeredAt = {};
    if (query.registeredFrom) where.registeredAt.gte = query.registeredFrom;
    if (query.registeredTo) where.registeredAt.lte = query.registeredTo;
  }
  return where;
}

export async function list(query, pagination) {
  const where = buildWhere(query);
  const [items, total] = await Promise.all([
    prisma.entrepreneur.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: buildOrderBy(query, SORTABLE, { registeredAt: 'desc' }),
      include: { _count: { select: { businesses: true, usageEvents: true } } },
    }),
    prisma.entrepreneur.count({ where }),
  ]);
  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}

export async function getById(id) {
  const entrepreneur = await prisma.entrepreneur.findUnique({
    where: { id },
    include: {
      businesses: {
        include: { _count: { select: { alerts: true, recommendations: true } } },
      },
      _count: { select: { businesses: true, usageEvents: true } },
    },
  });
  if (!entrepreneur) throw ApiError.notFound('Emprendedor no encontrado');
  return entrepreneur;
}

export async function create(data) {
  return prisma.entrepreneur.create({
    data: { ...data, email: data.email.toLowerCase() },
  });
}

export async function update(id, data) {
  const payload = { ...data };
  if (payload.email) payload.email = payload.email.toLowerCase();
  return prisma.entrepreneur.update({ where: { id }, data: payload });
}

export async function changeStatus(id, status) {
  return prisma.entrepreneur.update({ where: { id }, data: { status } });
}

export async function remove(id) {
  await prisma.entrepreneur.delete({ where: { id } });
}

export async function listUsage(id, pagination) {
  const entrepreneur = await prisma.entrepreneur.findUnique({ where: { id }, select: { id: true } });
  if (!entrepreneur) throw ApiError.notFound('Emprendedor no encontrado');

  const [items, total] = await Promise.all([
    prisma.usageEvent.findMany({
      where: { entrepreneurId: id },
      orderBy: { occurredAt: 'desc' },
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.usageEvent.count({ where: { entrepreneurId: id } }),
  ]);
  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}
