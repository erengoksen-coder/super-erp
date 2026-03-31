import { NextRequest, NextResponse } from 'next/server'
import { PostgresService } from '@/lib/database/postgres'
import { createSuccessResponse, withRouteHandler } from '@/lib/utils/errors'

// Database configuration
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'super_erp',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '',
  ssl: process.env.POSTGRES_SSL === 'true',
  maxConnections: 20,
  idleTimeoutMillis: 30000,
}

const postgresService = new PostgresService(dbConfig)

// GET: Database health check
export const GET = withRouteHandler(async (request: NextRequest) => {
  try {
    const isConnected = await postgresService.testConnection()
    const stats = await postgresService.getPoolStats()
    
    return createSuccessResponse({
      connected: isConnected,
      database: dbConfig.database,
      stats,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        ssl: dbConfig.ssl
      }
    })
  } catch (error) {
    throw error
  }
})

// POST: Run migration
export const POST = withRouteHandler(async (request: NextRequest) => {
  try {
    await postgresService.migrate()
    
    return createSuccessResponse({ 
      message: 'Database migration completed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    throw error
  }
})