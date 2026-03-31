import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { PostgresService } from '@/lib/database/postgres'
import { createSuccessResponse, createError, withRouteHandler } from '@/lib/utils/errors'

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

// GET: Available companies
export const GET = withRouteHandler(async (request: NextRequest) => {
  try {
    const companies = await postgresService.query(`
      SELECT 
        id, name, tax_id, phone, email, logo_url, is_active, created_at, updated_at,
        (SELECT COUNT(*) FROM branches WHERE company_id = c.id) as branch_count
      FROM companies c
      WHERE c.is_active = true
      ORDER BY name
    `)

    return createSuccessResponse(companies)
  } catch (error) {
    throw error
  }
})

// POST: Create new company
export const POST = withRouteHandler(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { name, taxId, phone, email, logoUrl } = body

    if (!name) {
      throw createError.validation('Company name is required')
    }

    const result = await postgresService.query(`
      INSERT INTO companies (id, name, tax_id, phone, email, logo_url, settings)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, '{}')
      RETURNING id, name, created_at
    `, [name, taxId, phone, email, logoUrl])

    return createSuccessResponse(result, 'Company created successfully')
  } catch (error) {
    throw error
  }
})
