import { ApiError } from '../utils/apiError.js';
import { verifyAccessToken } from '../utils/jwt.js';

/** Exige un access token de emprendedor válido (app móvil) en Authorization: Bearer <token>. */
export const authenticateEntrepreneur = (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return next(ApiError.unauthorized('Token de acceso no proporcionado'));
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== 'entrepreneur') {
      return next(ApiError.unauthorized('Token de acceso inválido o expirado'));
    }
    req.entrepreneur = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return next(ApiError.unauthorized('Token de acceso inválido o expirado'));
  }
};
