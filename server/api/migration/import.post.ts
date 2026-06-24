import crypto from 'node:crypto'
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { eq, sql } from 'drizzle-orm'
import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { cleanUsername } from '~~/server/bot/core/utils'
import { db } from '~~/server/database'
import { customCommands, excludedUsers, settings, timers as timersTable, users } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { migratePhantombot } from '~~/server/utils/migration/phantombot'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

// Helper to chunk arrays to prevent SQLite parameter threshold limits
function chunkArray<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = []
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size))
	}
	return chunks
}

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')

	const parts = await readMultipartFormData(event)
	if (!parts || parts.length === 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'No multipart data provided',
		})
	}

	let filePart: any = null
	let override = false
	let botType = 'phantombot'

	for (const part of parts) {
		if (part.name === 'file') {
			filePart = part
		}
		else if (part.name === 'override') {
			override = part.data.toString() === 'true'
		}
		else if (part.name === 'botType') {
			botType = part.data.toString()
		}
	}

	if (!filePart || !filePart.data) {
		throw createError({
			statusCode: 400,
			statusMessage: 'SQLite database file is required',
		})
	}

	if (botType !== 'phantombot') {
		throw createError({
			statusCode: 400,
			statusMessage: `Unsupported bot migration type: ${botType}`,
		})
	}

	const tempDir = join(process.cwd(), '.migration-temp')
	mkdirSync(tempDir, { recursive: true })
	const tempFilePath = join(tempDir, `upload-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)

	try {
		writeFileSync(tempFilePath, filePart.data)

		// Run Phantombot sqlite parsing
		let result
		try {
			result = migratePhantombot(tempFilePath)
		}
		catch (err: any) {
			throw createError({
				statusCode: 400,
				statusMessage: err.message || 'Failed to parse Phantombot SQLite database file.',
			})
		}

		// Migrate custom currency name settings
		if (result.currencyName && result.currencyNamePlural) {
			const keysToUpsert = [
				{ key: 'points.currency_name', value: result.currencyName, updatedAt: new Date() },
				{ key: 'points.currency_name_plural', value: result.currencyNamePlural, updatedAt: new Date() },
			]
			await db
				.insert(settings)
				.values(keysToUpsert)
				.onConflictDoUpdate({
					target: settings.key,
					set: {
						value: sql`excluded.value`,
						updatedAt: sql`excluded.updated_at`,
					},
				})
		}

		// Migrate users (Points, Watch Time)
		let usersCount = 0
		if (result.users && result.users.length > 0) {
			const exclusionsList = await db.select().from(excludedUsers)
			const excludedUsernames = new Set(exclusionsList.map(e => e.username.toLowerCase()))
			const filteredUsers = result.users.filter(u => !excludedUsernames.has(u.username.toLowerCase()))

			const userChunks = chunkArray(filteredUsers, 200)
			for (const chunk of userChunks) {
				const values = chunk.map(u => ({
					id: u.id,
					username: cleanUsername(u.username),
					displayName: u.displayName,
					points: u.points,
					watchTime: u.watchTime,
					role: 'viewer' as const,
					isVip: false,
					isSubscriber: false,
					gambleWins: 0,
					gambleLosses: 0,
					gambleNetPoints: 0,
					createdAt: new Date(),
					updatedAt: new Date(),
				}))

				if (override) {
					await db.insert(users)
						.values(values)
						.onConflictDoUpdate({
							target: users.id,
							set: {
								points: sql`excluded.points`,
								watchTime: sql`excluded.watch_time`,
								username: sql`excluded.username`,
								displayName: sql`excluded.display_name`,
								updatedAt: new Date(),
							},
						})
				}
				else {
					await db.insert(users)
						.values(values)
						.onConflictDoNothing()
				}
				usersCount += chunk.length
			}
		}

		// Migrate custom commands
		let commandsCount = 0
		if (result.commands && result.commands.length > 0) {
			const commandChunks = chunkArray(result.commands, 200)
			for (const chunk of commandChunks) {
				const values = chunk.map(c => ({
					id: crypto.randomUUID(),
					trigger: c.trigger,
					response: c.response,
					enabled: true,
					cost: 0,
					globalCooldown: 0,
					userCooldown: 0,
					permission: 'everyone',
					createdAt: new Date(),
					updatedAt: new Date(),
				}))

				if (override) {
					for (const val of values) {
						await db.delete(customCommands).where(eq(customCommands.trigger, val.trigger))
					}
				}
				await db.insert(customCommands)
					.values(values)
					.onConflictDoNothing({
						target: customCommands.trigger,
					})
				commandsCount += chunk.length
			}
		}

		// Migrate timers/notices
		let timersCount = 0
		if (result.timers && result.timers.length > 0) {
			for (const t of result.timers) {
				const timerRow = {
					id: crypto.randomUUID(),
					name: t.name,
					enabled: t.enabled,
					messages: t.messages,
					lastSentIndex: 0,
					intervalOnline: t.intervalOnline,
					intervalOffline: 30,
					minMessages: t.minMessages,
					createdAt: new Date(),
					updatedAt: new Date(),
				}

				if (override) {
					await db.delete(timersTable).where(eq(timersTable.name, t.name))
					await db.insert(timersTable).values(timerRow)
					timersCount++
				}
				else {
					const existing = await db.select().from(timersTable).where(eq(timersTable.name, t.name)).limit(1)
					if (existing.length === 0) {
						await db.insert(timersTable).values(timerRow)
						timersCount++
					}
				}
			}
		}

		// Reload memory-based config cache
		await refreshAppSettingsCache()

		return {
			success: true,
			stats: {
				users: usersCount,
				commands: commandsCount,
				timers: timersCount,
				currencyName: result.currencyName,
				currencyNamePlural: result.currencyNamePlural,
			},
		}
	}
	finally {
		// Clean up the uploaded SQLite file
		try {
			unlinkSync(tempFilePath)
		}
		catch {
			// Ignore cleanup failure
		}
	}
})
