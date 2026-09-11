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
};
