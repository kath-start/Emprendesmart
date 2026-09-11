import pkg from '@prisma/client';
import { ApiError } from '../utils/apiError.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const { Prisma } = pkg;

/** 404 para rutas no registradas. */
export const notFound = (req, res, next) => {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

/** Middleware central de manejo de errores. */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const fields = error.meta?.target?.join(', ') ?? 'campos únicos';
      error = ApiError.conflict(`Ya existe un registro con esos ${fields}`);
    } else if (error.code === 'P2025') {
      error = ApiError.notFound('El recurso solicitado no existe');
    } else if (error.code === 'P2003') {
      error = ApiError.badRequest('Referencia inválida a otro recurso');
    } else {
      error = ApiError.badRequest('Error de base de datos', { code: error.code });
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    error = ApiError.badRequest('Consulta inválida a la base de datos');
  }

  if (!(error instanceof ApiError)) {
    logger.error(error.stack || error.message || error);
    error = new ApiError(500, 'Error interno del servidor');
  }

  const body = {
    success: false,
    message: error.message,
  };
  if (error.details) body.details = error.details;
  if (!env.isProd && err.stack) body.stack = err.stack;

  res.status(error.statusCode).json(body);
};
