import { env } from './env.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[env.logLevel] ?? LEVELS.info;

function emit(level, args) {
  if (LEVELS[level] > currentLevel) return;
  const timestamp = new Date().toISOString();
  const method = level === 'debug' ? 'log' : level;
  // eslint-disable-next-line no-console
  console[method](`[${timestamp}] ${level.toUpperCase()}`, ...args);
}

export const logger = {
  error: (...args) => emit('error', args),
  warn: (...args) => emit('warn', args),
  info: (...args) => emit('info', args),
  debug: (...args) => emit('debug', args),
};
