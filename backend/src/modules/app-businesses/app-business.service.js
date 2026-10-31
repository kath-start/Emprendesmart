import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { paginationMeta } from '../../utils/http.js';
import { uploadPublicImage } from '../../utils/storage.js';

/** Planes cuyo dueño puede compartir sus negocios con un equipo. */
export const TEAM_PLANS = ['PRO'];

/**
 * Qué roles pueden hacer cada acción. El dueño (OWNER) no es un BusinessMember:
 * es quien creó el negocio.
 */
const PERMISSIONS = {
  view: ['OWNER', 'PARTNER', 'CASHIER'],
  sell: ['OWNER', 'PARTNER', 'CASHIER'],
  manageProducts: ['OWNER', 'PARTNER'],
  deleteProducts: ['OWNER'],
  insights: ['OWNER', 'PARTNER'],
  manageBusiness: ['OWNER'],
};

const FORBIDDEN_MESSAGES = {
  manageProducts: 'Tu rol no permite crear ni editar productos',
  deleteProducts: 'Solo el dueño del negocio puede eliminar productos',
  insights: 'Tu rol no tiene acceso a esta sección',
  manageBusiness: 'Solo el dueño del negocio puede hacer esto',
};

const COUNTS = { _count: { select: { products: true, sales: true, alerts: true, recommendations: true } } };
const OWNER = { select: { firstName: true, lastName: true, plan: true } };

async function findRole(business, entrepreneurId) {
  if (business.entrepreneurId === entrepreneurId) return 'OWNER';
  // El equipo solo tiene acceso mientras el dueño mantenga un plan que lo incluya.
  if (!TEAM_PLANS.includes(business.entrepreneur.plan)) return null;
  const me = await prisma.entrepreneur.findUnique({ where: { id: entrepreneurId }, select: { email: true } });
  if (!me) return null;
  const member = await prisma.businessMember.findUnique({
    where: { businessId_email: { businessId: business.id, email: me.email } },
  });
  return member?.role ?? null;
}

/**
 * Carga un negocio y verifica que el emprendedor autenticado puede hacer `permission` en él
 * (como dueño o como parte del equipo). Devuelve el negocio, el plan del dueño y el rol.
 */
export async function getBusinessAccessOrThrow(businessId, entrepreneurId, permission = 'view') {
  const business = await prisma.business.findUnique({ where: { id: businessId }, include: { entrepreneur: OWNER } });
  const role = business ? await findRole(business, entrepreneurId) : null;
  if (!role) throw ApiError.notFound('Negocio no encontrado');
  if (!PERMISSIONS[permission].includes(role)) throw ApiError.forbidden(FORBIDDEN_MESSAGES[permission]);
  return { business, role, ownerPlan: business.entrepreneur.plan };
}

function withAccess(business, role) {
  const { entrepreneur, ...rest } = business;
  return { ...rest, role, ownerName: `${entrepreneur.firstName} ${entrepreneur.lastName}`.trim() };
}

/** Negocios propios y los compartidos con el emprendedor (equipo de un dueño con plan Pro). */
export async function list(entrepreneurId, pagination) {
  const me = await prisma.entrepreneur.findUnique({ where: { id: entrepreneurId }, select: { email: true } });
  const memberships = me
    ? await prisma.businessMember.findMany({
        where: { email: me.email, business: { entrepreneur: { plan: { in: TEAM_PLANS } } } },
        select: { businessId: true, role: true },
      })
    : [];
  const sharedRoles = new Map(memberships.map((m) => [m.businessId, m.role]));

  const where = { OR: [{ entrepreneurId }, { id: { in: [...sharedRoles.keys()] } }] };
  const [items, total] = await Promise.all([
    prisma.business.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: { ...COUNTS, entrepreneur: OWNER },
    }),
    prisma.business.count({ where }),
  ]);
  return {
    items: items.map((b) => withAccess(b, b.entrepreneurId === entrepreneurId ? 'OWNER' : sharedRoles.get(b.id))),
    meta: paginationMeta(total, pagination.page, pagination.limit),
  };
}

export async function getById(businessId, entrepreneurId) {
  const { role } = await getBusinessAccessOrThrow(businessId, entrepreneurId);
  const business = await prisma.business.findUnique({ where: { id: businessId }, include: { ...COUNTS, entrepreneur: OWNER } });
  return withAccess(business, role);
}

export async function create(entrepreneurId, data) {
  const business = await prisma.business.create({ data: { ...data, entrepreneurId }, include: { entrepreneur: OWNER } });
  return withAccess(business, 'OWNER');
}

export async function update(businessId, entrepreneurId, data) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'manageBusiness');
  const business = await prisma.business.update({ where: { id: businessId }, data, include: { entrepreneur: OWNER } });
  return withAccess(business, 'OWNER');
}

/** Sube el logo del negocio (solo el dueño) y lo guarda en el negocio. */
export async function uploadLogo(businessId, entrepreneurId, image) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'manageBusiness');
  const logoUrl = await uploadPublicImage(`logos/${businessId}`, image);
  const business = await prisma.business.update({ where: { id: businessId }, data: { logoUrl }, include: { entrepreneur: OWNER } });
  return withAccess(business, 'OWNER');
}

export async function removeLogo(businessId, entrepreneurId) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'manageBusiness');
  const business = await prisma.business.update({
    where: { id: businessId },
    data: { logoUrl: null },
    include: { entrepreneur: OWNER },
  });
  return withAccess(business, 'OWNER');
}
