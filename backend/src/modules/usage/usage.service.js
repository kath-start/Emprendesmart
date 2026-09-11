import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { paginationMeta } from '../../utils/http.js';

function buildWhere(query) {
  const where = {};
  if (query.entrepreneurId) where.entrepreneurId = query.entrepreneurId;
  if (query.type) where.type = query.type;
  if (query.from || query.to) {
    where.occurredAt = {};
    if (query.from) where.occurredAt.gte = query.from;
    if (query.to) where.occurredAt.lte = query.to;
  }
  return where;
}

export async function list(query, pagination) {
  const where = buildWhere(query);
  const [items, total] = await Promise.all([
    prisma.usageEvent.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { occurredAt: 'desc' },
      include: {
        entrepreneur: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.usageEvent.count({ where }),
  ]);
  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}

export async function record(data) {
  const entrepreneur = await prisma.entrepreneur.findUnique({
    where: { id: data.entrepreneurId },
    select: { id: true },
  });
  if (!entrepreneur) throw ApiError.badRequest('El emprendedor indicado no existe');

  return prisma.usageEvent.create({
    data: {
      entrepreneurId: data.entrepreneurId,
      type: data.type,
      metadata: data.metadata ?? undefined,
      occurredAt: data.occurredAt ?? undefined,
    },
  });
}

export async function summary(days = 30) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  const [total, activeEntrepreneurs, byType] = await Promise.all([
    prisma.usageEvent.count({ where: { occurredAt: { gte: since } } }),
    prisma.usageEvent
      .findMany({
        where: { occurredAt: { gte: since } },
        distinct: ['entrepreneurId'],
        select: { entrepreneurId: true },
      })
      .then((rows) => rows.length),
    prisma.usageEvent.groupBy({
      by: ['type'],
      _count: { _all: true },
      where: { occurredAt: { gte: since } },
    }),
  ]);

  return {
    rangeDays: days,
    totalEvents: total,
    activeEntrepreneurs,
    byType: byType.map((row) => ({ type: row.type, count: row._count._all })),
  };
}
