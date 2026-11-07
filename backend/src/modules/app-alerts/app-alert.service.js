import { prisma } from '../../config/prisma.js';
import { paginationMeta } from '../../utils/http.js';
import { getBusinessAccessOrThrow } from '../app-businesses/app-business.service.js';

export async function list(businessId, entrepreneurId, query, pagination) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'insights');
  await resolveRecoveredStockAlerts(businessId);

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

/**
 * Cierra las alertas de "Stock bajo" abiertas cuyo producto ya se repuso (o ya no existe),
 * para que el emprendedor no vea avisos desactualizados.
 */
async function resolveRecoveredStockAlerts(businessId) {
  const open = await prisma.alert.findMany({
    where: { businessId, type: 'STOCK_BAJO', status: 'OPEN' },
    select: { id: true, message: true },
  });
  if (open.length === 0) return;

  const products = await prisma.product.findMany({
    where: { businessId },
    select: { name: true, stock: true, lowStockThreshold: true },
  });
  const stillLow = new Set(products.filter((p) => p.stock <= p.lowStockThreshold).map((p) => p.name));

  const recovered = open
    .filter((alert) => {
      const name = alert.message.match(/"(.+)"/)?.[1];
      return name !== undefined && !stillLow.has(name);
    })
    .map((alert) => alert.id);
  if (recovered.length === 0) return;

  await prisma.alert.updateMany({
    where: { id: { in: recovered } },
    data: { status: 'RESOLVED', resolvedAt: new Date(), resolutionNote: 'Stock repuesto' },
  });
}
