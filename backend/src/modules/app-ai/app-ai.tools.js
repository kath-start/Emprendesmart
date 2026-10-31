import { prisma } from '../../config/prisma.js';

const num = (value) => (value == null ? 0 : Number(value));

/** Definiciones de herramientas (function calling) para el asistente de IA del emprendedor. Todas de solo lectura y acotadas al negocio actual. */
export const chatTools = [
  {
    type: 'function',
    function: {
      name: 'resumen_negocio',
      description:
        'Obtiene un resumen del negocio: cantidad de productos, productos con stock bajo, e ingresos/ventas de los últimos 30 días.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_productos',
      description: 'Lista los productos del negocio con su precio, stock y categoría. Úsalo para responder preguntas sobre inventario o catálogo.',
      parameters: {
        type: 'object',
        properties: {
          soloStockBajo: {
            type: 'boolean',
            description: 'Si es true, solo incluye productos cuyo stock está en o por debajo de su umbral mínimo',
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detalle_producto',
      description: 'Busca un producto por nombre y devuelve su detalle junto con sus movimientos de inventario más recientes.',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Nombre (o parte del nombre) del producto a buscar' },
        },
        required: ['nombre'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ventas_recientes',
      description: 'Lista las ventas registradas en los últimos N días, con su fecha, total y productos vendidos.',
      parameters: {
        type: 'object',
        properties: {
          dias: { type: 'integer', description: 'Cantidad de días hacia atrás a consultar (por defecto 30)', minimum: 1, maximum: 365 },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'productos_mas_vendidos',
      description: 'Devuelve los productos más vendidos (por cantidad) en los últimos N días.',
      parameters: {
        type: 'object',
        properties: {
          dias: { type: 'integer', description: 'Cantidad de días hacia atrás a consultar (por defecto 30)', minimum: 1, maximum: 365 },
        },
        additionalProperties: false,
      },
    },
  },
];

async function resumenNegocio(businessId) {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalProductos, productos, ventasRecientes] = await Promise.all([
    prisma.product.count({ where: { businessId } }),
    prisma.product.findMany({ where: { businessId }, select: { stock: true, lowStockThreshold: true } }),
    prisma.sale.findMany({ where: { businessId, soldAt: { gte: since30 } }, select: { total: true } }),
  ]);

  const stockBajo = productos.filter((p) => p.stock <= p.lowStockThreshold).length;
  const ingresos30d = ventasRecientes.reduce((sum, s) => sum + num(s.total), 0);

  return {
    total_productos: totalProductos,
    productos_con_stock_bajo: stockBajo,
    ventas_ultimos_30_dias: ventasRecientes.length,
    ingresos_ultimos_30_dias: Number(ingresos30d.toFixed(2)),
  };
}

async function listarProductos(businessId, args) {
  const where = { businessId };
  const productos = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
    take: 50,
  });

  const filtrados = args.soloStockBajo
    ? productos.filter((p) => p.stock <= p.lowStockThreshold)
    : productos;

  return filtrados.map((p) => ({
    id: p.id,
    nombre: p.name,
    categoria: p.category,
    precio: num(p.price),
    stock: p.stock,
    stock_minimo: p.lowStockThreshold,
    estado: p.status,
  }));
}

async function detalleProducto(businessId, { nombre }) {
  const producto = await prisma.product.findFirst({
    where: { businessId, name: { contains: nombre, mode: 'insensitive' } },
  });

  if (!producto) {
    return { error: `No se encontró un producto con nombre similar a "${nombre}" en este negocio.` };
  }

  const movimientos = await prisma.inventoryMovement.findMany({
    where: { productId: producto.id },
    orderBy: { occurredAt: 'desc' },
    take: 10,
  });

  return {
    id: producto.id,
    nombre: producto.name,
    categoria: producto.category,
    precio: num(producto.price),
    costo: num(producto.cost),
    stock: producto.stock,
    stock_minimo: producto.lowStockThreshold,
    estado: producto.status,
    movimientos_recientes: movimientos.map((m) => ({
      tipo: m.type,
      cantidad: m.quantity,
      fecha: m.occurredAt.toISOString().slice(0, 10),
      nota: m.note,
    })),
  };
}

async function ventasRecientes(businessId, args) {
  const dias = args.dias ?? 30;
  const since = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const ventas = await prisma.sale.findMany({
    where: { businessId, soldAt: { gte: since } },
    orderBy: { soldAt: 'desc' },
    take: 30,
    include: { items: { include: { product: { select: { name: true } } } } },
  });

  return ventas.map((v) => ({
    id: v.id,
    fecha: v.soldAt.toISOString().slice(0, 10),
    total: num(v.total),
    productos: v.items.map((i) => `${i.quantity}x ${i.product.name}`),
  }));
}

async function productosMasVendidos(businessId, args) {
  const dias = args.dias ?? 30;
  const since = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const items = await prisma.saleItem.findMany({
    where: { sale: { businessId, soldAt: { gte: since } } },
    include: { product: { select: { name: true } } },
  });

  const porProducto = new Map();
  for (const item of items) {
    const key = item.product.name;
    const actual = porProducto.get(key) ?? { producto: key, unidades: 0, ingresos: 0 };
    actual.unidades += item.quantity;
    actual.ingresos += num(item.subtotal);
    porProducto.set(key, actual);
  }

  return [...porProducto.values()]
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 10)
    .map((p) => ({ ...p, ingresos: Number(p.ingresos.toFixed(2)) }));
}

export async function executeTool(businessId, name, args) {
  switch (name) {
    case 'resumen_negocio':
      return resumenNegocio(businessId);
    case 'listar_productos':
      return listarProductos(businessId, args ?? {});
    case 'detalle_producto':
      return detalleProducto(businessId, args ?? {});
    case 'ventas_recientes':
      return ventasRecientes(businessId, args ?? {});
    case 'productos_mas_vendidos':
      return productosMasVendidos(businessId, args ?? {});
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}
