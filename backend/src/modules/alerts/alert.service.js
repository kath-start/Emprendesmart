import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { paginationMeta } from '../../utils/http.js';

const businessInclude = {
  business: {
    select: {
      id: true,
      name: true,
      category: true,
      entrepreneur: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
  resolvedBy: { select: { id: true, name: true, email: true } },
};

const SEVERITY_ORDER = { CRITICAL: 3, WARNING: 2, INFO: 1 };

function buildWhere(query) {
  const where = {};
  if (query.businessId) where.businessId = query.businessId;
  if (query.status) where.status = query.status;
  if (query.severity) where.severity = query.severity;
  if (query.type) where.type = { equals: query.type, mode: 'insensitive' };
  if (query.from || query.to) {
    where.triggeredAt = {};
    if (query.from) where.triggeredAt.gte = query.from;
    if (query.to) where.triggeredAt.lte = query.to;
  }
  return where;
}

export async function list(query, pagination) {
  const where = buildWhere(query);
  const [items, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: [{ status: 'asc' }, { triggeredAt: 'desc' }],
      include: businessInclude,
    }),
    prisma.alert.count({ where }),
  ]);

  // Prioriza severidad alta dentro de la página devuelta.
  items.sort((a, b) => (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0));

  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}

export async function getById(id) {
  const alert = await prisma.alert.findUnique({ where: { id }, include: businessInclude });
  if (!alert) throw ApiError.notFound('Alerta no encontrada');
  return alert;
}

export async function create(data) {
  const business = await prisma.business.findUnique({ where: { id: data.businessId }, select: { id: true } });
  if (!business) throw ApiError.badRequest('El negocio indicado no existe');
  return prisma.alert.create({ data, include: businessInclude });
}

export async function updateStatus(id, { status, resolutionNote }, adminId) {
  const alert = await prisma.alert.findUnique({ where: { id }, select: { id: true } });
  if (!alert) throw ApiError.notFound('Alerta no encontrada');

  const resolved = status === 'RESOLVED';
  return prisma.alert.update({
    where: { id },
    data: {
      status,
      resolutionNote: resolutionNote ?? undefined,
      resolvedById: resolved ? adminId : null,
      resolvedAt: resolved ? new Date() : null,
    },
    include: businessInclude,
  });
}

export async function remove(id) {
  await prisma.alert.delete({ where: { id } });
}
