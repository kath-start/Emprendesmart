import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

import { env } from '../config/env.js';

/**
 * Firebase Admin solo para verificar ID tokens de Firebase Auth. Con el projectId basta:
 * la firma se valida con las llaves públicas de Google, sin cuenta de servicio.
 */
function firebaseAuth() {
  const app = getApps()[0] ?? initializeApp({ projectId: env.firebase.projectId });
  return getAuth(app);
}

/** Devuelve el token decodificado o lanza si es inválido, expiró o es de otro proyecto. */
export function verifyFirebaseIdToken(idToken) {
  return firebaseAuth().verifyIdToken(idToken);
}
