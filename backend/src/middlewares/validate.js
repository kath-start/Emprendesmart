import { ApiError } from '../utils/apiError.js';

/**
 * Valida req.body / req.query / req.params contra un esquema zod.
 * El esquema debe tener la forma z.object({ body, query, params }) (todas opcionales).
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.slice(1).join('.') || issue.path.join('.'),
      message: issue.message,
    }));
    return next(ApiError.badRequest('Datos de entrada inválidos', details));
  }

  if (result.data.body !== undefined) req.body = result.data.body;
  if (result.data.query !== undefined) req.validatedQuery = result.data.query;
  if (result.data.params !== undefined) req.params = result.data.params;
  return next();
};
