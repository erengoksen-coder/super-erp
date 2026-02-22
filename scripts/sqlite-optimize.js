const { openDatabase, getDbPath } = require('./db-utils')

const db = openDatabase(getDbPath())

db.exec('PRAGMA optimize')
db.exec('VACUUM')

console.log('SQLite optimize edildi')

db.close()
