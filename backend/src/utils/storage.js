import crypto from 'node:crypto';

import { env } from '../config/env.js';
import { ApiError } from './apiError.js';

const IMAGE_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Sube una imagen al bucket público de Supabase y devuelve su URL pública. */
export async function uploadPublicImage(folder, { contentType, data }) {
  const mimeType = contentType?.split(';')[0];
  const extension = IMAGE_EXTENSIONS[mimeType];
  if (!extension || !Buffer.isBuffer(data) || data.length === 0) {
    throw ApiError.badRequest('Envía una imagen JPG, PNG o WEBP de hasta 5 MB');
  }
  const { url, secretKey, productImagesBucket } = env.supabase;
  if (!url || !secretKey) throw ApiError.badGateway('El almacenamiento de imágenes no está configurado');

  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const response = await fetch(`${url}/storage/v1/object/${productImagesBucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': mimeType,
      'Cache-Control': 'max-age=31536000',
    },
    body: data,
  });
  if (!response.ok) {
    throw ApiError.badGateway('No se pudo guardar la imagen', await response.text().catch(() => undefined));
  }
  return `${url}/storage/v1/object/public/${productImagesBucket}/${path}`;
}
