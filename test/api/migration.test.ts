import { Buffer } from 'node:buffer'
import { readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { readMultipartFormData } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import importHandler from '~~/server/api/migration/import.post'
import { db } from '~~/server/database'
import { customCommands, excludedUsers, settings, timers as timersTable, users } from '~~/server/database/schema'
import { mapPhantombotVariables } from '~~/server/utils/migration/phantombot'
import { getAppSettingsSync } from '~~/server/utils/settings'
import { clearDatabase } from '../helpers'

vi.mock('h3', async (importOriginal) => {
	const original = await importOriginal<typeof import('h3')>()
	return {
		...original,
		readMultipartFormData: vi.fn(),
	}
})

function createMockPhantombotDb(path: string) {
	const sourceDb = new Database(path)
	sourceDb.exec(`
		CREATE TABLE phantombot_pointSettings (variable string, value string);
		CREATE TABLE phantombot_logintoid (section string, variable string, value string);
		CREATE TABLE phantombot_points (section string, variable string, value string);
		CREATE TABLE phantombot_time (section string, variable string, value string);
		CREATE TABLE phantombot_command (section string, variable string, value string);
		CREATE TABLE phantombot_notices (section varchar(255) not null default (''), variable varchar(255) not null, value text null, primary key (section, variable));

		INSERT INTO phantombot_pointSettings VALUES ('pointNameSingle', 'gil');
		INSERT INTO phantombot_pointSettings VALUES ('pointNameMultiple', 'gil');

		INSERT INTO phantombot_logintoid VALUES ('', 'alice', '12345');
		INSERT INTO phantombot_logintoid VALUES ('', 'bob', '67890');

		INSERT INTO phantombot_points VALUES ('', 'alice', '100');
		INSERT INTO phantombot_points VALUES ('', 'bob', '50');

		INSERT INTO phantombot_time VALUES ('', 'alice', '6000'); -- 100 minutes
		INSERT INTO phantombot_time VALUES ('', 'bob', '3000'); -- 50 minutes

		INSERT INTO phantombot_command VALUES ('', 'hello', 'Hello (pointtouser) from (channelname)!');

		INSERT INTO phantombot_notices VALUES ('', '0', '{"name":"Announcements","reqMessages":5,"intervalMin":10,"shuffle":false,"noticeToggle":true,"messages":["Hello (@sender)"],"disabled":[false]}');
	`)
	sourceDb.close()
}

describe('Database Migration API & Parser', () => {
	const tempDbPath = join(process.cwd(), 'test_phantombot_mock.db')

	beforeEach(async () => {
		await clearDatabase()
		await db.delete(customCommands)
		await db.delete(timersTable)
		await db.delete(excludedUsers)
		// Reset session mock default
		const getUserSessionMock = (globalThis as any).getUserSession
		getUserSessionMock.mockReset()
		getUserSessionMock.mockImplementation(async () => ({ user: { id: 'mock-user', role: 'caster' } }))
	})

	describe('mapPhantombotVariables', () => {
		it('should correctly map phantombot variables to soulbot equivalents', () => {
			const original = 'Hello (pointtouser) in (channelname)! Check (@sender) or (touser) or (sender) or (username).'
			const expected = 'Hello $(touser) in $(channel)! Check @$(sender) or $(touser) or $(sender) or $(sender).'
			expect(mapPhantombotVariables(original)).toBe(expected)
		})
	})

	describe('POST /api/migration/import Authorization', () => {
		it('should block non-casters with a 403 status', async () => {
			const getUserSessionMock = (globalThis as any).getUserSession
			getUserSessionMock.mockImplementationOnce(async () => ({ user: { id: 'mock-user', role: 'moderator' } }))

			try {
				await importHandler({} as any)
				expect.fail('Should have failed with 403')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(403)
			}
		})
	})

	describe('POST /api/migration/import Extraction & DB Injection', () => {
		beforeEach(() => {
			createMockPhantombotDb(tempDbPath)
		})

		afterEach(() => {
			try {
				unlinkSync(tempDbPath)
			}
			catch {}
		})

		it('should successfully parse a valid phantombot sqlite db and write data', async () => {
			// Mock reading raw body from file upload
			const sqliteBuffer = readFileSync(tempDbPath)
			const mockEvent = {
				body: [
					{ name: 'file', data: sqliteBuffer },
					{ name: 'override', data: Buffer.from('false') },
					{ name: 'botType', data: Buffer.from('phantombot') },
				],
			}

			// Mock Nitro H3 body parsers
			const readMultipartFormDataMock = vi.mocked(readMultipartFormData)
			readMultipartFormDataMock.mockResolvedValueOnce(mockEvent.body)

			const res = await importHandler({} as any)
			expect(res.success).toBe(true)
			expect(res.stats.users).toBe(2)
			expect(res.stats.commands).toBe(1)
			expect(res.stats.timers).toBe(1)
			expect(res.stats.currencyName).toBe('gil')

			// Verify point settings in database and settings cache
			const currencyNameSetting = await db.select().from(settings).where(eq(settings.key, 'points.currency_name')).then(r => r[0])
			expect(currencyNameSetting?.value).toBe('gil')
			expect(getAppSettingsSync().currencyName).toBe('gil')

			// Verify user data imported
			const alice = await db.select().from(users).where(eq(users.id, '12345')).then(r => r[0])
			expect(alice).toBeDefined()
			expect(alice?.username).toBe('alice')
			expect(alice?.points).toBe(100)
			expect(alice?.watchTime).toBe(100) // 6000 seconds / 60

			const bob = await db.select().from(users).where(eq(users.id, '67890')).then(r => r[0])
			expect(bob).toBeDefined()
			expect(bob?.username).toBe('bob')
			expect(bob?.points).toBe(50)
			expect(bob?.watchTime).toBe(50)

			// Verify custom command imported
			const cmd = await db.select().from(customCommands).where(eq(customCommands.trigger, 'hello')).then(r => r[0])
			expect(cmd).toBeDefined()
			expect(cmd?.response).toBe('Hello $(touser) from $(channel)!')

			// Verify timer imported
			const timer = await db.select().from(timersTable).where(eq(timersTable.name, 'Announcements')).then(r => r[0])
			expect(timer).toBeDefined()
			expect(timer?.intervalOnline).toBe(10)
			expect(timer?.minMessages).toBe(5)
			expect(timer?.messages).toEqual([{ text: 'Hello @$(sender)', enabled: true }])
		})

		it('should skip duplicate records if override is false', async () => {
			// Seed a user in the local db with existing points
			await db.insert(users).values({
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 1000,
				watchTime: 200,
				role: 'viewer',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			// Seed command with existing response
			await db.insert(customCommands).values({
				id: 'cmd-1',
				trigger: 'hello',
				response: 'Original hello response',
				enabled: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			const sqliteBuffer = readFileSync(tempDbPath)
			const mockEvent = {
				body: [
					{ name: 'file', data: sqliteBuffer },
					{ name: 'override', data: Buffer.from('false') },
					{ name: 'botType', data: Buffer.from('phantombot') },
				],
			}

			vi.mocked(readMultipartFormData).mockResolvedValueOnce(mockEvent.body)

			const res = await importHandler({} as any)
			expect(res.success).toBe(true)

			// Alice should still have 1000 points (not overridden to 100)
			const alice = await db.select().from(users).where(eq(users.id, '12345')).then(r => r[0])
			expect(alice?.points).toBe(1000)

			// Hello command should still have original response
			const cmd = await db.select().from(customCommands).where(eq(customCommands.trigger, 'hello')).then(r => r[0])
			expect(cmd?.response).toBe('Original hello response')
		})

		it('should overwrite duplicate records if override is true', async () => {
			// Seed a user in the local db with existing points
			await db.insert(users).values({
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 1000,
				watchTime: 200,
				role: 'viewer',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			// Seed command with existing response
			await db.insert(customCommands).values({
				id: 'cmd-1',
				trigger: 'hello',
				response: 'Original hello response',
				enabled: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			const sqliteBuffer = readFileSync(tempDbPath)
			const mockEvent = {
				body: [
					{ name: 'file', data: sqliteBuffer },
					{ name: 'override', data: Buffer.from('true') },
					{ name: 'botType', data: Buffer.from('phantombot') },
				],
			}

			vi.mocked(readMultipartFormData).mockResolvedValueOnce(mockEvent.body)

			const res = await importHandler({} as any)
			expect(res.success).toBe(true)

			// Alice should now have 100 points (overridden)
			const alice = await db.select().from(users).where(eq(users.id, '12345')).then(r => r[0])
			expect(alice?.points).toBe(100)

			// Hello command should now have new mapped response
			const cmd = await db.select().from(customCommands).where(eq(customCommands.trigger, 'hello')).then(r => r[0])
			expect(cmd?.response).toBe('Hello $(touser) from $(channel)!')
		})

		it('should skip importing users who are in the exclusions list', async () => {
			// Seed exclusions list with bob
			await db.insert(excludedUsers).values({
				id: '67890',
				username: 'bob',
				displayName: 'Bob',
				reason: 'System Bot',
				createdAt: new Date(),
			})

			const sqliteBuffer = readFileSync(tempDbPath)
			const mockEvent = {
				body: [
					{ name: 'file', data: sqliteBuffer },
					{ name: 'override', data: Buffer.from('false') },
					{ name: 'botType', data: Buffer.from('phantombot') },
				],
			}

			vi.mocked(readMultipartFormData).mockResolvedValueOnce(mockEvent.body)

			const res = await importHandler({} as any)
			expect(res.success).toBe(true)
			expect(res.stats.users).toBe(1) // Only alice should be imported!

			// Bob should NOT be in the users table
			const bob = await db.select().from(users).where(eq(users.id, '67890')).then(r => r[0])
			expect(bob).toBeUndefined()

			// Alice should still be imported
			const alice = await db.select().from(users).where(eq(users.id, '12345')).then(r => r[0])
			expect(alice).toBeDefined()
		})
	})

	describe('POST /api/migration/import Validation & Errors', () => {
		it('should fail with 400 Bad Request if file is missing', async () => {
			const mockEvent = {
				body: [
					{ name: 'override', data: Buffer.from('false') },
					{ name: 'botType', data: Buffer.from('phantombot') },
				],
			}
			vi.mocked(readMultipartFormData).mockResolvedValueOnce(mockEvent.body)

			try {
				await importHandler({} as any)
				expect.fail('Should have failed with 400')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
				expect(err.statusMessage).toBe('SQLite database file is required')
			}
		})

		it('should fail with 400 Bad Request if database has no phantombot tables', async () => {
			const emptyDbPath = join(process.cwd(), 'test_empty_mock.db')
			const emptyDb = new Database(emptyDbPath)
			emptyDb.exec('CREATE TABLE some_random_table (id integer);')
			emptyDb.close()

			const sqliteBuffer = readFileSync(emptyDbPath)
			const mockEvent = {
				body: [
					{ name: 'file', data: sqliteBuffer },
					{ name: 'override', data: Buffer.from('false') },
					{ name: 'botType', data: Buffer.from('phantombot') },
				],
			}
			vi.mocked(readMultipartFormData).mockResolvedValueOnce(mockEvent.body)

			try {
				await importHandler({} as any)
				expect.fail('Should have failed with 400')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
				expect(err.statusMessage).toContain('no Phantombot tables found')
			}
			finally {
				try {
					unlinkSync(emptyDbPath)
				}
				catch {}
			}
		})

		it('should fail with 400 Bad Request if database tables exist but fail to query (corruption)', async () => {
			const corruptDbPath = join(process.cwd(), 'test_corrupt_mock.db')
			const corruptDb = new Database(corruptDbPath)
			corruptDb.exec(`
				CREATE TABLE phantombot_pointSettings (wrong_column text);
				CREATE TABLE phantombot_logintoid (wrong_column text);
			`)
			corruptDb.close()

			const sqliteBuffer = readFileSync(corruptDbPath)
			const mockEvent = {
				body: [
					{ name: 'file', data: sqliteBuffer },
					{ name: 'override', data: Buffer.from('false') },
					{ name: 'botType', data: Buffer.from('phantombot') },
				],
			}
			vi.mocked(readMultipartFormData).mockResolvedValueOnce(mockEvent.body)

			try {
				await importHandler({} as any)
				expect.fail('Should have failed with 400')
			}
			catch (err: any) {
				expect(err.statusCode).toBe(400)
				expect(err.statusMessage).toContain('Could not read phantombot_pointSettings table')
			}
			finally {
				try {
					unlinkSync(corruptDbPath)
				}
				catch {}
			}
		})
	})
})
