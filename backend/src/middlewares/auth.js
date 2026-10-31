import { ApiError } from '../utils/apiError.js';
import { verifyAccessToken } from '../utils/jwt.js';

/** Exige un access token válido en el header Authorization: Bearer <token>. */
export const authenticate = (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return next(ApiError.unauthorized('Token de acceso no proporcionado'));
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== 'admin') {
      return next(ApiError.unauthorized('Token de acceso inválido o expirado'));
    }
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch {
    return next(ApiError.unauthorized('Token de acceso inválido o expirado'));
  }
};

/** Restringe el acceso a los roles indicados. Sin argumentos: cualquier admin autenticado. */
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (roles.length > 0 && !roles.includes(req.user.role)) {
    return next(ApiError.forbidden('No tienes permisos para realizar esta acción'));
  }
  return next();
};
