import type { MigrationResult } from './types'
import Database from 'better-sqlite3'

export function mapPhantombotVariables(response: string): string {
	return response
		.replace(/(?<!\$)\(pointtouser\)/gi, () => '$(touser)')
		.replace(/(?<!\$)\(channelname\)/gi, () => '$(channel)')
		.replace(/(?<!\$)\(@sender\)/gi, () => '@$(sender)')
		.replace(/(?<!\$)\(touser\)/gi, () => '$(touser)')
		.replace(/(?<!\$)\(sender\)/gi, () => '$(sender)')
		.replace(/(?<!\$)\(username\)/gi, () => '$(sender)')
}

export function migratePhantombot(dbPath: string): MigrationResult {
	const sourceDb = new Database(dbPath)

	try {
		// Get all tables to check existence
		const tableRows = sourceDb.prepare(`
			SELECT name FROM sqlite_master WHERE type='table'
		`).all() as { name: string }[]
		const existingTables = new Set(tableRows.map(r => r.name.toLowerCase()))

		const hasPhantombotTables = Array.from(existingTables).some(name => name.startsWith('phantombot_'))
		if (!hasPhantombotTables) {
			throw new Error('The uploaded file is not a valid Phantombot database (no Phantombot tables found).')
		}

		const hasLoginToId = existingTables.has('phantombot_logintoid')
		const hasCommand = existingTables.has('phantombot_command')
		const hasNotices = existingTables.has('phantombot_notices')

		if (!hasLoginToId && !hasCommand && !hasNotices) {
			throw new Error('The database is empty or does not contain Phantombot users, custom commands, or timers.')
		}

		// 1. Get custom point settings (currency name)
		let currencyName = 'point'
		let currencyNamePlural = 'points'
		if (existingTables.has('phantombot_pointsettings')) {
			try {
				const pointSettingsRows = sourceDb.prepare(`
					SELECT variable, value 
					FROM phantombot_pointSettings 
					WHERE variable IN ('pointNameSingle', 'pointNameMultiple')
				`).all() as { variable: string, value: string }[]

				const single = pointSettingsRows.find(r => r.variable === 'pointNameSingle')?.value
				const plural = pointSettingsRows.find(r => r.variable === 'pointNameMultiple')?.value

				if (single)
					currencyName = single
				if (plural)
					currencyNamePlural = plural
			}
			catch (err: any) {
				throw new Error(`Could not read phantombot_pointSettings table: ${err.message}`)
			}
		}

		// 2. Get users (only ones with twitch ID)
		let users: MigrationResult['users'] = []
		if (hasLoginToId) {
			try {
				const hasPointsTable = existingTables.has('phantombot_points')
				const hasTimeTable = existingTables.has('phantombot_time')

				const query = `
					SELECT
						l.variable AS username,
						l.value AS twitch_id
						${hasPointsTable ? ', COALESCE(CAST(p.value AS INTEGER), 0) AS points' : ', 0 AS points'}
						${hasTimeTable ? ', COALESCE(CAST(t.value AS INTEGER), 0) AS watch_time_seconds' : ', 0 AS watch_time_seconds'}
					FROM phantombot_logintoid l
					${hasPointsTable ? 'LEFT JOIN phantombot_points p ON p.variable = l.variable AND p.section = \'\'' : ''}
					${hasTimeTable ? 'LEFT JOIN phantombot_time t ON t.variable = l.variable AND t.section = \'\'' : ''}
				`

				const userRows = sourceDb.prepare(query).all() as { username: string, twitch_id: string, points: number, watch_time_seconds: number }[]

				users = userRows
					.filter(r => r.twitch_id && r.username)
					.map(r => ({
						id: String(r.twitch_id),
						username: r.username.toLowerCase().trim(),
						displayName: r.username.charAt(0).toUpperCase() + r.username.slice(1),
						points: r.points,
						watchTime: Math.round(r.watch_time_seconds / 60),
					}))
			}
			catch (err: any) {
				throw new Error(`Could not read user tables for migration: ${err.message}`)
			}
		}

		// 3. Get custom commands
		let commands: MigrationResult['commands'] = []
		if (hasCommand) {
			try {
				const commandRows = sourceDb.prepare(`
					SELECT variable, value 
					FROM phantombot_command 
					WHERE section = ''
				`).all() as { variable: string, value: string }[]

				commands = commandRows
					.filter(r => r.variable && r.value)
					.map(r => ({
						trigger: r.variable.toLowerCase().trim(),
						response: mapPhantombotVariables(r.value),
					}))
			}
			catch (err: any) {
				throw new Error(`Could not read phantombot_command table: ${err.message}`)
			}
		}

		// 4. Get timers/notices
		const timers: MigrationResult['timers'] = []
		if (hasNotices) {
			try {
				const noticeRows = sourceDb.prepare(`
					SELECT variable, value 
					FROM phantombot_notices
				`).all() as { variable: string, value: string }[]

				for (const r of noticeRows) {
					if (!r.value)
						continue
					try {
						const parsed = JSON.parse(r.value)
						if (parsed && Array.isArray(parsed.messages)) {
							const messages = parsed.messages.map((text: string, idx: number) => ({
								text: mapPhantombotVariables(text),
								enabled: parsed.disabled && parsed.disabled[idx] !== undefined ? !parsed.disabled[idx] : true,
							}))

							timers.push({
								name: parsed.name || `Notice ${r.variable}`,
								enabled: parsed.noticeToggle ?? true,
								messages,
								intervalOnline: parsed.intervalMin || 15,
								minMessages: parsed.reqMessages || 0,
							})
						}
					}
					catch (err) {
						console.error(`Failed to parse notice ${r.variable}:`, err)
					}
				}
			}
			catch (err: any) {
				throw new Error(`Could not read phantombot_notices table: ${err.message}`)
			}
		}

		return {
			currencyName,
			currencyNamePlural,
			users,
			commands,
			timers,
		}
	}
	finally {
		sourceDb.close()
	}
}
