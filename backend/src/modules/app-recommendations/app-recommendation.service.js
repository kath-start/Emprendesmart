import { z } from 'zod';

import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { paginationMeta } from '../../utils/http.js';
import { getBusinessAccessOrThrow } from '../app-businesses/app-business.service.js';
import { groqChatCompletion } from '../ai/groq.client.js';

export async function list(businessId, entrepreneurId, query, pagination) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'insights');

  const where = { businessId };
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;

  const [items, total] = await Promise.all([
    prisma.recommendation.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: [{ priority: 'desc' }, { generatedAt: 'desc' }],
    }),
    prisma.recommendation.count({ where }),
  ]);

  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const num = (value) => (value == null ? 0 : Number(value));

const generatedSchema = z.object({
  recommendations: z
    .array(
      z.object({
        title: z.string().min(3).max(160),
        description: z.string().min(3).max(4000),
        category: z.string().min(1).max(80),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
      }),
    )
    .max(5),
});

const GENERATE_PROMPT = `Eres el asesor de negocios de EmprendeSmart y hablas directamente con el emprendedor dueño de un pequeño negocio. Respondes SIEMPRE en español, con un tono cercano y práctico (tutea).

Recibirás su catálogo (precio, costo, stock, stock mínimo) y lo que vendió en los últimos 30 días. Da entre 2 y 4 recomendaciones concretas y accionables basadas SOLO en esos datos: qué reponer, qué impulsar o promocionar, qué productos no se mueven, márgenes bajos, precios, etc. Menciona los productos por su nombre y usa cifras reales de los datos; nunca inventes datos. Si casi no hay ventas, recomienda cómo empezar a vender más con lo que tiene.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni markdown, con esta forma exacta:
{
  "recommendations": [
    { "title": "string corto, máx. 60 caracteres", "description": "explicación y acción concreta, máx. 250 caracteres", "category": "Inventario|Ventas|Precios|Marketing", "priority": "LOW|MEDIUM|HIGH" }
  ]
}`;

function buildGeneratePrompt(business, products, soldByProduct, salesCount, revenue) {
  const lines = products.length
    ? products
        .map((p) => {
          const sold = soldByProduct.get(p.id) ?? { quantity: 0, revenue: 0 };
          const cost = p.cost == null ? 'sin costo registrado' : `costo S/ ${num(p.cost).toFixed(2)}`;
          return `- ${p.name}: precio S/ ${num(p.price).toFixed(2)}, ${cost}, stock ${p.stock} (mínimo ${p.lowStockThreshold}), vendidos en 30 días: ${sold.quantity} unid. (S/ ${sold.revenue.toFixed(2)})`;
        })
        .join('\n')
    : '- Todavía no tiene productos registrados.';

  return `Negocio: "${business.name}" (categoría: ${business.category})
Ventas en los últimos 30 días: ${salesCount} ventas, ingresos S/ ${revenue.toFixed(2)}

Productos:
${lines}`;
}

/**
 * Pide a la IA recomendaciones a partir del inventario y las ventas reales del negocio.
 * Reemplaza las recomendaciones de IA que seguían pendientes, para que no se acumulen al regenerar.
 */
export async function generate(businessId, entrepreneurId) {
  const { business } = await getBusinessAccessOrThrow(businessId, entrepreneurId, 'insights');

  const since = new Date(Date.now() - 30 * DAY_MS);
  const [products, sales] = await Promise.all([
    prisma.product.findMany({ where: { businessId, status: 'ACTIVE' }, orderBy: { name: 'asc' }, take: 60 }),
    prisma.sale.findMany({ where: { businessId, soldAt: { gte: since } }, include: { items: true } }),
  ]);

  const soldByProduct = new Map();
  let revenue = 0;
  for (const sale of sales) {
    revenue += num(sale.total);
    for (const item of sale.items) {
      const current = soldByProduct.get(item.productId) ?? { quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += num(item.subtotal);
      soldByProduct.set(item.productId, current);
    }
  }

  const message = await groqChatCompletion({
    messages: [
      { role: 'system', content: GENERATE_PROMPT },
      { role: 'user', content: buildGeneratePrompt(business, products, soldByProduct, sales.length, revenue) },
    ],
    responseFormat: { type: 'json_object' },
    maxTokens: 900,
  });

  let parsed;
  try {
    parsed = generatedSchema.parse(JSON.parse(message.content));
  } catch {
    throw ApiError.badGateway('La IA no devolvió recomendaciones válidas. Intenta nuevamente.');
  }

  return prisma.$transaction(async (tx) => {
    await tx.recommendation.deleteMany({ where: { businessId, source: 'AI', status: 'PENDING' } });
    return Promise.all(
      parsed.recommendations.map((rec) =>
        tx.recommendation.create({
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
  });
}
