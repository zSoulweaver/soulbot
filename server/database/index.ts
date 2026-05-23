import process from 'node:process'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

function getDbPath() {
	if (process.env.NODE_ENV === 'test') {
		const workerId = process.env.VITEST_WORKER_ID || '1'
		return `sqlite_test_${workerId}.db`
	}
	return 'sqlite.db'
}

const sqlite = new Database(getDbPath())
export const db = drizzle(sqlite, { schema })
