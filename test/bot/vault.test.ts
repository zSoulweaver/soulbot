import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearVaultTimers, resolveVaultRaid } from '~~/server/bot/modules/points/vault-manager'
import { db } from '~~/server/database'
import { settings, users } from '~~/server/database/schema'
import { getAppSettingsSync, refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase, createTestUser, simulateCommand } from '../helpers'

describe('Bot Vault Command Integration', () => {
	beforeEach(async () => {
		await clearDatabase()
		clearVaultTimers()
		vi.restoreAllMocks()
	})

	it('should reply with not-active error if !vault is run while no raid is active', async () => {
		const { replies } = await simulateCommand('!vault 100', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})
		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, There is no active Vault Raid right now.')
	})

	it('should silently drop !vault start if executed by a regular viewer', async () => {
		const { replies } = await simulateCommand('!vault start', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			role: 'viewer',
		})
		expect(replies).toHaveLength(0)
	})

	it('should start vault raid and broadcast message when triggered by moderator', async () => {
		const { replies } = await simulateCommand('!vault start', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			role: 'moderator',
		})
		expect(replies).toHaveLength(1)
		expect(replies[0]).toContain('VAULT RAID INITIATED')

		const settingsObj = getAppSettingsSync()
		expect(settingsObj.pointsVaultEndTime).toBeGreaterThan(Date.now())
	})

	it('should reject starting another vault raid if one is already active', async () => {
		await simulateCommand('!vault start', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			role: 'moderator',
		})

		const { replies } = await simulateCommand('!vault start', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			role: 'moderator',
		})
		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, A Vault Raid is already active!')
	})

	it('should validate min bet, max bet, and balance when joining active raid', async () => {
		await simulateCommand('!vault start', {
			id: '12345',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		// Bet below min (10)
		const { replies: rep1 } = await simulateCommand('!vault 5', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})
		expect(rep1[0]).toBe('@Alice, The minimum amount to join the Vault Raid is 10 points.')

		// Bet above max (100000)
		const { replies: rep2 } = await simulateCommand('!vault 150000', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 200000,
		})
		expect(rep2[0]).toBe('@Alice, The maximum amount to join the Vault Raid is 100000 points.')

		// Bet above balance
		const { replies: rep3 } = await simulateCommand('!vault 600', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})
		expect(rep3[0]).toBe('@Alice, You only have 500 points (tried to bet: 600).')
	})

	it('should allow joining, updating bet, and opting out with !vault 0', async () => {
		await simulateCommand('!vault start', {
			id: '12345',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		// Join with 100
		const { replies: rep1 } = await simulateCommand('!vault 100', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})
		expect(rep1[0]).toBe('@Alice, you joined the Vault Raid with 100 points! (Win: +200, Lose: -100)')

		// Update bet to 200
		const { replies: rep2 } = await simulateCommand('!vault 200', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})
		expect(rep2[0]).toBe('@Alice, updated your Vault Raid bet to 200 points! (Win: +400, Lose: -200)')

		// Opt out with !vault 0
		const { replies: rep3 } = await simulateCommand('!vault 0', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})
		expect(rep3[0]).toBe('@Alice, you have left the Vault Raid squad and your bet was refunded.')

		// Opt out again when not in squad
		const { replies: rep4 } = await simulateCommand('!vault 0', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})
		expect(rep4[0]).toBe('@Alice, you are not currently in the Vault Raid squad.')
	})

	it('should successfully award points to all raiders upon winning showdown', async () => {
		// Set duration to 60s
		await db.insert(settings).values([
			{ key: 'points.vault_duration', value: '60', updatedAt: new Date() },
			{ key: 'points.vault_win_min_roll', value: '50', updatedAt: new Date() },
			{ key: 'points.vault_win_multiplier', value: '2.0', updatedAt: new Date() },
		])
		await refreshAppSettingsCache()

		await simulateCommand('!vault start', {
			id: '12345',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		// Alice joins with 100
		await simulateCommand('!vault 100', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})

		// Bob joins with 200
		await createTestUser({
			id: '67890',
			username: 'bob',
			displayName: 'Bob',
			points: 1000,
		})
		await simulateCommand('!vault 200', {
			id: '67890',
			username: 'bob',
			displayName: 'Bob',
			points: 1000,
		})

		// Mock winning roll 75 (75 >= 50)
		vi.spyOn(Math, 'random').mockReturnValue(0.74)

		const result = await resolveVaultRaid()
		expect(result.isWin).toBe(true)
		expect(result.roll).toBe(75)
		expect(result.raidersCount).toBe(2)
		expect(result.pot).toBe(300)
		expect(result.totalWon).toBe(600) // 100*2 + 200*2 = 600

		// Assert balances
		const aliceRecord = await db.select().from(users).where(eq(users.id, '12345')).then(res => res[0])
		expect(aliceRecord?.points).toBe(700) // 500 + 200

		const bobRecord = await db.select().from(users).where(eq(users.id, '67890')).then(res => res[0])
		expect(bobRecord?.points).toBe(1400) // 1000 + 400
	})

	it('should deduct points from all raiders upon losing showdown', async () => {
		await simulateCommand('!vault start', {
			id: '12345',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		// Alice joins with 100
		await simulateCommand('!vault 100', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})

		// Mock losing roll 25 (25 < 50)
		vi.spyOn(Math, 'random').mockReturnValue(0.24)

		const result = await resolveVaultRaid()
		expect(result.isWin).toBe(false)
		expect(result.roll).toBe(25)
		expect(result.raidersCount).toBe(1)
		expect(result.pot).toBe(100)

		// Assert balance
		const aliceRecord = await db.select().from(users).where(eq(users.id, '12345')).then(res => res[0])
		expect(aliceRecord?.points).toBe(400) // 500 - 100
	})

	it('should cancel active raid when !vault cancel is run by a moderator', async () => {
		await simulateCommand('!vault start', {
			id: '12345',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		const { replies } = await simulateCommand('!vault cancel', {
			id: '12345',
			username: 'moduser',
			displayName: 'ModUser',
			role: 'moderator',
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toContain('The Vault Raid has been cancelled by @ModUser')

		const settingsObj = getAppSettingsSync()
		expect(settingsObj.pointsVaultEndTime).toBe(0)
	})
})
