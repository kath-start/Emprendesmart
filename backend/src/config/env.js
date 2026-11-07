import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

/** Devuelve el valor de la variable o lanza si es obligatoria y no existe. */
function read(key, { fallback, requiredInProd = false } = {}) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (requiredInProd && isProd) {
      throw new Error(`Falta la variable de entorno obligatoria: ${key}`);
    }
    return fallback;
  }
  return value;
}

const accessSecret = read('JWT_ACCESS_SECRET', {
  fallback: 'dev-access-secret-no-usar-en-produccion',
  requiredInProd: true,
});
const refreshSecret = read('JWT_REFRESH_SECRET', {
  fallback: 'dev-refresh-secret-no-usar-en-produccion',
  requiredInProd: true,
});

if (!isProd && accessSecret.startsWith('dev-')) {
  // eslint-disable-next-line no-console
  console.warn('[env] Usando secretos JWT de desarrollo. Define JWT_ACCESS_SECRET y JWT_REFRESH_SECRET.');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd,
  port: Number(read('PORT', { fallback: '4000' })),
  logLevel: read('LOG_LEVEL', { fallback: 'info' }),
  databaseUrl: read('DATABASE_URL', { requiredInProd: true }),
  corsOrigins: read('CORS_ORIGINS', { fallback: '*' })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  bcryptRounds: Number(read('BCRYPT_ROUNDS', { fallback: '10' })),
  jwt: {
    accessSecret,
    accessExpiresIn: read('JWT_ACCESS_EXPIRES_IN', { fallback: '15m' }),
    refreshSecret,
    refreshExpiresIn: read('JWT_REFRESH_EXPIRES_IN', { fallback: '7d' }),
  },
  ai: {
    groqApiKey: read('GROQ_API_KEY'),
    groqModel: read('GROQ_MODEL', { fallback: 'openai/gpt-oss-120b' }),
  },
  supabase: {
    url: read('SUPABASE_URL'),
    secretKey: read('SUPABASE_SECRET_KEY') ?? read('SUPABASE_SERVICE_ROLE_KEY'),
    productImagesBucket: read('SUPABASE_PRODUCT_IMAGES_BUCKET', { fallback: 'product-images' }),
  },
  mail: {
    // Gmail con contraseña de aplicación: tiene prioridad sobre Resend y envía a cualquier correo.
    gmailUser: read('GMAIL_USER'),
    gmailAppPassword: read('GMAIL_APP_PASSWORD')?.replace(/\s/g, ''),
    resendApiKey: read('RESEND_API_KEY'),
    // Sin dominio verificado en Resend, onboarding@resend.dev solo entrega al email de tu cuenta de Resend.
    from: read('MAIL_FROM', { fallback: 'EmprendeSmart <onboarding@resend.dev>' }),
  },
  firebase: {
    // Solo se usa para validar los ID tokens de Firebase Auth (Google / SMS); no necesita llave privada.
    projectId: read('FIREBASE_PROJECT_ID', { fallback: 'emprendesmart-75583' }),
  },
};
