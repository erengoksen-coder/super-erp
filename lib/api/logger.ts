/**
 * Merkezi API hata / işlem loglama.
 * LOG_TO_FILE=true ise logs/api-error.log dosyasına da yazar.
 */

import fs from 'fs'
import path from 'path'

type LogLevel = 'error' | 'warn' | 'info'

const LOG_DIR = path.join(process.cwd(), 'logs')
const ERROR_LOG_FILE = path.join(LOG_DIR, 'api-error.log')

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString()
  const extra = meta ? ' ' + JSON.stringify(meta) : ''
  return `[${ts}] [${level.toUpperCase()}] ${message}${extra}`
}

function writeToFile(filePath: string, line: string): void {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }
    fs.appendFileSync(filePath, line + '\n')
  } catch {
    // ignore
  }
}

export const apiLogger = {
  error(message: string, meta?: Record<string, unknown>): void {
    const line = formatMessage('error', message, meta)
    console.error(line)
    if (process.env.LOG_TO_FILE === 'true') {
      writeToFile(ERROR_LOG_FILE, line)
    }
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    const line = formatMessage('warn', message, meta)
    console.warn(line)
  },
  info(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.info(formatMessage('info', message, meta))
    }
  },
}
