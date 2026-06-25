import path from 'node:path'
import process from 'node:process'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from '~~/server/database'
import { botLogger } from '~~/server/utils/logger'

export default defineNitroPlugin(() => {
	if (process.env.NODE_ENV === 'test' || process.env.SKIP_MIGRATIONS === 'true') {
		return
	}

	try {
		botLogger.info('Running database migrations...')
		const migrationsFolder = path.resolve(process.cwd(), 'server/database/migrations')
		migrate(db, { migrationsFolder })
		botLogger.info('Database migrations completed successfully.')
	}
	catch (err: any) {
		const errMsg = err?.message || ''
		const causeMsg = err?.cause?.message || ''
		if (errMsg.includes('already exists') || causeMsg.includes('already exists')) {
			botLogger.warn('Database migrations skipped or partially applied because tables already exist (likely due to running db:push).')
			return
		}

		botLogger.error({ err }, 'Failed to run database migrations')
		process.exit(1)
	}
})
