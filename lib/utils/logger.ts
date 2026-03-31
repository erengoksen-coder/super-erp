import { writeFile, appendFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const LOG_DIR = join(process.cwd(), 'logs')
const LOG_FILE = join(LOG_DIR, 'api.log')

// Log dizinini oluştur (yoksa)
async function ensureLogDir() {
  if (!existsSync(LOG_DIR)) {
    await mkdir(LOG_DIR, { recursive: true })
  }
}

// Log formatı: [TARIH SAAT] [SEVIYE] Mesaj
function formatLog(level: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : ''
  return `[${timestamp}] [${level}] ${message}${dataStr}\n`
}

// Log yazma fonksiyonu
export async function writeLog(level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG', message: string, data?: any) {
  try {
    await ensureLogDir()
    const logMessage = formatLog(level, message, data)
    await appendFile(LOG_FILE, logMessage, 'utf-8')
    
    // Console'a da yaz (development için)
    if (level === 'ERROR') {
      console.error(logMessage.trim())
    } else if (level === 'WARN') {
      console.warn(logMessage.trim())
    } else {
      console.log(logMessage.trim())
    }
  } catch (error) {
    // Log yazma hatası - sadece console'a yaz
    console.error('Log yazma hatası:', error)
    console.log(`[${new Date().toISOString()}] [${level}] ${message}`, data || '')
  }
}

// Kısa kullanım için helper fonksiyonlar
export const logger = {
  info: (message: string, data?: any) => writeLog('INFO', message, data),
  error: (message: string, data?: any) => writeLog('ERROR', message, data),
  warn: (message: string, data?: any) => writeLog('WARN', message, data),
  debug: (message: string, data?: any) => writeLog('DEBUG', message, data),
}

// Log dosyasını temizle (opsiyonel)
export async function clearLogs() {
  try {
    await ensureLogDir()
    await writeFile(LOG_FILE, '', 'utf-8')
  } catch (error) {
    console.error('Log temizleme hatası:', error)
  }
}

