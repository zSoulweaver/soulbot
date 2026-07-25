import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '~~/server/database'
import { gameDeaths, twitchTokens } from '~~/server/database/schema'
import { getStreamerToken } from '~~/server/utils/twurple'
import { clearDatabase, simulateCommand } from '../helpers'
import { mockApiClient } from '../setup'

describe('Bot Deaths Command Integration', () => {
	beforeEach(async () => {
		await clearDatabase()
		vi.clearAllMocks()

		// Seed a streamer token
		await db.insert(twitchTokens).values({
			accountType: 'streamer',
			userId: 'streamer-id-123',
			userName: 'streamerchannel',
			displayName: 'StreamerChannel',
			accessToken: 'access',
			refreshToken: 'refresh',
			scope: '[]',
			obtainmentTimestamp: Date.now(),
		})

		await getStreamerToken(true)

		// Mock live stream with game "Elden Ring"
		;(mockApiClient as any).streams = {
			getStreamByUserId: vi.fn(async () => ({
				gameName: 'Elden Ring',
			})),
		}
	})

	it('should reply with 0 deaths for a new game on !deaths', async () => {
		const { replies } = await simulateCommand('!deaths', {
			id: '1',
			username: 'alice',
			displayName: 'Alice',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, StreamerChannel has died 0 times in Elden Ring.')
	})

	it('should allow moderator to add deaths (default +1)', async () => {
		const { replies } = await simulateCommand('!deaths add', {
			id: 'mod-1',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@ModUser, Added 1 death(s)! Total deaths for Elden Ring: 1.')

		const record = await db.query.gameDeaths.findFirst({
			where: eq(gameDeaths.gameName, 'Elden Ring'),
		})
		expect(record?.deaths).toBe(1)
	})

	it('should allow moderator to add specific number of deaths', async () => {
		const { replies } = await simulateCommand('!deaths add 5', {
			id: 'mod-1',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@ModUser, Added 5 death(s)! Total deaths for Elden Ring: 5.')
	})

	it('should allow moderator to remove deaths', async () => {
		await db.insert(gameDeaths).values({
			gameName: 'Elden Ring',
			deaths: 10,
		})

		const { replies } = await simulateCommand('!deaths remove 3', {
			id: 'mod-1',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@ModUser, Removed 3 death(s). Total deaths for Elden Ring: 7.')
	})

	it('should allow moderator to set deaths', async () => {
		const { replies } = await simulateCommand('!deaths set 42', {
			id: 'mod-1',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@ModUser, Set death counter for Elden Ring to 42.')
	})

	it('should allow moderator to reset deaths', async () => {
		await db.insert(gameDeaths).values({
			gameName: 'Elden Ring',
			deaths: 20,
		})

		const { replies } = await simulateCommand('!deaths reset', {
			id: 'mod-1',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@ModUser, Reset death counter for Elden Ring to 0.')
	})

	it('should deny non-moderator from adding deaths', async () => {
		const { replies } = await simulateCommand('!deaths add', {
			id: 'viewer-1',
			username: 'vieweruser',
			displayName: 'ViewerUser',
		})

		expect(replies).toHaveLength(0)
	})
})
