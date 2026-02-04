#!/usr/bin/env node

const { Client } = require('pg')
const { readdirSync, readFileSync } = require('fs')
const { join } = require('path')

const connString = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DATABASE_URL
if (!connString) {
  console.error('SUPABASE_DB_URL veya SUPABASE_DATABASE_URL gerekli.')
  process.exit(1)
}

const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
const schemaMode = process.env.SUPABASE_SCHEMA_MODE
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .filter((file) => {
    if (schemaMode === 'production') {
      return !['003_simple_schema.sql', '004_unified_schema.sql', '007_safe_migration.sql'].includes(file)
    }
    if (schemaMode === 'local') {
      const skip = [
        '003_simple_schema.sql',
        '004_unified_schema.sql',
        '007_safe_migration.sql',
        '010_inventory_view.sql',
        '007_enable_rls.sql',
        '008_rls_policies.sql',
        '009_owner_policies.sql',
        '011_security_policies_and_triggers.sql',
        '012_critical_security_updates.sql',
        '013_rls_policies.sql',
      ]
      return !skip.includes(file)
    }
    return true
  })
  .sort()

async function run() {
  const sslDisabled = String(process.env.SUPABASE_DB_SSL || '').toLowerCase() === 'false'
  const client = new Client({
    connectionString: connString,
    ...(sslDisabled ? {} : { ssl: { rejectUnauthorized: false } }),
  })

  await client.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS supabase_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    const executed = await client.query('SELECT filename FROM supabase_migrations')
    const executedSet = new Set(executed.rows.map((row) => row.filename))

    for (const file of migrationFiles) {
      if (executedSet.has(file)) {
        continue
      }
      const sql = readFileSync(join(migrationsDir, file), 'utf8')
      console.log(`Running migration: ${file}`)
      await client.query(sql)
      await client.query('INSERT INTO supabase_migrations (filename) VALUES ($1)', [file])
      console.log(`Completed: ${file}`)
    }
  } finally {
    await client.end()
  }
}

run().catch((error) => {
  console.error('Supabase migration failed:', error.message)
  process.exit(1)
})
