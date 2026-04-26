const Database = require('better-sqlite3')

const dbPath = 'data/erp.db'
const db = new Database(dbPath)

function tableExists(name) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name)
  return Boolean(row)
}

function columnExists(table, column) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  return columns.some((col) => col.name === column)
}

function ensureColumn(table, column, definition) {
  if (columnExists(table, column)) {
    return { table, column, action: 'skip' }
  }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  return { table, column, action: 'added' }
}

const actions = []

db.transaction(() => {
  if (tableExists('stocks')) {
    db.exec('DROP TABLE IF EXISTS stocks')
    actions.push({ table: 'stocks', action: 'dropped' })
  } else {
    actions.push({ table: 'stocks', action: 'skip' })
  }

  actions.push(ensureColumn('production_orders', 'deleted_at', 'TEXT'))
  actions.push(ensureColumn('orders', 'deleted_at', 'TEXT'))
  actions.push(ensureColumn('products', 'deleted_at', 'TEXT'))
  actions.push(ensureColumn('orders', 'created_by', 'TEXT'))
  actions.push(ensureColumn('production_orders', 'created_by', 'TEXT'))
})()

console.log('Migration actions:')
for (const action of actions) {
  console.log(`- ${action.table}.${action.column || ''} ${action.action}`)
}

console.log('\nColumns check:')
for (const table of ['orders', 'production_orders', 'products']) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name)
  console.log(`${table}: ${columns.join(', ')}`)
}

db.close()
