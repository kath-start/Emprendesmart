import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger } from './config/logger.js';
import { expireOverduePlans } from './modules/payments/payment.service.js';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`EmprendeSmart Panel API escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
});

// Revisa cada hora los planes vencidos (y una vez al arrancar).
const runPlanExpiry = () => expireOverduePlans().catch((error) => logger.error('Error al vencer planes:', error));
runPlanExpiry();
setInterval(runPlanExpiry, 60 * 60 * 1000).unref();

async function shutdown(signal) {
  logger.info(`${signal} recibido. Cerrando servidor...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Servidor cerrado correctamente.');
    process.exit(0);
  });
  // Salida forzada si algo queda colgado
  setTimeout(() => process.exit(1), 10000).unref();
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
