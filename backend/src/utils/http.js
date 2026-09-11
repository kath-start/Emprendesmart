/** Respuesta exitosa estándar. */
export function ok(res, data, meta) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.json(body);
}

/** Respuesta 201 para recursos creados. */
export function created(res, data) {
  return res.status(201).json({ success: true, data });
}

/** Normaliza parámetros de paginación desde el query string. */
export function getPagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

/** Construye el objeto meta de paginación. */
export function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
