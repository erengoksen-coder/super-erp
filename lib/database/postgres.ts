import { Pool } from 'pg'
import { createError } from '@/lib/utils/errors'

interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
  maxConnections?: number
  idleTimeoutMillis?: number
}

class PostgresService {
  private pool: Pool
  private config: DatabaseConfig

  constructor(config: DatabaseConfig) {
    this.config = config
    this.pool = new Pool(config)
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(text, params)
      return result.rows
    } catch (error) {
      throw createError.database('Database query failed', error)
    } finally {
      client.release()
    }
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw createError.database('Transaction failed', error)
    } finally {
      client.release()
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1')
      return true
    } catch (error) {
      console.error('Database connection test failed:', error)
      return false
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }

  // Database schema methods
  async migrate(): Promise<void> {
    try {
      await this.transaction(async (client) => {
        // Read migration file
        const fs = require('fs')
        const migrationSQL = fs.readFileSync('./migrations/001_multi_tenant_schema.sql', 'utf8')
        
        // Execute migration
        await client.query(migrationSQL)
        
        console.log('Multi-tenant database migration completed successfully')
      })
    } catch (error) {
      throw createError.database('Migration failed', error)
    }
  }

  // Multi-tenant aware query helpers
  async getCurrentCompany(companyId: string): Promise<any> {
    const result = await this.query(
      'SELECT * FROM companies WHERE id = $1 AND is_active = true',
      [companyId]
    )
    return result[0] || null
  }

  async getCurrentUser(userId: string, companyId: string): Promise<any> {
    const result = await this.query(
      'SELECT u.*, c.name as company_name FROM users u ' +
      'JOIN companies c ON u.company_id = c.id ' +
      'WHERE u.id = $1 AND u.company_id = $2 AND u.is_active = true',
      [userId, companyId]
    )
    return result[0] || null
  }

  async getCompanyUsers(companyId: string): Promise<any[]> {
    const result = await this.query(
      'SELECT u.*, r.name as role_name FROM users u ' +
      'LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.company_id = $1 ' +
      'LEFT JOIN roles r ON ur.role_id = r.id ' +
      'WHERE u.company_id = $1 AND u.is_active = true ' +
      'ORDER BY u.full_name',
      [companyId]
    )
    return result
  }

  async getCompanyBranches(companyId: string): Promise<any[]> {
    const result = await this.query(
      'SELECT * FROM branches WHERE company_id = $1 AND is_active = true ORDER BY name',
      [companyId]
    )
    return result
  }

  async getUserPermissions(userId: string, companyId: string, branchId: string): Promise<any[]> {
    const result = await this.query(
      'SELECT up.* FROM user_permissions up ' +
      'WHERE up.user_id = $1 AND up.company_id = $2 AND up.branch_id = $3',
      [userId, companyId, branchId]
    )
    return result
  }

  async switchCompany(userId: string, newCompanyId: string, newBranchId: string): Promise<void> {
    await this.transaction(async (client) => {
      await client.query(
        'UPDATE users SET company_id = $1, branch_id = $2 WHERE id = $3',
        [newCompanyId, newBranchId, userId]
      )
      
      // Log the company switch
      await client.query(
        'INSERT INTO audit_logs (user_id, company_id, action, table_name, old_values, new_values) ' +
        'VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, newCompanyId, 'COMPANY_SWITCH', 'users', 
          JSON.stringify({ old: 'N/A' }), 
          JSON.stringify({ company_id: newCompanyId, branch_id: newBranchId })]
      )
    })
  }

  // Connection pooling info
  async getPoolStats(): Promise<any> {
    const result = await this.query(`
      SELECT 
        COUNT(*) as total_connections,
        COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `)
    return result[0]
  }

  async closeIdleConnections(): Promise<void> {
    await this.query('DISCARD ALL')
  }
}

export { PostgresService }