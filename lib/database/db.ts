import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'erp_stable.db')
export const db = new Database(dbPath)

// Helper for many queries
export function query<T>(sql: string, params: any[] = []): T[] {
  return db.prepare(sql).all(...params) as T[]
}

export function execute(sql: string, params: any[] = []) {
  return db.prepare(sql).run(...params)
}

export function getOne<T>(sql: string, params: any[] = []): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined
}
