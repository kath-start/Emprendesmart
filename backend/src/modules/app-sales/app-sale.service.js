import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { paginationMeta } from '../../utils/http.js';
import { getBusinessAccessOrThrow } from '../app-businesses/app-business.service.js';

const SELLER = { select: { id: true, firstName: true, lastName: true } };

export async function list(businessId, entrepreneurId, pagination) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'view');
  const where = { businessId };
  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { soldAt: 'desc' },
      include: { items: true, seller: SELLER },
    }),
    prisma.sale.count({ where }),
  ]);
  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}

export async function getById(businessId, entrepreneurId, saleId) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'view');
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: { include: { product: { select: { id: true, name: true } } } }, seller: SELLER },
  });
  if (!sale || sale.businessId !== businessId) {
    throw ApiError.notFound('Venta no encontrada');
  }
  return sale;
}

export async function create(businessId, entrepreneurId, { items, notes }) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'sell');

  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, businessId } });
  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const productId of productIds) {
    if (!productMap.has(productId)) {
      throw ApiError.badRequest('Uno de los productos indicados no existe en este negocio');
    }
  }

  const quantityByProduct = new Map();
  for (const item of items) {
    quantityByProduct.set(item.productId, (quantityByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  for (const [productId, quantity] of quantityByProduct) {
    const product = productMap.get(productId);
    if (product.stock < quantity) {
      throw ApiError.badRequest(`Stock insuficiente para "${product.name}" (disponible: ${product.stock})`);
    }
  }

  const saleItemsData = items.map((item) => {
    const product = productMap.get(item.productId);
    const subtotal = Number(product.price) * item.quantity;
    return { productId: item.productId, quantity: item.quantity, unitPrice: product.price, subtotal };
  });
  const total = saleItemsData.reduce((sum, item) => sum + Number(item.subtotal), 0);

  const alerts = [];

  const sale = await prisma.$transaction(async (tx) => {
    const createdSale = await tx.sale.create({
      data: { businessId, notes, total, sellerId: entrepreneurId, items: { create: saleItemsData } },
      include: { items: true, seller: SELLER },
    });

    for (const [productId, quantity] of quantityByProduct) {
      const product = productMap.get(productId);
      const newStock = product.stock - quantity;

      await tx.product.update({ where: { id: productId }, data: { stock: newStock } });
      await tx.inventoryMovement.create({
        data: { productId, type: 'SALE', quantity, note: `Venta ${createdSale.id}` },
      });

      if (newStock <= product.lowStockThreshold) {
        const alert = await tx.alert.create({
          data: {
            businessId,
            type: 'STOCK_BAJO',
            severity: 'WARNING',
            message: `Stock bajo para "${product.name}": quedan ${newStock} unidades`,
          },
        });
        alerts.push(alert);
      }
    }

    return createdSale;
  });

  return { sale, alerts };
}

// Perú no cambia de horario: los días del resumen empiezan a las 00:00 de UTC-5.
const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function peruDayIndex(date) {
  return Math.floor((date.getTime() - PERU_OFFSET_MS) / DAY_MS);
}

/**
 * Resumen para el inicio: ventas de hoy vs. ayer, ingresos de la semana (lunes a domingo)
 * vs. la anterior y el total por día de ambas semanas para el gráfico de barras.
 */
export async function summary(businessId, entrepreneurId) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'insights');

  const today = peruDayIndex(new Date());
  // El día 0 (1970-01-01) fue jueves; así se obtiene el lunes de esta semana.
  const weekStart = today - ((today + 3) % 7);
  const lastWeekStart = weekStart - 7;
  const from = new Date(lastWeekStart * DAY_MS + PERU_OFFSET_MS);

  const sales = await prisma.sale.findMany({
    where: { businessId, soldAt: { gte: from } },
    select: { soldAt: true, total: true, items: { select: { quantity: true } } },
  });

  const thisWeek = Array(7).fill(0);
  const lastWeek = Array(7).fill(0);
  const units = { today: 0, yesterday: 0 };
  for (const sale of sales) {
    const day = peruDayIndex(sale.soldAt);
    const amount = Number(sale.total);
    if (day >= weekStart) thisWeek[day - weekStart] += amount;
    else lastWeek[day - lastWeekStart] += amount;

    const quantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    if (day === today) units.today += quantity;
    if (day === today - 1) units.yesterday += quantity;
  }

  const sum = (values) => values.reduce((total, value) => total + value, 0);
  const salesOn = (day) => {
    const index = day - lastWeekStart;
    return index < 7 ? lastWeek[index] : thisWeek[index - 7];
  };
  const round = (value) => Math.round(value * 100) / 100;

  return {
    today: { sales: round(salesOn(today)), units: units.today },
    yesterday: { sales: round(salesOn(today - 1)), units: units.yesterday },
    thisWeek: { total: round(sum(thisWeek)), days: thisWeek.map(round) },
    lastWeek: { total: round(sum(lastWeek)), days: lastWeek.map(round) },
    todayIndex: today - weekStart,
  };
}

/** Inicio del mes (00:00 hora Perú) desplazado `monthOffset` meses respecto al actual. */
function peruMonthStart(monthOffset = 0) {
  const peruNow = new Date(Date.now() - PERU_OFFSET_MS);
  return new Date(Date.UTC(peruNow.getUTCFullYear(), peruNow.getUTCMonth() + monthOffset, 1) + PERU_OFFSET_MS);
}

/**
 * Indicadores del mes para el inicio según la etapa del negocio: metas de las primeras ventas,
 * meta mensual, productos top, comparación con el mes pasado, ticket promedio, ganancia
 * estimada, ventas por día de la semana y por vendedor.
 */
export async function insights(businessId, entrepreneurId) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'insights');

  const monthStart = peruMonthStart(0);
  const lastMonthStart = peruMonthStart(-1);

  const [business, products, sales, allTimeSales] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { monthlySalesGoal: true } }),
    prisma.product.findMany({
      where: { businessId },
      select: { id: true, name: true, cost: true, status: true, imageUrl: true },
    }),
    prisma.sale.findMany({
      where: { businessId, soldAt: { gte: lastMonthStart } },
      select: {
        soldAt: true,
        total: true,
        items: { select: { productId: true, quantity: true, unitPrice: true, subtotal: true } },
        seller: SELLER,
      },
    }),
    prisma.sale.count({ where: { businessId } }),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  const round = (value) => Math.round(value * 100) / 100;

  const month = { total: 0, count: 0, profit: 0, profitComplete: true };
  const lastMonth = { total: 0, count: 0 };
  const unitsByProduct = new Map();
  const weekday = Array(7).fill(0);
  const sellers = new Map();

  for (const sale of sales) {
    const amount = Number(sale.total);
    if (sale.soldAt < monthStart) {
      lastMonth.total += amount;
      lastMonth.count += 1;
      continue;
    }
    month.total += amount;
    month.count += 1;

    // 1970-01-01 fue jueves: (día + 3) % 7 da 0 = lunes.
    weekday[(peruDayIndex(sale.soldAt) + 3) % 7] += amount;

    const sellerKey = sale.seller?.id ?? 'unknown';
    const seller = sellers.get(sellerKey) ?? {
      name: sale.seller ? `${sale.seller.firstName} ${sale.seller.lastName}`.trim() : 'Sin registrar',
      total: 0,
      count: 0,
    };
    seller.total += amount;
    seller.count += 1;
    sellers.set(sellerKey, seller);

    for (const item of sale.items) {
      const stats = unitsByProduct.get(item.productId) ?? { units: 0, revenue: 0 };
      stats.units += item.quantity;
      stats.revenue += Number(item.subtotal);
      unitsByProduct.set(item.productId, stats);

      const cost = productById.get(item.productId)?.cost;
      if (cost == null) month.profitComplete = false;
      else month.profit += (Number(item.unitPrice) - Number(cost)) * item.quantity;
    }
  }

  const describe = (product) => {
    const stats = unitsByProduct.get(product.id) ?? { units: 0, revenue: 0 };
    return { id: product.id, name: product.name, imageUrl: product.imageUrl, units: stats.units, revenue: round(stats.revenue) };
  };
  const active = products.filter((p) => p.status === 'ACTIVE');
  const ranked = active.map(describe).sort((a, b) => b.units - a.units || b.revenue - a.revenue);

  return {
    goal: business?.monthlySalesGoal == null ? null : Number(business.monthlySalesGoal),
    month: {
      total: round(month.total),
      count: month.count,
      avgTicket: month.count ? round(month.total / month.count) : 0,
      profit: round(month.profit),
      profitComplete: month.profitComplete,
    },
    lastMonth: { total: round(lastMonth.total), count: lastMonth.count },
    topProducts: ranked.filter((p) => p.units > 0).slice(0, 3),
    // El producto activo que menos se vendió este mes (solo tiene sentido con 2 o más productos).
    slowProduct: ranked.length >= 2 ? ranked[ranked.length - 1] : null,
    weekday: weekday.map(round),
    sellers: [...sellers.values()].map((s) => ({ ...s, total: round(s.total) })).sort((a, b) => b.total - a.total),
    counts: {
      products: active.length,
      salesAllTime: allTimeSales,
      productsWithoutCost: active.filter((p) => p.cost == null).length,
    },
  };
}
