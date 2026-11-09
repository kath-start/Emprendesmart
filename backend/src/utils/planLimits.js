import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { ApiError } from './apiError.js';

/**
 * Qué incluye cada plan. El plan Gratis es muy limitado a propósito: deja conocer la app
 * y anima a probar Pro 15 días o a pagar un plan. `null` = sin límite.
 */
export const PLAN_LIMITS = {
  FREE: {
    maxProducts: 10,
    maxBusinesses: 1,
    maxSalesPerMonth: 30,
    aiDaily: 3,
    voiceSales: false,
    yapeReader: false,
    aiRecommendations: false,
    team: false,
  },
  EMPRENDE: {
    maxProducts: null,
    maxBusinesses: 2,
    maxSalesPerMonth: null,
    aiDaily: 20,
    voiceSales: true,
    yapeReader: true,
    aiRecommendations: true,
    team: false,
  },
  CRECIMIENTO: {
    maxProducts: null,
    maxBusinesses: null,
    maxSalesPerMonth: null,
    aiDaily: null,
    voiceSales: true,
    yapeReader: true,
    aiRecommendations: true,
    team: false,
  },
  PRO: {
    maxProducts: null,
    maxBusinesses: null,
    maxSalesPerMonth: null,
    aiDaily: null,
    voiceSales: true,
    yapeReader: true,
    aiRecommendations: true,
    team: true,
  },
};

export const limitsFor = (plan) => PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;

/** Código que la app reconoce para ofrecer la prueba de Pro o mejorar el plan. */
export const PLAN_LIMIT_CODE = 'PLAN_LIMIT_REACHED';

export function planLimitError(message) {
  return new ApiError(403, `${message} Prueba Pro gratis 15 días o mejora tu plan.`, [
    { path: 'plan', message: PLAN_LIMIT_CODE },
  ]);
}

// Perú no cambia de horario: el mes empieza a las 00:00 de UTC-5.
const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;

export function peruMonthStart(now = new Date()) {
  const peruNow = new Date(now.getTime() - PERU_OFFSET_MS);
  return new Date(Date.UTC(peruNow.getUTCFullYear(), peruNow.getUTCMonth(), 1) + PERU_OFFSET_MS);
}

export async function assertCanAddProduct(businessId, ownerPlan) {
  const { maxProducts } = limitsFor(ownerPlan);
  if (maxProducts == null) return;
  const count = await prisma.product.count({ where: { businessId } });
  if (count >= maxProducts) throw planLimitError(`El plan Gratis permite hasta ${maxProducts} productos.`);
}

export async function assertCanAddBusiness(entrepreneurId, plan) {
  const { maxBusinesses } = limitsFor(plan);
  if (maxBusinesses == null) return;
  const count = await prisma.business.count({ where: { entrepreneurId } });
  if (count >= maxBusinesses) {
    throw planLimitError(
      maxBusinesses === 1
        ? 'El plan Gratis permite un solo negocio.'
        : `Tu plan permite hasta ${maxBusinesses} negocios.`,
    );
  }
}

export async function assertCanAddSale(businessId, ownerPlan) {
  const { maxSalesPerMonth } = limitsFor(ownerPlan);
  if (maxSalesPerMonth == null) return;
  const count = await prisma.sale.count({ where: { businessId, soldAt: { gte: peruMonthStart() } } });
  if (count >= maxSalesPerMonth) {
    throw planLimitError(`Llegaste a las ${maxSalesPerMonth} ventas de este mes del plan Gratis.`);
  }
}

export function assertFeature(ownerPlan, feature, label) {
  if (!limitsFor(ownerPlan)[feature]) throw planLimitError(`${label} no está incluido en el plan Gratis.`);
}

// ─────────────────────────── prueba gratis de Pro ───────────────────────────

export const TRIAL_PLAN = 'PRO';
export const TRIAL_DAYS = 15;
/** La prueba se guarda como un pago de S/ 0 confirmado con este nombre (sin cambiar el esquema). */
export const TRIAL_MARKER = 'Prueba gratis 15 días';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Estado del plan para la app: límites, si puede probar Pro y si está en la prueba. */
export async function planStatus(entrepreneur) {
  const trial = await prisma.planPayment.findFirst({
    where: { entrepreneurId: entrepreneur.id, payerName: TRIAL_MARKER, status: 'CONFIRMED' },
    orderBy: { createdAt: 'desc' },
  });
  return {
    plan: entrepreneur.plan,
    planExpiresAt: entrepreneur.planExpiresAt,
    limits: limitsFor(entrepreneur.plan),
    trialDays: TRIAL_DAYS,
    trialAvailable: !trial,
    onTrial: isTrialPeriod(entrepreneur, trial),
    demoEnabled: env.demoPlans,
  };
}

/** El periodo actual del plan es la prueba (y no un pago real hecho después). */
function isTrialPeriod(entrepreneur, trial) {
  if (!trial?.confirmedAt || entrepreneur.plan === 'FREE' || !entrepreneur.planExpiresAt) return false;
  const trialEnd = trial.confirmedAt.getTime() + TRIAL_DAYS * DAY_MS;
  return Math.abs(entrepreneur.planExpiresAt.getTime() - trialEnd) < DAY_MS;
}

export async function startTrial(entrepreneurId) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const entrepreneur = await tx.entrepreneur.findUnique({ where: { id: entrepreneurId } });
    if (!entrepreneur) throw ApiError.notFound('Cuenta no encontrada');
    const used = await tx.planPayment.count({ where: { entrepreneurId, payerName: TRIAL_MARKER } });
    if (used > 0) throw ApiError.conflict('Ya usaste tu prueba gratis de 15 días');
    if (entrepreneur.plan !== 'FREE' && entrepreneur.planExpiresAt && entrepreneur.planExpiresAt > now) {
      throw ApiError.conflict('Ya tienes un plan activo');
    }
    await tx.planPayment.create({
      data: {
        entrepreneurId,
        plan: TRIAL_PLAN,
        amount: 0,
        payerName: TRIAL_MARKER,
        status: 'CONFIRMED',
        confirmedAt: now,
      },
    });
    return tx.entrepreneur.update({
      where: { id: entrepreneurId },
      data: { plan: TRIAL_PLAN, planExpiresAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS) },
    });
  });
}

/** Modo concurso: activa cualquier plan al instante por 30 días, sin pago. */
export function activateDemoPlan(entrepreneurId, plan) {
  if (!env.demoPlans) throw ApiError.forbidden('El modo de prueba de planes está desactivado');
  return prisma.entrepreneur.update({
    where: { id: entrepreneurId },
    data: { plan, planExpiresAt: plan === 'FREE' ? null : new Date(Date.now() + 30 * DAY_MS) },
  });
}

/** Volver al plan Gratis cuando el emprendedor lo elige (efecto inmediato). */
export function switchToFree(entrepreneurId) {
  return prisma.entrepreneur.update({ where: { id: entrepreneurId }, data: { plan: 'FREE', planExpiresAt: null } });
}

/** Las pruebas terminan justo a los 15 días (sin los días de gracia de un plan pagado). */
export async function expireEndedTrials(now = new Date()) {
  const candidates = await prisma.entrepreneur.findMany({
    where: {
      plan: { not: 'FREE' },
      planExpiresAt: { lt: now },
      planPayments: { some: { payerName: TRIAL_MARKER, status: 'CONFIRMED' } },
    },
    include: { planPayments: { where: { payerName: TRIAL_MARKER, status: 'CONFIRMED' }, take: 1 } },
  });
  const ids = candidates.filter((e) => isTrialPeriod(e, e.planPayments[0])).map((e) => e.id);
  if (ids.length === 0) return 0;
  const { count } = await prisma.entrepreneur.updateMany({
    where: { id: { in: ids } },
    data: { plan: 'FREE', planExpiresAt: null },
  });
  return count;
}
