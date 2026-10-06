import { logger } from './logger.js';

export function recordAudit(action, details) {
  logger.info({ audit: { action, ...details } }, `Audit: ${action}`);
}
