import { prisma } from '../../config/prisma.js';
import { paginationMeta } from '../../utils/http.js';
import { getBusinessAccessOrThrow } from '../app-businesses/app-business.service.js';

export async function list(businessId, entrepreneurId, query, pagination) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'insights');

  const where = { businessId };
  if (query.status) where.status = query.status;
  if (query.severity) where.severity = query.severity;

  const [items, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { triggeredAt: 'desc' },
    }),
    prisma.alert.count({ where }),
  ]);

  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}
