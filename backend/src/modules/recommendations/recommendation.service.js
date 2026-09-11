import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { paginationMeta } from '../../utils/http.js';

const businessInclude = {
  business: {
    select: {
      id: true,
      name: true,
      category: true,
      entrepreneur: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
  reviewedBy: { select: { id: true, name: true, email: true } },
};

function buildWhere(query) {
  const where = {};
  if (query.businessId) where.businessId = query.businessId;
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.source) where.source = query.source;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { category: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function list(query, pagination) {
  const where = buildWhere(query);
  const [items, total] = await Promise.all([
    prisma.recommendation.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: [{ priority: 'desc' }, { generatedAt: 'desc' }],
      include: businessInclude,
    }),
    prisma.recommendation.count({ where }),
  ]);
  return { items, meta: paginationMeta(total, pagination.page, pagination.limit) };
}

export async function getById(id) {
  const recommendation = await prisma.recommendation.findUnique({
    where: { id },
    include: businessInclude,
  });
  if (!recommendation) throw ApiError.notFound('Recomendación no encontrada');
  return recommendation;
}

export async function create(data) {
  const business = await prisma.business.findUnique({ where: { id: data.businessId }, select: { id: true } });
  if (!business) throw ApiError.badRequest('El negocio indicado no existe');
  return prisma.recommendation.create({ data, include: businessInclude });
}

export async function updateStatus(id, status, adminId) {
  const recommendation = await prisma.recommendation.findUnique({ where: { id }, select: { id: true } });
  if (!recommendation) throw ApiError.notFound('Recomendación no encontrada');

  const reviewed = status === 'ACCEPTED' || status === 'DISMISSED';
  return prisma.recommendation.update({
    where: { id },
    data: {
      status,
      reviewedById: reviewed ? adminId : null,
      reviewedAt: reviewed ? new Date() : null,
    },
    include: businessInclude,
  });
}

export async function remove(id) {
  await prisma.recommendation.delete({ where: { id } });
}
