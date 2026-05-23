import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export default function () {
	// Setup is a no-op, but we return a teardown function
	return async () => {
		try {
			const files = await fs.readdir(process.cwd())
			for (const file of files) {
				// Clean up any base or auxiliary sqlite files (e.g. journal, wal)
				if (file.startsWith('sqlite_test_')) {
					await fs.unlink(path.join(process.cwd(), file)).catch(() => {})
				}
			}
		}
		catch (err) {
			console.error('Failed to clean up test databases:', err)
		}
	}
}
