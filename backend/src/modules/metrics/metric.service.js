import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

/** Convierte Decimal | null en number. */
const num = (value) => (value == null ? 0 : Number(value));

/**
 * Resumen general para el dashboard principal del panel.
 */
export async function overview() {
  const [
    totalEntrepreneurs,
    activeEntrepreneurs,
    suspendedEntrepreneurs,
    totalBusinesses,
    activeBusinesses,
    openAlerts,
    criticalAlerts,
    pendingRecommendations,
    newEntrepreneurs30d,
    usageEvents30d,
    planGroups,
    financeAgg,
  ] = await prisma.$transaction([
    prisma.entrepreneur.count(),
    prisma.entrepreneur.count({ where: { status: 'ACTIVE' } }),
    prisma.entrepreneur.count({ where: { status: 'SUSPENDED' } }),
    prisma.business.count(),
    prisma.business.count({ where: { status: 'ACTIVE' } }),
    prisma.alert.count({ where: { status: 'OPEN' } }),
    prisma.alert.count({ where: { status: 'OPEN', severity: 'CRITICAL' } }),
    prisma.recommendation.count({ where: { status: 'PENDING' } }),
    prisma.entrepreneur.count({
      where: { registeredAt: { gte: daysAgo(30) } },
    }),
    prisma.usageEvent.count({ where: { occurredAt: { gte: daysAgo(30) } } }),
    prisma.entrepreneur.groupBy({ by: ['plan'], _count: { _all: true } }),
    prisma.businessMetric.aggregate({
      _sum: { revenue: true, expenses: true, profit: true },
    }),
  ]);

  return {
    entrepreneurs: {
      total: totalEntrepreneurs,
      active: activeEntrepreneurs,
      suspended: suspendedEntrepreneurs,
      newLast30Days: newEntrepreneurs30d,
    },
    businesses: {
      total: totalBusinesses,
      active: activeBusinesses,
    },
    alerts: {
      open: openAlerts,
      critical: criticalAlerts,
    },
    recommendations: {
      pending: pendingRecommendations,
    },
    usage: {
      eventsLast30Days: usageEvents30d,
    },
    plans: planGroups.reduce((acc, group) => {
      acc[group.plan] = group._count._all;
      return acc;
    }, {}),
    finance: {
      totalRevenue: num(financeAgg._sum.revenue),
      totalExpenses: num(financeAgg._sum.expenses),
      totalProfit: num(financeAgg._sum.profit),
    },
  };
}

/** Alta de emprendedores por mes. */
export async function entrepreneursGrowth(months = 12) {
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT to_char(date_trunc('month', "registeredAt"), 'YYYY-MM') AS month,
           count(*)::int AS count
    FROM "Entrepreneur"
    WHERE "registeredAt" >= date_trunc('month', now()) - make_interval(months => ${months - 1}::int)
    GROUP BY 1
    ORDER BY 1
  `);
  return rows;
}

/** Uso de la plataforma por mes y por tipo de evento. */
export async function usageTrend(months = 12) {
  const [byMonth, byType] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      SELECT to_char(date_trunc('month', "occurredAt"), 'YYYY-MM') AS month,
             count(*)::int AS count
      FROM "UsageEvent"
      WHERE "occurredAt" >= date_trunc('month', now()) - make_interval(months => ${months - 1}::int)
      GROUP BY 1
      ORDER BY 1
    `),
    prisma.usageEvent.groupBy({
      by: ['type'],
      _count: { _all: true },
      where: { occurredAt: { gte: monthsAgo(months) } },
    }),
  ]);

  return {
    byMonth,
    byType: byType.map((row) => ({ type: row.type, count: row._count._all })),
  };
}

/** Distribución de negocios por categoría. */
export async function businessesByCategory() {
  const groups = await prisma.business.groupBy({
    by: ['category'],
    _count: { _all: true },
    orderBy: { _count: { category: 'desc' } },
  });
  return groups.map((group) => ({ category: group.category, count: group._count._all }));
}

/** Evolución financiera agregada de todos los emprendimientos por mes. */
export async function financeTrend(months = 12) {
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT to_char(date_trunc('month', "period"), 'YYYY-MM') AS month,
           coalesce(sum("revenue"), 0)::float AS revenue,
           coalesce(sum("expenses"), 0)::float AS expenses,
           coalesce(sum("profit"), 0)::float AS profit
    FROM "BusinessMetric"
    WHERE "period" >= date_trunc('month', now()) - make_interval(months => ${months - 1}::int)
    GROUP BY 1
    ORDER BY 1
  `);
  return rows;
}

/** Estado de las recomendaciones y alertas generadas por el sistema. */
export async function systemSignals() {
  const [recByStatus, recByPriority, alertByStatus, alertBySeverity] = await prisma.$transaction([
    prisma.recommendation.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.recommendation.groupBy({ by: ['priority'], _count: { _all: true } }),
    prisma.alert.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.alert.groupBy({ by: ['severity'], _count: { _all: true } }),
  ]);

  const toMap = (groups, key) =>
    groups.reduce((acc, group) => {
      acc[group[key]] = group._count._all;
      return acc;
    }, {});

  return {
    recommendations: {
      byStatus: toMap(recByStatus, 'status'),
      byPriority: toMap(recByPriority, 'priority'),
    },
    alerts: {
      byStatus: toMap(alertByStatus, 'status'),
      bySeverity: toMap(alertBySeverity, 'severity'),
    },
  };
}

/** Emprendedores más activos según eventos de uso. */
export async function topActiveEntrepreneurs(limit = 10) {
  const groups = await prisma.usageEvent.groupBy({
    by: ['entrepreneurId'],
    _count: { _all: true },
    orderBy: { _count: { entrepreneurId: 'desc' } },
    take: limit,
  });

  const ids = groups.map((group) => group.entrepreneurId);
  const entrepreneurs = await prisma.entrepreneur.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, email: true, plan: true, status: true },
  });
  const byId = new Map(entrepreneurs.map((entrepreneur) => [entrepreneur.id, entrepreneur]));

  return groups.map((group) => ({
    entrepreneur: byId.get(group.entrepreneurId) ?? null,
    events: group._count._all,
  }));
}

function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function monthsAgo(months) {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}
