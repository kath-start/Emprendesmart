import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { groqChatCompletion } from '../ai/groq.client.js';
import { getBusinessAccessOrThrow } from '../app-businesses/app-business.service.js';
import { chatTools, executeTool } from './app-ai.tools.js';

const SYSTEM_PROMPT = `Eres el asistente de IA de EmprendeSmart para emprendedores. Ayudas al dueño de un negocio a entender sus ventas, inventario y productos, y le das consejos prácticos y accionables. Respondes SIEMPRE en español, de forma breve, clara y cercana (tutéalo).

Tienes herramientas para consultar los datos reales de ESTE negocio (productos, stock, ventas). Úsalas siempre que necesites cifras; nunca inventes números, nombres de productos ni fechas. Si una consulta no encuentra resultados, dilo con naturalidad.

Solo puedes CONSULTAR información, no puedes crear, editar ni eliminar nada. Si te piden registrar una venta, un producto o un movimiento de inventario, explica que deben hacerlo desde la pantalla correspondiente de la app.

Responde en texto plano: no uses markdown (nada de **negritas**, títulos con #, ni tablas). Usa listas simples con guiones si hace falta.`;

const IDEA_STAGE_PROMPT = `
IMPORTANTE: este negocio todavía está en etapa de IDEA (aún no vende). No te enfoques en ventas ni inventario: ayúdalo a validar y lanzar su idea. Por ejemplo: definir a su cliente ideal y el problema que resuelve, pensar en qué lo diferencia, calcular precios y cuánto necesita para empezar, elegir por dónde vender (WhatsApp, redes, ferias, tienda), sugerir nombres y armar un plan concreto para su primer mes. Haz preguntas cuando te falte información y propone pasos pequeños y baratos para probar la idea antes de invertir mucho.`;

/** Enfoque del asistente para las etapas en las que el negocio ya vende. */
const STAGE_PROMPTS = {
  EARLY: `
Este negocio recién empezó a vender (etapa INICIO). Prioriza consejos para conseguir las primeras ventas constantes: ordenar sus productos y precios, registrar costos, conseguir clientes que vuelvan y no quedarse sin stock.`,
  GROWTH: `
Este negocio vende seguido y quiere crecer (etapa CRECIMIENTO). Enfócate en vender más: promociones, productos estrella, qué productos agregar, cómo atraer nuevos clientes y cómo alcanzar su meta de ventas del mes.`,
  ESTABLISHED: `
Este negocio está consolidado (etapa CONSOLIDADO). Enfócate en optimizar: márgenes de ganancia, productos que casi no se venden (stock inmovilizado), qué productos conviene dejar, ticket promedio y organización del equipo.`,
};

/** Resume el plan de idea guardado para que la IA lo tenga en cuenta. */
function describeIdeaPlan(business) {
  const plan = business.ideaPlan ?? {};
  const lines = [`Negocio: ${business.name} (rubro: ${business.category}).`];
  if (business.description) lines.push(`Descripción: ${business.description}`);
  if (plan.customer?.who) lines.push(`Cliente ideal: ${plan.customer.who}`);
  if (plan.customer?.problem) lines.push(`Problema que resuelve: ${plan.customer.problem}`);
  if (plan.pricing?.unitCost != null) {
    lines.push(`Costo por unidad: S/ ${plan.pricing.unitCost}, margen deseado: ${plan.pricing.marginPercent ?? '?'}%`);
  }
  if (plan.investment?.initial != null) {
    lines.push(`Inversión inicial: S/ ${plan.investment.initial}, gastos fijos al mes: S/ ${plan.investment.monthlyFixed ?? 0}`);
  }
  if (plan.channels?.selected?.length) lines.push(`Canales de venta elegidos: ${plan.channels.selected.join(', ')}`);
  return `\nLo que el emprendedor ya definió en su plan:\n${lines.join('\n')}`;
}

const MAX_TOOL_ITERATIONS = 5;

/** Consultas diarias al asistente por plan; los planes que no aparecen no tienen límite. */
const DAILY_AI_LIMITS = { FREE: 5, EMPRENDE: 20 };
const AI_CHAT_FEATURE = 'AI_CHAT';
// Perú no cambia de horario: el día empieza a las 00:00 de UTC-5.
const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function peruDayStart(now = new Date()) {
  const peruNow = new Date(now.getTime() - PERU_OFFSET_MS);
  return new Date(Date.UTC(peruNow.getUTCFullYear(), peruNow.getUTCMonth(), peruNow.getUTCDate()) + PERU_OFFSET_MS);
}

/**
 * Cuántas consultas al asistente le quedan hoy a la persona en este negocio. El límite
 * depende del plan del dueño del negocio (el equipo de un negocio Pro no tiene límite).
 */
export async function getUsage(businessId, entrepreneurId) {
  const { ownerPlan } = await getBusinessAccessOrThrow(businessId, entrepreneurId, 'insights');

  const limit = DAILY_AI_LIMITS[ownerPlan] ?? null;
  const dayStart = peruDayStart();
  const used = await prisma.usageEvent.count({
    where: {
      entrepreneurId,
      type: 'FEATURE_USE',
      occurredAt: { gte: dayStart },
      metadata: { path: ['feature'], equals: AI_CHAT_FEATURE },
    },
  });
  return {
    plan: ownerPlan,
    limit,
    used,
    remaining: limit == null ? null : Math.max(0, limit - used),
    resetsAt: new Date(dayStart.getTime() + DAY_MS).toISOString(),
  };
}

export async function chat(businessId, entrepreneurId, userMessage, history = []) {
  const usage = await getUsage(businessId, entrepreneurId);
  if (usage.remaining === 0) {
    throw new ApiError(429, `Usaste tus ${usage.limit} consultas de hoy. Mejora tu plan para seguir usando el asistente de IA.`, [
      { path: 'aiLimit', message: 'AI_DAILY_LIMIT_REACHED' },
    ]);
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const systemPrompt =
    business?.stage === 'IDEA'
      ? SYSTEM_PROMPT + IDEA_STAGE_PROMPT + describeIdeaPlan(business)
      : SYSTEM_PROMPT + (STAGE_PROMPTS[business?.stage] ?? '');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i += 1) {
    const message = await groqChatCompletion({ messages, tools: chatTools, maxTokens: 700 });

    if (!message.tool_calls || message.tool_calls.length === 0) {
      // Solo cuenta la consulta cuando la IA sí respondió.
      await prisma.usageEvent.create({
        data: { entrepreneurId, type: 'FEATURE_USE', metadata: { feature: AI_CHAT_FEATURE, businessId } },
      });
      return { reply: message.content ?? '', usage: await getUsage(businessId, entrepreneurId) };
    }

    messages.push(message);

    for (const call of message.tool_calls) {
      let args = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }
      const result = await executeTool(businessId, call.function.name, args);
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  throw ApiError.badGateway('La IA no pudo completar la respuesta. Intenta reformular tu pregunta.');
}
