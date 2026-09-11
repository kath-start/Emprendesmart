import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { paginationMeta } from '../../utils/http.js';
import { buildOrderBy } from '../../utils/validation.js';

const SORTABLE = ['name', 'category', 'stage', 'status', 'createdAt', 'employeesCount'];

function buildWhere(query) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.stage) where.stage = query.stage;
  if (query.entrepreneurId) where.entrepreneurId = query.entrepreneurId;
  if (query.category) where.category = { equals: query.category, mode: 'insensitive' };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

/** Normaliza la fecha al primer día del mes (UTC). */
function toMonthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function list(query, pagination) {
  const where = buildWhere(query);
  const [items, total] = await Promise.all([
    prisma.business.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: buildOrderBy(query, SORTABLE),
      include: {
        entrepreneur: { select: { id: true, firstName: true, lastName: true, email: true, plan: true } },
        _count: { select: { alerts: true, recommendations: true, metrics: true } },
      },
    }),
    prisma.business.count({ where }),
  ]);
  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}

export async function getById(id) {
  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      entrepreneur: { select: { id: true, firstName: true, lastName: true, email: true, plan: true, status: true } },
      metrics: { orderBy: { period: 'desc' }, take: 12 },
      recommendations: { orderBy: { generatedAt: 'desc' }, take: 10 },
      alerts: { orderBy: { triggeredAt: 'desc' }, take: 10 },
      _count: { select: { alerts: true, recommendations: true, metrics: true } },
    },
  });
  if (!business) throw ApiError.notFound('Negocio no encontrado');
  return business;
}

export async function create(data) {
  const entrepreneur = await prisma.entrepreneur.findUnique({
    where: { id: data.entrepreneurId },
    select: { id: true },
  });
  if (!entrepreneur) throw ApiError.badRequest('El emprendedor indicado no existe');
  return prisma.business.create({ data });
}

export async function update(id, data) {
  return prisma.business.update({ where: { id }, data });
}

export async function remove(id) {
  await prisma.business.delete({ where: { id } });
}

export async function listMetrics(id, filters) {
  const business = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!business) throw ApiError.notFound('Negocio no encontrado');

  const where = { businessId: id };
  if (filters.from || filters.to) {
    where.period = {};
    if (filters.from) where.period.gte = toMonthStart(filters.from);
    if (filters.to) where.period.lte = toMonthStart(filters.to);
  }
  return prisma.businessMetric.findMany({ where, orderBy: { period: 'asc' } });
}

export async function upsertMetric(id, data) {
  const business = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!business) throw ApiError.notFound('Negocio no encontrado');

  const period = toMonthStart(data.period);
  const revenue = data.revenue ?? 0;
  const expenses = data.expenses ?? 0;
  const profit = revenue - expenses;

  return prisma.businessMetric.upsert({
    where: { businessId_period: { businessId: id, period } },
    create: {
      businessId: id,
      period,
      revenue,
      expenses,
      profit,
      customersCount: data.customersCount ?? 0,
      salesCount: data.salesCount ?? 0,
    },
    update: {
      revenue,
      expenses,
      profit,
      customersCount: data.customersCount ?? 0,
      salesCount: data.salesCount ?? 0,
    },
  });
}
