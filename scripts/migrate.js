#!/usr/bin/env node

const { PostgresService } = require('../lib/database/postgres')
const { MigrationService } = require('../lib/database/migrations')

async function runMigration() {
  const command = process.argv[2] || 'up'
  
  // Database configuration
  const dbConfig = {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'super_erp',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production',
    maxConnections: 20,
    idleTimeoutMillis: 30000
  }

  const postgresService = new PostgresService(dbConfig)
  const migrationService = new MigrationService(postgresService)

  try {
    console.log('Connecting to database...')
    const isConnected = await postgresService.testConnection()
    
    if (!isConnected) {
      console.error('❌ Database connection failed')
      process.exit(1)
    }

    console.log('✅ Database connected successfully')

    switch (command) {
      case 'up':
        console.log('🚀 Running migrations...')
        await migrationService.runMigrations()
        console.log('✅ All migrations completed successfully')
        break
        
      case 'down':
        console.log('⚠️  Rollback not implemented yet')
        break
        
      case 'status':
        console.log('📊 Migration status:')
        const status = await migrationService.getMigrationStatus()
        console.log(`\nExecuted migrations: ${status.executed.length}`)
        status.executed.forEach(m => {
          console.log(`  ✅ ${m.id} (${m.executed_at})`)
        })
        console.log(`\nPending migrations: ${status.pending.length}`)
        status.pending.forEach(m => {
          console.log(`  ⏳ ${m.id} (${m.filename})`)
        })
        break
        
      case 'reset':
        console.log('⚠️  Resetting database...')
        await migrationService.resetDatabase()
        await migrationService.runMigrations()
        console.log('✅ Database reset and migrations completed')
        break
        
      case 'fresh':
        console.log('🆕 Creating fresh database...')
        await migrationService.resetDatabase()
        await migrationService.runMigrations()
        console.log('✅ Fresh database created with migrations')
        break
        
      default:
        console.error(`Unknown command: ${command}`)
        console.log('Available commands: up, status, reset, fresh')
        process.exit(1)
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await postgresService.close()
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Migration cancelled')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Migration terminated')
  process.exit(0)
})

// Run migration
runMigration().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})