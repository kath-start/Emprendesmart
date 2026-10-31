import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { ApiError } from '../../utils/apiError.js';
import { sendMail } from '../../utils/mailer.js';
import { TEAM_PLANS, getBusinessAccessOrThrow } from '../app-businesses/app-business.service.js';

/** Personas que el dueño puede sumar a cada negocio, además de él. */
export const TEAM_MAX_MEMBERS = 5;

const ROLE_LABELS = { PARTNER: 'Socio', CASHIER: 'Cajero(a)' };

/** El equipo con el estado de cada invitación: registrada = ya tiene cuenta en la app con ese correo. */
async function withAccountStatus(members) {
  const accounts = await prisma.entrepreneur.findMany({
    where: { email: { in: members.map((m) => m.email) } },
    select: { email: true, firstName: true, lastName: true },
  });
  const byEmail = new Map(accounts.map((a) => [a.email, a]));
  return members.map((member) => {
    const account = byEmail.get(member.email);
    return {
      ...member,
      name: account ? `${account.firstName} ${account.lastName}`.trim() : null,
      registered: Boolean(account),
    };
  });
}

export async function list(businessId, entrepreneurId) {
  const { ownerPlan } = await getBusinessAccessOrThrow(businessId, entrepreneurId, 'manageBusiness');
  const members = await prisma.businessMember.findMany({ where: { businessId }, orderBy: { createdAt: 'asc' } });
  return {
    members: await withAccountStatus(members),
    maxMembers: TEAM_MAX_MEMBERS,
    teamEnabled: TEAM_PLANS.includes(ownerPlan),
  };
}

async function sendInvitation(business, ownerName, email, role) {
  try {
    await sendMail({
      to: email,
      subject: `${ownerName} te invitó a ${business.name} en EmprendeSmart`,
      text:
        `Hola,\n\n${ownerName} te agregó a su negocio "${business.name}" como ${ROLE_LABELS[role]}.\n\n` +
        `Descarga la app EmprendeSmart y regístrate (o inicia sesión) con este mismo correo: ${email}.\n` +
        `El negocio aparecerá en tu lista de negocios.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0D1B3E">
          <h2 style="color:#1A6FF0;margin-bottom:4px">EmprendeSmart</h2>
          <p><strong>${ownerName}</strong> te agregó a su negocio <strong>${business.name}</strong> como <strong>${ROLE_LABELS[role]}</strong>.</p>
          <p>Descarga la app EmprendeSmart y regístrate (o inicia sesión) con este mismo correo:</p>
          <p style="font-size:18px;font-weight:bold;background:#F4F7FC;padding:12px;text-align:center;border-radius:12px">${email}</p>
          <p style="color:#5B6B85">El negocio aparecerá en tu lista de negocios.</p>
        </div>`,
    });
  } catch (error) {
    // La invitación ya quedó guardada: si el correo falla, igual puede registrarse con ese email.
    logger.warn(`[team] No se pudo enviar la invitación a ${email}: ${error.message}`);
  }
}

export async function add(businessId, entrepreneurId, { email, role }) {
  const { business, ownerPlan } = await getBusinessAccessOrThrow(businessId, entrepreneurId, 'manageBusiness');
  if (!TEAM_PLANS.includes(ownerPlan)) {
    throw ApiError.forbidden('Agregar personas a tu negocio está disponible en el plan Pro');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const owner = await prisma.entrepreneur.findUnique({ where: { id: entrepreneurId } });
  if (owner.email === normalizedEmail) throw ApiError.badRequest('Ese es tu propio correo');

  const count = await prisma.businessMember.count({ where: { businessId } });
  if (count >= TEAM_MAX_MEMBERS) {
    throw ApiError.conflict(`Tu plan permite hasta ${TEAM_MAX_MEMBERS} personas por negocio`);
  }
  const existing = await prisma.businessMember.findUnique({
    where: { businessId_email: { businessId, email: normalizedEmail } },
  });
  if (existing) throw ApiError.conflict('Esa persona ya es parte del equipo');

  const member = await prisma.businessMember.create({ data: { businessId, email: normalizedEmail, role } });
  await sendInvitation(business, `${owner.firstName} ${owner.lastName}`.trim(), normalizedEmail, role);
  return (await withAccountStatus([member]))[0];
}

async function getMemberOrThrow(businessId, memberId) {
  const member = await prisma.businessMember.findUnique({ where: { id: memberId } });
  if (!member || member.businessId !== businessId) throw ApiError.notFound('Persona no encontrada en el equipo');
  return member;
}

export async function updateRole(businessId, entrepreneurId, memberId, { role }) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'manageBusiness');
  await getMemberOrThrow(businessId, memberId);
  const member = await prisma.businessMember.update({ where: { id: memberId }, data: { role } });
  return (await withAccountStatus([member]))[0];
}

export async function remove(businessId, entrepreneurId, memberId) {
  await getBusinessAccessOrThrow(businessId, entrepreneurId, 'manageBusiness');
  await getMemberOrThrow(businessId, memberId);
  await prisma.businessMember.delete({ where: { id: memberId } });
}
