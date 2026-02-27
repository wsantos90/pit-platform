import { mkdirSync } from 'node:fs';
import path from 'node:path';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { AkamaiCookieBundle } from './puppeteer';

function toPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
const LOG_DIR = process.env.LOG_DIR ?? path.resolve(process.cwd(), 'runtime', 'logs');
const LOG_RETENTION_DAYS = toPositiveInt(process.env.LOG_RETENTION_DAYS, 7);
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE ?? '10m';

try {
  mkdirSync(LOG_DIR, { recursive: true });
} catch {
  // Keep process running even if file logger cannot initialize.
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'cookie-service' },
  format: jsonFormat,
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'cookie-service-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: `${LOG_RETENTION_DAYS}d`,
      maxSize: LOG_MAX_SIZE,
      zippedArchive: false,
    }),
  ],
  exitOnError: false,
});

export function errorContext(error: unknown): { error_message: string; error_stack?: string } {
  if (error instanceof Error) {
    return {
      error_message: error.message,
      error_stack: error.stack,
    };
  }
  return {
    error_message: String(error),
  };
}

export function cookieMetadata(bundle: AkamaiCookieBundle): Record<string, unknown> {
  return {
    source: bundle.source,
    extracted_at: bundle.extracted_at,
    valid_until: bundle.valid_until,
    has_ak_bmsc: Boolean(bundle.ak_bmsc?.trim()),
    has_bm_sv: Boolean(bundle.bm_sv?.trim()),
  };
}

export function loggerConfig(): { level: string; dir: string; retentionDays: number; maxSize: string } {
  return {
    level: LOG_LEVEL,
    dir: LOG_DIR,
    retentionDays: LOG_RETENTION_DAYS,
    maxSize: LOG_MAX_SIZE,
  };
}
