import path from 'node:path'
import process from 'node:process'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from '~~/server/database'
import { botLogger } from '~~/server/utils/logger'

export default defineNitroPlugin(() => {
	if (process.env.NODE_ENV === 'test') {
		return
	}

	try {
		botLogger.info('Running database migrations...')
		const migrationsFolder = path.resolve(process.cwd(), 'server/database/migrations')
		migrate(db, { migrationsFolder })
		botLogger.info('Database migrations completed successfully.')
	}
	catch (err) {
		botLogger.error({ err }, 'Failed to run database migrations')
		process.exit(1)
	}
})
