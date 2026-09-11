import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { groqChatCompletion } from './groq.client.js';
import { chatTools, executeTool } from './ai.tools.js';

const num = (value) => (value == null ? 0 : Number(value));

const aiResultSchema = z.object({
  summary: z.string().min(1).max(2000),
  recommendations: z
    .array(
      z.object({
        title: z.string().min(3).max(160),
        description: z.string().min(3).max(4000),
        category: z.string().min(1).max(80),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
      }),
    )
    .max(5)
    .optional()
    .default([]),
  alerts: z
    .array(
      z.object({
        type: z.string().min(2).max(80),
        severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
        message: z.string().min(3).max(2000),
      }),
    )
    .max(5)
    .optional()
    .default([]),
});

function monthLabel(date) {
  return new Date(date).toISOString().slice(0, 7);
}

const SYSTEM_PROMPT = `Eres un analista de negocios del panel administrativo de EmprendeSmart. Analizas emprendimientos a partir de sus datos de ventas, inventario (clientes/ventas) y comportamiento reciente. Respondes SIEMPRE en español.

Identifica patrones relevantes (crecimiento, caídas, estancamiento, riesgos financieros, baja actividad, etc.) y genera recomendaciones y alertas SOLO si los datos realmente las justifican (puede haber 0 de alguna). Sé conciso.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni bloques de código markdown, con esta forma exacta:
{
  "summary": "resumen breve (máx. 2 frases) del desempeño del negocio, en español",
  "recommendations": [
    { "title": "string corto", "description": "explicación breve, máx. 200 caracteres", "category": "Finanzas|Marketing|Operaciones|Ventas", "priority": "LOW|MEDIUM|HIGH" }
  ],
  "alerts": [
    { "type": "string corto en mayúsculas, ej. CAIDA_INGRESOS", "severity": "INFO|WARNING|CRITICAL", "message": "explicación breve, máx. 200 caracteres" }
  ]
}
Máximo 2 recomendaciones y 1 alerta, y solo si son realmente relevantes.`;

function buildUserPrompt(business) {
  const metricsLines = business.metrics.length
    ? business.metrics
        .map(
          (m) =>
            `- ${monthLabel(m.period)}: ingresos=${num(m.revenue)}, gastos=${num(m.expenses)}, utilidad=${num(m.profit)}, clientes=${m.customersCount}, ventas=${m.salesCount}`,
        )
        .join('\n')
    : '- Sin métricas registradas todavía.';

  return `Negocio: "${business.name}"
Categoría: ${business.category}
Etapa: ${business.stage}
Empleados: ${business.employeesCount}
Emprendedor: ${business.entrepreneur.firstName} ${business.entrepreneur.lastName} (plan ${business.entrepreneur.plan})
Eventos de actividad del emprendedor en los últimos 30 días: ${business.recentUsageEvents}

Métricas mensuales recientes (más reciente al final):
${metricsLines}`;
}

async function callGroq(userPrompt) {
  const message = await groqChatCompletion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    responseFormat: { type: 'json_object' },
    maxTokens: 600,
  });

  let parsed;
  try {
    parsed = JSON.parse(message.content);
  } catch {
    throw ApiError.badGateway('La IA devolvió una respuesta que no es JSON válido. Intenta nuevamente.');
  }

  const result = aiResultSchema.safeParse(parsed);
  if (!result.success) {
    throw ApiError.badGateway('La respuesta de la IA no tiene el formato esperado. Intenta nuevamente.');
  }

  return result.data;
}

export async function analyzeBusiness(businessId) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      entrepreneur: { select: { id: true, firstName: true, lastName: true, plan: true } },
      metrics: { orderBy: { period: 'asc' }, take: 6 },
    },
  });
  if (!business) throw ApiError.notFound('Negocio no encontrado');

  const recentUsageEvents = await prisma.usageEvent.count({
    where: {
      entrepreneurId: business.entrepreneurId,
      occurredAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  const userPrompt = buildUserPrompt({ ...business, recentUsageEvents });
  const aiResult = await callGroq(userPrompt);

  const recommendations = await Promise.all(
    aiResult.recommendations.map((rec) =>
      prisma.recommendation.create({
        data: {
          businessId,
          title: rec.title,
          description: rec.description,
          category: rec.category,
          priority: rec.priority ?? 'MEDIUM',
          source: 'AI',
        },
      }),
    ),
  );

  const alerts = await Promise.all(
    aiResult.alerts.map((alert) =>
      prisma.alert.create({
        data: {
          businessId,
          type: alert.type,
          severity: alert.severity ?? 'WARNING',
          message: alert.message,
        },
      }),
    ),
  );

  return { summary: aiResult.summary, recommendations, alerts };
}

const CHAT_SYSTEM_PROMPT = `Eres el asistente de IA del panel administrativo de EmprendeSmart. Ayudas al equipo a entender el desempeño de los emprendedores y negocios de la plataforma. Respondes SIEMPRE en español, de forma breve y clara.

Tienes herramientas para consultar datos reales de la plataforma (emprendedores, negocios, métricas, alertas, recomendaciones). Úsalas cuando necesites datos que no tengas en la conversación; nunca inventes cifras ni nombres. Si una búsqueda no encuentra resultados, dilo claramente.

Solo puedes CONSULTAR información, no puedes crear, editar ni eliminar nada. Si te piden una acción de escritura, explica que deben hacerla desde la sección correspondiente del panel.

Responde en texto plano: no uses markdown (nada de **negritas**, títulos con #, ni tablas). Usa listas simples con guiones si hace falta.`;

const MAX_TOOL_ITERATIONS = 5;

export async function chat(userMessage, history = []) {
  const messages = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i += 1) {
    const message = await groqChatCompletion({ messages, tools: chatTools, maxTokens: 700 });

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { reply: message.content ?? '' };
    }

    messages.push(message);

    for (const call of message.tool_calls) {
      let args = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }
      const result = await executeTool(call.function.name, args);
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  throw ApiError.badGateway('La IA no pudo completar la respuesta. Intenta reformular tu pregunta.');
}
