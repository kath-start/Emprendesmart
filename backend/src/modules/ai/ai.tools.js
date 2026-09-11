import * as entrepreneurService from '../entrepreneurs/entrepreneur.service.js';
import * as businessService from '../businesses/business.service.js';
import * as alertService from '../alerts/alert.service.js';
import * as recommendationService from '../recommendations/recommendation.service.js';
import * as metricService from '../metrics/metric.service.js';
import { ApiError } from '../../utils/apiError.js';

const num = (value) => (value == null ? 0 : Number(value));
const pg = (limit) => ({ page: 1, limit, skip: 0 });

/** Definiciones de herramientas (function calling, formato compatible con OpenAI/Groq). */
export const chatTools = [
  {
    type: 'function',
    function: {
      name: 'get_overview',
      description: 'Obtiene el resumen general de la plataforma: totales de emprendedores, negocios, alertas, recomendaciones y finanzas agregadas.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_entrepreneurs',
      description: 'Busca emprendedores por nombre/email, estado o plan. Úsalo cuando el usuario mencione un emprendedor por nombre.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Texto a buscar en nombre o email' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
          plan: { type: 'string', enum: ['FREE', 'PRO', 'BUSINESS'] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_businesses',
      description: 'Busca negocios por nombre, categoría, etapa o estado. Úsalo cuando el usuario mencione un negocio por nombre o pida una lista de negocios.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Texto a buscar en el nombre del negocio' },
          category: { type: 'string' },
          stage: { type: 'string', enum: ['IDEA', 'EARLY', 'GROWTH', 'ESTABLISHED'] },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'CLOSED'] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_business_detail',
      description: 'Obtiene el detalle completo de un negocio (métricas recientes, alertas y recomendaciones) a partir de su id. Primero usa search_businesses para encontrar el id si no lo tienes.',
      parameters: {
        type: 'object',
        properties: { businessId: { type: 'string', description: 'UUID del negocio' } },
        required: ['businessId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_alerts',
      description: 'Lista las alertas del sistema, opcionalmente filtradas por estado o severidad.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'] },
          severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_recommendations',
      description: 'Lista las recomendaciones del sistema, opcionalmente filtradas por estado o prioridad.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['PENDING', 'SENT', 'ACCEPTED', 'DISMISSED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
        },
        additionalProperties: false,
      },
    },
  },
];

async function getOverview() {
  return metricService.overview();
}

async function searchEntrepreneurs(args) {
  const { items } = await entrepreneurService.list(args, pg(8));
  return items.map((e) => ({
    id: e.id,
    nombre: `${e.firstName} ${e.lastName}`,
    email: e.email,
    plan: e.plan,
    estado: e.status,
    negocios: e._count?.businesses ?? 0,
  }));
}

async function searchBusinesses(args) {
  const { items } = await businessService.list(args, pg(8));
  return items.map((b) => ({
    id: b.id,
    nombre: b.name,
    categoria: b.category,
    etapa: b.stage,
    estado: b.status,
    emprendedor: b.entrepreneur ? `${b.entrepreneur.firstName} ${b.entrepreneur.lastName}` : null,
    alertas: b._count?.alerts ?? 0,
    recomendaciones: b._count?.recommendations ?? 0,
  }));
}

async function getBusinessDetail({ businessId }) {
  try {
    const b = await businessService.getById(businessId);
    return {
      id: b.id,
      nombre: b.name,
      categoria: b.category,
      etapa: b.stage,
      estado: b.status,
      empleados: b.employeesCount,
      emprendedor: b.entrepreneur ? `${b.entrepreneur.firstName} ${b.entrepreneur.lastName} (${b.entrepreneur.email})` : null,
      metricas_recientes: (b.metrics ?? []).map((m) => ({
        mes: new Date(m.period).toISOString().slice(0, 7),
        ingresos: num(m.revenue),
        gastos: num(m.expenses),
        utilidad: num(m.profit),
        clientes: m.customersCount,
      })),
      alertas_abiertas: (b.alerts ?? []).filter((a) => a.status !== 'RESOLVED').map((a) => ({ tipo: a.type, severidad: a.severity, mensaje: a.message })),
      recomendaciones_pendientes: (b.recommendations ?? [])
        .filter((r) => r.status === 'PENDING')
        .map((r) => ({ titulo: r.title, prioridad: r.priority })),
    };
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return { error: 'No existe un negocio con ese id.' };
    }
    throw error;
  }
}

async function listAlerts(args) {
  const { items } = await alertService.list(args, pg(8));
  return items.map((a) => ({
    id: a.id,
    tipo: a.type,
    severidad: a.severity,
    estado: a.status,
    mensaje: a.message,
    negocio: a.business?.name ?? null,
  }));
}

async function listRecommendations(args) {
  const { items } = await recommendationService.list(args, pg(8));
  return items.map((r) => ({
    id: r.id,
    titulo: r.title,
    categoria: r.category,
    prioridad: r.priority,
    estado: r.status,
    origen: r.source,
    negocio: r.business?.name ?? null,
  }));
}

export async function executeTool(name, args) {
  switch (name) {
    case 'get_overview':
      return getOverview();
    case 'search_entrepreneurs':
      return searchEntrepreneurs(args ?? {});
    case 'search_businesses':
      return searchBusinesses(args ?? {});
    case 'get_business_detail':
      return getBusinessDetail(args ?? {});
    case 'list_alerts':
      return listAlerts(args ?? {});
    case 'list_recommendations':
      return listRecommendations(args ?? {});
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}
