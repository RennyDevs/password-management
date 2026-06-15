/**
 * Structured logger wrapper.
 *
 * All application logging goes through this module so that:
 * 1. Output format is consistent.
 * 2. Log levels can be filtered (e.g. suppress debug in production).
 * 3. A monitoring service (Sentry, DataDog, etc.) can be plugged in later
 *    by replacing a single import or adding a transport.
 *
 * Usage:
 *   import { logger } from '../lib/utils/logger';
 *   logger.error('Something went wrong', err);
 *   logger.warn('Rate limit hit', { userId });
 *   logger.info('User signed in');
 */

const IS_DEV = import.meta.env.DEV;

export interface LogContext {
  [key: string]: unknown;
}

function stringifyContext(ctx?: LogContext): string {
  if (!ctx || Object.keys(ctx).length === 0) return '';
  try {
    return ` ${JSON.stringify(ctx)}`;
  } catch {
    return '';
  }
}

function formatMessage(level: string, message: string, ctx?: LogContext): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level}] ${message}${stringifyContext(ctx)}`;
}

export const logger = {
  debug(message: string, ctx?: LogContext): void {
    if (!IS_DEV) return;
    console.debug(formatMessage('DEBUG', message, ctx));
  },

  info(message: string, ctx?: LogContext): void {
    console.info(formatMessage('INFO', message, ctx));
  },

  warn(message: string, ctx?: LogContext): void {
    console.warn(formatMessage('WARN', message, ctx));
  },

  error(message: string, error?: unknown, ctx?: LogContext): void {
    const errInfo =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { raw: String(error) };
    console.error(formatMessage('ERROR', message, ctx), errInfo);
  },
};
