const { Client } = require('pg')

const connectionString = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DATABASE_URL

if (!connectionString) {
  console.error('SUPABASE_DB_URL veya SUPABASE_DATABASE_URL gerekli.')
  process.exit(1)
}

async function safeAddColumn(client, table, column, type) {
  const res = await client.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [table, column]
  )

  if (res.rows.length > 0) {
    console.log(`✅ Kolon zaten mevcut: ${table}.${column}`)
    return
  }

  await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`)
  console.log(`✅ Kolon eklendi: ${table}.${column}`)
}

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  try {
    await safeAddColumn(client, 'production_orders', 'deleted_at', 'TIMESTAMPTZ')
    await safeAddColumn(client, 'orders', 'deleted_at', 'TIMESTAMPTZ')
    await safeAddColumn(client, 'products', 'deleted_at', 'TIMESTAMPTZ')
    await safeAddColumn(client, 'orders', 'created_by', 'TEXT')
    await safeAddColumn(client, 'production_orders', 'created_by', 'TEXT')
  } finally {
    await client.end()
  }
}

runMigration().catch((error) => {
  console.error('❌ Migration failed:', error.message)
  process.exit(1)
})
