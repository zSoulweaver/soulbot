import process from 'node:process'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const dbPath = process.env.NODE_ENV === 'test' ? 'sqlite_test.db' : 'sqlite.db'
const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })
