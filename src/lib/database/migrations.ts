import { PostgresService } from './postgres'

interface Migration {
  id: string
  filename: string
  sql: string
  executed_at?: string
}

export class MigrationService {
  constructor(private db: PostgresService) {}

  async createMigrationTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.db.query('SELECT id FROM migrations ORDER BY executed_at')
      return result.map((row: any) => row.id)
    } catch {
      return []
    }
  }

  async executeMigration(id: string, filename: string, sql: string): Promise<void> {
    await this.db.transaction(async (client) => {
      // Execute migration SQL
      await client.query(sql)
      
      // Record migration
      await client.query(
        'INSERT INTO migrations (id, filename) VALUES ($1, $2)',
        [id, filename]
      )
    })
  }

  async rollbackMigration(id: string): Promise<void> {
    await this.db.query('DELETE FROM migrations WHERE id = $1', [id])
  }

  async runMigrations(): Promise<void> {
    await this.createMigrationTable()
    
    const executedMigrations = await this.getExecutedMigrations()
    const pendingMigrations = await this.getPendingMigrations(executedMigrations)
    
    for (const migration of pendingMigrations) {
      try {
        console.log(`Running migration: ${migration.filename}`)
        await this.executeMigration(migration.id, migration.filename, migration.sql)
        console.log(`Migration completed: ${migration.filename}`)
      } catch (error) {
        console.error(`Migration failed: ${migration.filename}`, error)
        throw error
      }
    }
  }

  private async getPendingMigrations(executedMigrations: string[]): Promise<Migration[]> {
    const migrationFiles = [
      {
        id: '001_multi_tenant_schema',
        filename: '001_multi_tenant_schema.sql',
        sql: await this.loadMigrationFile('001_multi_tenant_schema.sql')
      },
      {
        id: '002_financial_tables',
        filename: '002_financial_tables.sql',
        sql: await this.loadMigrationFile('002_financial_tables.sql')
      }
    ]

    return migrationFiles.filter(m => !executedMigrations.includes(m.id))
  }

  private async loadMigrationFile(filename: string): Promise<string> {
    const fs = require('fs')
    const path = require('path')
    const migrationPath = path.join(process.cwd(), 'migrations', filename)
    
    try {
      return fs.readFileSync(migrationPath, 'utf8')
    } catch (error) {
      throw new Error(`Migration file not found: ${filename}`)
    }
  }

  async getMigrationStatus(): Promise<{ executed: Migration[], pending: Migration[] }> {
    await this.createMigrationTable()
    const executedMigrations = await this.getExecutedMigrations()
    const pendingMigrations = await this.getPendingMigrations(executedMigrations)
    
    const executed = await this.db.query(
      'SELECT id, filename, executed_at FROM migrations ORDER BY executed_at'
    )
    
    return {
      executed: executed,
      pending: pendingMigrations
    }
  }

  async resetDatabase(): Promise<void> {
    console.warn('This will drop all tables. Are you sure?')
    
    const dropSQL = `
      DROP TABLE IF EXISTS 
        migrations,
        journal_entry_lines,
        journal_entries,
        invoice_items,
        invoices,
        payments,
        accounts,
        stock_movements,
        production_orders,
        order_items,
        orders,
        bom_items,
        bom,
        unit_conversions,
        units,
        products,
        materials,
        categories,
        user_permissions,
        user_roles,
        users,
        roles,
        branches,
        companies
      CASCADE
    `
    
    await this.db.query(dropSQL)
    console.log('All tables dropped successfully')
  }
}