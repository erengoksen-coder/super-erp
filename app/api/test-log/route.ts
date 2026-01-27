import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    // Test logları yaz
    logger.info('Test log mesajı - INFO seviyesi', { test: true, timestamp: new Date().toISOString() })
    logger.error('Test log mesajı - ERROR seviyesi', { test: true, error: 'Test error' })
    logger.warn('Test log mesajı - WARN seviyesi', { test: true, warning: 'Test warning' })
    logger.debug('Test log mesajı - DEBUG seviyesi', { test: true, debug: 'Test debug' })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test logları yazıldı. logs/api.log dosyasını kontrol edin.',
      log_file: 'logs/api.log'
    })
  } catch (error: any) {
    logger.error('Test log endpoint hatası', { error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

