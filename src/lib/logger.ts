import { mkdirSync } from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const isVercel = Boolean(process.env.VERCEL);
const isLocalDevelopment = process.env.NODE_ENV === 'development' && !isVercel;
const logDirectory = path.resolve(process.cwd(), 'logs');
const loggerLevel = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info');

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaSuffix = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const content = stack ?? message;
    return `${timestamp} ${level}: ${content}${metaSuffix}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

if (isLocalDevelopment) {
  mkdirSync(logDirectory, { recursive: true });

  transports.push(
    new DailyRotateFile({
      dirname: logDirectory,
      filename: 'combined.log',
      level: loggerLevel,
      maxSize: '10m',
      maxFiles: '7d',
      format: fileFormat,
    }),
    new DailyRotateFile({
      dirname: logDirectory,
      filename: 'error.log',
      level: 'error',
      maxSize: '10m',
      maxFiles: '14d',
      format: fileFormat,
    })
  );
}

export const logger = winston.createLogger({
  level: loggerLevel,
  defaultMeta: { service: 'pit-platform' },
  transports,
  exitOnError: false,
});
