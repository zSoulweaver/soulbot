import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '~~/server/database'
import { gameDeathCounters, games, twitchTokens } from '~~/server/database/schema'
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

		const game = await db.query.games.findFirst({
			where: eq(games.name, 'Elden Ring'),
		})
		expect(game).toBeDefined()

		const counter = await db.query.gameDeathCounters.findFirst({
			where: eq(gameDeathCounters.gameId, game!.id),
		})
		expect(counter?.deaths).toBe(1)
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
		const [game] = await db.insert(games).values({
			name: 'Elden Ring',
		}).returning()
		const [counter] = await db.insert(gameDeathCounters).values({
			gameId: game!.id,
			name: 'Default',
			deaths: 10,
		}).returning()
		await db.update(games).set({ activeDeathCounterId: counter!.id }).where(eq(games.id, game!.id))

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
		const [game] = await db.insert(games).values({
			name: 'Elden Ring',
		}).returning()
		const [counter] = await db.insert(gameDeathCounters).values({
			gameId: game!.id,
			name: 'Default',
			deaths: 20,
		}).returning()
		await db.update(games).set({ activeDeathCounterId: counter!.id }).where(eq(games.id, game!.id))

		const { replies } = await simulateCommand('!deaths reset', {
			id: 'mod-1',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@ModUser, Reset death counter for Elden Ring to 0.')
	})

	it('should allow moderator to switch active counter with !deaths select', async () => {
		const { replies } = await simulateCommand('!deaths select Shadow of the Erdtree', {
			id: 'mod-1',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@ModUser, Switched active death counter for Elden Ring to "Shadow of the Erdtree" (0 deaths).')

		// Adding deaths now bumps Shadow of the Erdtree
		const addRes = await simulateCommand('!deaths add 2', {
			id: 'mod-1',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})
		expect(addRes.replies[0]).toContain('Shadow of the Erdtree')
	})

	it('should allow adding deaths explicitly to a named counter without switching active', async () => {
		const { replies } = await simulateCommand('!deaths add 3 DLC', {
			id: 'mod-1',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toContain('Added 3 death(s)! Total deaths for Elden Ring [DLC]: 3.')
	})

	it('should allow querying specific counter deaths via !deaths <counter>', async () => {
		await simulateCommand('!deaths set 10', { id: 'mod-1', username: 'moduser', role: 'moderator' })
		await simulateCommand('!deaths add 5 DLC', { id: 'mod-1', username: 'moduser', role: 'moderator' })

		const { replies } = await simulateCommand('!deaths DLC', {
			id: '1',
			username: 'alice',
			displayName: 'Alice',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, StreamerChannel has died 5 times in Elden Ring [DLC]. (Total: 15)')

		// Unknown counter
		const notFound = await simulateCommand('!deaths NonExistent', {
			id: '1',
			username: 'alice',
			displayName: 'Alice',
		})
		expect(notFound.replies).toHaveLength(1)
		expect(notFound.replies[0]).toBe('@Alice, Counter "NonExistent" not found for Elden Ring.')
	})

	it('should list all death counters for moderator with !deaths list and deny viewers', async () => {
		await simulateCommand('!deaths set 10', { id: 'mod-1', username: 'moduser', role: 'moderator' })
		await simulateCommand('!deaths add 5 DLC', { id: 'mod-1', username: 'moduser', role: 'moderator' })

		// Viewer rejected
		const viewerRes = await simulateCommand('!deaths list', {
			id: 'viewer-1',
			username: 'vieweruser',
			displayName: 'ViewerUser',
		})
		expect(viewerRes.replies).toHaveLength(0)

		// Moderator allowed
		const { replies } = await simulateCommand('!deaths list', {
			id: 'mod-1',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@ModUser, Death counters for Elden Ring: Default (Active), DLC.')
	})

	it('should allow renaming a counter with !deaths rename', async () => {
		await simulateCommand('!deaths add 1 DLC', { id: 'mod-1', username: 'moduser', role: 'moderator' })

		const { replies } = await simulateCommand('!deaths rename DLC to DLC Run', {
			id: 'mod-1',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@ModUser, Renamed counter "DLC" to "DLC Run" for Elden Ring.')
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
