import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { paginationMeta } from '../../utils/http.js';
import { uploadPublicImage } from '../../utils/storage.js';
import { assertCanAddProduct } from '../../utils/planLimits.js';
import { getBusinessAccessOrThrow } from '../app-businesses/app-business.service.js';

function buildWhere(businessId, query) {
  const where = { businessId };
  if (query.status) where.status = query.status;
  if (query.category) where.category = { equals: query.category, mode: 'insensitive' };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { sku: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

async function getOwnedProductOrThrow(businessId, productId) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.businessId !== businessId) {
    throw ApiError.notFound('Producto no encontrado');
  }
  return product;
}

export async function list(businessId, entrepreneurId, query, pagination) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'view');
  const where = buildWhere(businessId, query);
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);
  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}

export async function getById(businessId, entrepreneurId, productId) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'view');
  return getOwnedProductOrThrow(businessId, productId);
}

export async function create(businessId, entrepreneurId, data) {
  const { ownerPlan } = await getBusinessAccessOrThrow(businessId, entrepreneurId, 'manageProducts');
  await assertCanAddProduct(businessId, ownerPlan);
  return prisma.product.create({ data: { ...data, businessId } });
}

export async function update(businessId, entrepreneurId, productId, data) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'manageProducts');
  await getOwnedProductOrThrow(businessId, productId);
  return prisma.product.update({ where: { id: productId }, data });
}

export async function remove(businessId, entrepreneurId, productId) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'deleteProducts');
  await getOwnedProductOrThrow(businessId, productId);

  const saleItemCount = await prisma.saleItem.count({ where: { productId } });
  if (saleItemCount > 0) {
    throw ApiError.conflict(
      'No se puede eliminar un producto con ventas registradas; márcalo como inactivo en su lugar',
    );
  }

  await prisma.product.delete({ where: { id: productId } });
}

export async function listMovements(businessId, entrepreneurId, productId, pagination) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'view');
  await getOwnedProductOrThrow(businessId, productId);

  const where = { productId };
  const [items, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { occurredAt: 'desc' },
    }),
    prisma.inventoryMovement.count({ where }),
  ]);
  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}

export async function createMovement(businessId, entrepreneurId, productId, { type, quantity, note }) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'manageProducts');
  const product = await getOwnedProductOrThrow(businessId, productId);

  if ((type === 'RESTOCK' || type === 'RETURN') && quantity <= 0) {
    throw ApiError.badRequest(`La cantidad de un movimiento ${type} debe ser mayor a 0`);
  }
  if (type === 'ADJUSTMENT' && quantity === 0) {
    throw ApiError.badRequest('La cantidad de un ajuste no puede ser 0');
  }

  const delta = type === 'ADJUSTMENT' ? quantity : Math.abs(quantity);
  const newStock = product.stock + delta;
  if (newStock < 0) {
    throw ApiError.badRequest('El movimiento dejaría el stock en negativo');
  }

  const [, movement] = await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { stock: newStock } }),
    prisma.inventoryMovement.create({ data: { productId, type, quantity: delta, note } }),
  ]);

  return movement;
}


/** Sube la foto a Supabase Storage (bucket público) y devuelve su URL pública. */
export async function uploadImage(businessId, entrepreneurId, image) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'manageProducts');
  return uploadPublicImage(businessId, image);
}
