/**
 * Structured logger for hlthy.
 *
 * Usage:
 *   import { logger } from '@/shared/utils/logger';
 *   logger.debug('AuthContext', 'user reloaded', { uid });
 *   logger.error('AuthContext', 'profile fetch failed', error);
 *
 * debug() calls are no-ops in production builds (__DEV__ === false).
 */

function formatTag(domain: string): string {
  return `[${domain}]`;
}

export const logger = {
  debug(domain: string, message: string, meta?: unknown): void {
    if (!__DEV__) return;
    console.log(formatTag(domain), message, meta ?? '');
  },

  info(domain: string, message: string, meta?: unknown): void {
    console.info(formatTag(domain), message, meta ?? '');
  },

  warn(domain: string, message: string, meta?: unknown): void {
    console.warn(formatTag(domain), message, meta ?? '');
  },

  error(domain: string, message: string, error?: unknown): void {
    console.error(formatTag(domain), message, error ?? '');
  },
};
