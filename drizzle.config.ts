import process from 'node:process'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	schema: './server/database/schema.ts',
	out: './server/database/migrations',
	dialect: 'sqlite',
	dbCredentials: {
		url: process.env.DATABASE_URL || 'sqlite.db',
	},
})
