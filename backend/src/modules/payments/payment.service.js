import crypto from 'node:crypto';

import pkg from '@prisma/client';

import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { ApiError } from '../../utils/apiError.js';
import { paginationMeta } from '../../utils/http.js';
import { uploadPublicImage } from '../../utils/storage.js';

const { Prisma } = pkg;

/** Precio mensual de cada plan de pago, en soles. */
export const PLAN_PRICES = { EMPRENDE: 19.9, CRECIMIENTO: 39.9, PRO: 69.9 };

/** Cada pago cubre 30 días del plan. */
const PLAN_PERIOD_DAYS = 30;
/** Días de gracia después del vencimiento antes de volver al plan Gratis. */
export const PLAN_GRACE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Nuevo vencimiento al confirmar un pago: si renueva el mismo plan antes de que venza,
 * los 30 días se suman a lo que le quedaba; si no, cuentan desde hoy.
 */
function nextExpiry(entrepreneur, plan, now = new Date()) {
  const current = entrepreneur.planExpiresAt;
  const base = entrepreneur.plan === plan && current && current > now ? current : now;
  return new Date(base.getTime() + PLAN_PERIOD_DAYS * DAY_MS);
}

/** Baja a Gratis a quienes no renovaron dentro de los días de gracia. Devuelve cuántos cambió. */
export async function expireOverduePlans(now = new Date()) {
  const limit = new Date(now.getTime() - PLAN_GRACE_DAYS * DAY_MS);
  const { count } = await prisma.entrepreneur.updateMany({
    where: { plan: { not: 'FREE' }, planExpiresAt: { lt: limit } },
    data: { plan: 'FREE', planExpiresAt: null },
  });
  if (count > 0) logger.info(`Planes vencidos pasados a Gratis: ${count}`);
  return count;
}

/** Un aviso de Yape y una solicitud de pago solo se emparejan si ocurrieron con menos de 2 h de diferencia. */
const MATCH_WINDOW_MS = 2 * 60 * 60 * 1000;
const SETTINGS_ID = 'default';
// Sin caracteres que se confunden al escribirlos a mano (0/O, 1/I/L).
const DEVICE_KEY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function newDeviceKey() {
  const bytes = crypto.randomBytes(10);
  return Array.from(bytes, (byte) => DEVICE_KEY_ALPHABET[byte % DEVICE_KEY_ALPHABET.length]).join('');
}

const toAmount = (value) => (value == null ? null : Number(value));

function serializePayment(payment) {
  return {
    ...payment,
    amount: toAmount(payment.amount),
    notification: payment.notification ? serializeNotification(payment.notification) : payment.notification,
  };
}

function serializeNotification(notification) {
  return {
    ...notification,
    amount: toAmount(notification.amount),
    planPayment: notification.planPayment ? { ...notification.planPayment, amount: toAmount(notification.planPayment.amount) } : notification.planPayment,
  };
}

// ─── Configuración de cobro ────────────────────────────────────────────────

export async function getSettings() {
  const existing = await prisma.paymentSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  return prisma.paymentSettings.create({ data: { id: SETTINGS_ID, deviceKey: newDeviceKey() } });
}

export async function updateSettings(data) {
  await getSettings();
  return prisma.paymentSettings.update({ where: { id: SETTINGS_ID }, data });
}

export async function uploadQr(image) {
  const yapeQrUrl = await uploadPublicImage('payment-qr', image);
  return updateSettings({ yapeQrUrl });
}

export async function regenerateDeviceKey() {
  return updateSettings({ deviceKey: newDeviceKey() });
}

/** Lo que ve el emprendedor en la app: sin el código del dispositivo. */
export async function getPublicSettings() {
  const { yapeQrUrl, yapeHolderName, yapePhone } = await getSettings();
  return { yapeQrUrl, yapeHolderName, yapePhone, prices: PLAN_PRICES };
}

export async function isValidDeviceKey(key) {
  if (!key) return false;
  const { deviceKey } = await getSettings();
  const expected = Buffer.from(deviceKey);
  const received = Buffer.from(String(key).trim().toUpperCase());
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

// ─── Emparejamiento aviso de Yape ↔ solicitud de pago ──────────────────────

function nameTokens(text) {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Yape abrevia los nombres ("Juan P. Perez"), así que se compara palabra por palabra:
 * el primer nombre debe coincidir y cada palabra siguiente del aviso debe ser el inicio
 * de la palabra correspondiente de lo que escribió el emprendedor.
 */
export function namesMatch(senderName, payerName) {
  const sender = nameTokens(senderName);
  const payer = nameTokens(payerName);
  if (sender.length === 0 || payer.length === 0 || sender[0] !== payer[0]) return false;
  const compared = Math.min(sender.length, payer.length);
  for (let i = 1; i < compared; i += 1) {
    if (!payer[i].startsWith(sender[i]) && !sender[i].startsWith(payer[i])) return false;
  }
  return true;
}

/** Extrae emisor y monto de "Yape! Juan P. Perez te envió un pago por S/ 19.90". */
export function parseYapeMessage(message) {
  const match = /(?:yape!?\s*)?(.+?)\s+te\s+envi[oó]\s+un\s+pago\s+por\s+s\/\.?\s*([\d.,]+)/i.exec(message ?? '');
  if (!match) return {};
  const senderName = match[1].replace(/^.*?:\s*/, '').trim();
  const amount = Number(match[2].replace(',', '.').replace(/\.$/, ''));
  return { senderName: senderName || undefined, amount: Number.isFinite(amount) ? amount : undefined };
}

const sameAmount = (a, b) => a != null && b != null && Math.round(Number(a) * 100) === Math.round(Number(b) * 100);

/** Confirma el pago y sube el plan del emprendedor; devuelve false si otro proceso ya lo tomó. */
async function confirmPayment(payment, { notificationId = null, adminId = null } = {}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const { count } = await tx.planPayment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'CONFIRMED', notificationId, confirmedById: adminId, confirmedAt: new Date() },
      });
      if (count === 0) return false;
      const entrepreneur = await tx.entrepreneur.findUnique({ where: { id: payment.entrepreneurId } });
      await tx.entrepreneur.update({
        where: { id: payment.entrepreneurId },
        data: { plan: payment.plan, planExpiresAt: nextExpiry(entrepreneur, payment.plan) },
      });
      return true;
    });
  } catch (error) {
    // El aviso ya quedó enlazado a otro pago (índice único de notificationId).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
    throw error;
  }
}

/** Solo se confirma solo cuando hay exactamente un candidato; si hay dudas, lo decide un administrador. */
async function matchNotification(notification) {
  if (notification.amount == null || !notification.senderName) return null;
  const notifiedAt = notification.notifiedAt.getTime();
  const pending = await prisma.planPayment.findMany({
    where: {
      status: 'PENDING',
      amount: notification.amount,
      createdAt: { gte: new Date(notifiedAt - MATCH_WINDOW_MS), lte: new Date(notifiedAt + MATCH_WINDOW_MS) },
    },
  });
  const candidates = pending.filter((payment) => namesMatch(notification.senderName, payment.payerName));
  if (candidates.length !== 1) return null;
  return (await confirmPayment(candidates[0], { notificationId: notification.id })) ? candidates[0].id : null;
}

async function matchPayment(payment) {
  const createdAt = payment.createdAt.getTime();
  const notifications = await prisma.yapeNotification.findMany({
    where: {
      amount: payment.amount,
      planPayment: null,
      notifiedAt: { gte: new Date(createdAt - MATCH_WINDOW_MS), lte: new Date(createdAt + MATCH_WINDOW_MS) },
    },
  });
  const candidates = notifications.filter((notification) => namesMatch(notification.senderName, payment.payerName));
  if (candidates.length !== 1) return false;
  return confirmPayment(payment, { notificationId: candidates[0].id });
}

// ─── Avisos enviados por el celular del negocio ────────────────────────────

export async function receiveNotification({ paymentMethod, message, notifiedAt, amount, senderName, packageName }) {
  const parsed = parseYapeMessage(message);
  const data = {
    paymentMethod,
    message,
    notifiedAt,
    packageName,
    amount: parsed.amount ?? amount ?? null,
    senderName: parsed.senderName ?? senderName ?? null,
  };

  let notification;
  try {
    notification = await prisma.yapeNotification.create({ data });
  } catch (error) {
    // La app reintenta los envíos: un aviso repetido no es un error.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.yapeNotification.findUnique({
        where: { message_notifiedAt: { message, notifiedAt } },
        include: { planPayment: true },
      });
      return { notification: serializeNotification(existing), duplicate: true };
    }
    throw error;
  }

  const matchedPaymentId = await matchNotification(notification);
  if (matchedPaymentId) logger.info(`Pago ${matchedPaymentId} confirmado con el aviso de Yape ${notification.id}`);
  return { notification: serializeNotification(notification), matchedPaymentId };
}

// ─── Solicitudes de pago (app del emprendedor) ─────────────────────────────

export async function createPlanPayment(entrepreneurId, { plan, payerName }) {
  const entrepreneur = await prisma.entrepreneur.findUnique({ where: { id: entrepreneurId } });
  if (!entrepreneur) throw ApiError.notFound('Emprendedor no encontrado');
  // Un plan con vencimiento se puede renovar; uno sin vencimiento (asignado a mano) no hace falta pagarlo.
  if (entrepreneur.plan === plan && !entrepreneur.planExpiresAt) throw ApiError.conflict('Ya tienes este plan');

  // Una sola solicitud abierta por emprendedor: la nueva reemplaza a la anterior.
  await prisma.planPayment.updateMany({
    where: { entrepreneurId, status: 'PENDING' },
    data: { status: 'REJECTED', rejectedReason: 'Reemplazada por una nueva solicitud' },
  });

  const payment = await prisma.planPayment.create({
    data: { entrepreneurId, plan, payerName: payerName.trim(), amount: PLAN_PRICES[plan] },
  });
  const confirmed = await matchPayment(payment);
  const result = confirmed ? await prisma.planPayment.findUnique({ where: { id: payment.id } }) : payment;
  return serializePayment(result);
}

export async function listMyPayments(entrepreneurId) {
  const payments = await prisma.planPayment.findMany({
    where: { entrepreneurId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return payments.map(serializePayment);
}

// ─── Panel de administración ───────────────────────────────────────────────

export async function listPayments(query, { page, limit, skip }) {
  const where = {};
  if (query.status) where.status = query.status;
  const [items, total] = await Promise.all([
    prisma.planPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        entrepreneur: { select: { id: true, firstName: true, lastName: true, email: true, plan: true } },
        notification: true,
      },
    }),
    prisma.planPayment.count({ where }),
  ]);
  return { items: items.map(serializePayment), meta: paginationMeta(total, page, limit) };
}

export async function listNotifications(query, { page, limit, skip }) {
  const where = {};
  if (query.matched === 'true') where.planPayment = { isNot: null };
  if (query.matched === 'false') where.planPayment = null;
  const [items, total] = await Promise.all([
    prisma.yapeNotification.findMany({
      where,
      orderBy: { notifiedAt: 'desc' },
      skip,
      take: limit,
      include: { planPayment: { select: { id: true, payerName: true, plan: true, amount: true, status: true } } },
    }),
    prisma.yapeNotification.count({ where }),
  ]);
  return { items: items.map(serializeNotification), meta: paginationMeta(total, page, limit) };
}

export async function confirmManually(id, adminId, { notificationId } = {}) {
  const payment = await prisma.planPayment.findUnique({ where: { id } });
  if (!payment) throw ApiError.notFound('Pago no encontrado');
  if (payment.status !== 'PENDING') throw ApiError.conflict('Este pago ya fue revisado');

  if (notificationId) {
    const notification = await prisma.yapeNotification.findUnique({
      where: { id: notificationId },
      include: { planPayment: true },
    });
    if (!notification) throw ApiError.notFound('Aviso de Yape no encontrado');
    if (notification.planPayment) throw ApiError.conflict('Ese aviso de Yape ya está asociado a otro pago');
    if (!sameAmount(notification.amount, payment.amount)) {
      throw ApiError.badRequest('El monto del aviso no coincide con el del pago');
    }
  }

  const confirmed = await confirmPayment(payment, { notificationId: notificationId ?? null, adminId });
  if (!confirmed) throw ApiError.conflict('Este pago ya fue revisado');
  return serializePayment(await prisma.planPayment.findUnique({ where: { id }, include: { notification: true } }));
}

export async function reject(id, { reason }) {
  const { count } = await prisma.planPayment.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'REJECTED', rejectedReason: reason ?? null },
  });
  if (count === 0) {
    const exists = await prisma.planPayment.findUnique({ where: { id } });
    throw exists ? ApiError.conflict('Este pago ya fue revisado') : ApiError.notFound('Pago no encontrado');
  }
  return serializePayment(await prisma.planPayment.findUnique({ where: { id } }));
}
