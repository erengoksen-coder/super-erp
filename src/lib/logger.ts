import winston from 'winston';
import path from 'path';

/**
 * Livasofa ERP Winston Logger Configuration
 * Centralizes all application logs for production observability.
 */

const { combine, timestamp, printf, colorize, json } = winston.format;

// Layout for human-readable console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Determine log directory (relative to project root)
const logDir = path.join(process.cwd(), 'logs');

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'livasofa-erp' },
  transports: [
    // 1. Critical Errors (Persisted to file)
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // 2. All Logs (Persisted to file)
    new winston.transports.File({ 
      filename: path.join(logDir, 'access.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// 3. Development Console Output
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      consoleFormat
    )
  }));
}

/**
 * Convenience helpers for structured logging
 */
export const logInfo = (message: string, meta?: any) => logger.info(message, meta);
export const logWarn = (message: string, meta?: any) => logger.warn(message, meta);
export const logError = (message: string, error: any, meta?: any) => {
  const errorMeta = error instanceof Error 
    ? { ...meta, error: error.message, stack: error.stack }
    : { ...meta, error };
  logger.error(message, errorMeta);
};
