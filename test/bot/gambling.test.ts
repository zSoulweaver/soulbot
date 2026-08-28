import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBonusTickets } from '~~/server/bot/modules/points/bonus-manager'
import { db } from '~~/server/database'
import { settings, users } from '~~/server/database/schema'
import { getAppSettingsSync, refreshAppSettingsCache } from '~~/server/utils/settings'
import { clearDatabase, createTestUser, simulateCommand } from '../helpers'

describe('Bot Gamble Command Integration', () => {
	beforeEach(async () => {
		await clearDatabase()
		resetBonusTickets()
		vi.restoreAllMocks()
	})

	it('should reply with zero points error if user has 0 points', async () => {
		const { replies } = await simulateCommand('!gamble 100', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 0,
		})
		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, you haven\'t earned any points yet.')
	})

	it('should reply with invalid-amount error if input is not integer/all/half', async () => {
		const { replies } = await simulateCommand('!gamble abc', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})
		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, Invalid gamble amount. Please use !gamble <amount|all|half>')
	})

	it('should reply with min-bet error if bet is less than minimum (default 10)', async () => {
		const { replies } = await simulateCommand('!gamble 5', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})
		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, The minimum amount to gamble is 10 points.')
	})

	it('should reply with max-bet error if bet exceeds maximum (default 100,000)', async () => {
		const { replies } = await simulateCommand('!gamble 150000', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 200000,
		})
		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, The maximum amount to gamble is 100000 points.')
	})

	it('should reply with not-enough-points error if bet exceeds balance', async () => {
		const { replies } = await simulateCommand('!gamble 600', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})
		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, You only have 500 points (bet: 600).')
	})

	it('should lose points when die roll is below threshold (default 50)', async () => {
		// Mock Math.random to roll a 25 (25/100 = 0.24, which floor(0.24*100)+1 = 25)
		vi.spyOn(Math, 'random').mockReturnValue(0.24)

		const { replies } = await simulateCommand('!gamble 100', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, rolled a 25 and lost 100 points. You went from 500 to 400 points.')

		const aliceRecord = await db.select().from(users).where(eq(users.id, '12345')).then(res => res[0])
		expect(aliceRecord?.points).toBe(400)
		expect(aliceRecord?.gambleWins).toBe(0)
		expect(aliceRecord?.gambleLosses).toBe(1)
		expect(aliceRecord?.gambleNetPoints).toBe(-100)
	})

	it('should win points when die roll is at or above threshold (default 50)', async () => {
		// Mock Math.random to roll a 75 (75/100 = 0.74, which floor(0.74*100)+1 = 75)
		vi.spyOn(Math, 'random').mockReturnValue(0.74)

		const { replies } = await simulateCommand('!gamble 100', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, rolled a 75 and won 100 points! You went from 500 to 600 points.')

		const aliceRecord = await db.select().from(users).where(eq(users.id, '12345')).then(res => res[0])
		expect(aliceRecord?.points).toBe(600)
		expect(aliceRecord?.gambleWins).toBe(1)
		expect(aliceRecord?.gambleLosses).toBe(0)
		expect(aliceRecord?.gambleNetPoints).toBe(100)
	})

	it('should support !gamble all shortcut', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.74) // win

		const { replies } = await simulateCommand('!gamble all', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, rolled a 75 and won 500 points! You went from 500 to 1000 points.')

		const aliceRecord = await db.select().from(users).where(eq(users.id, '12345')).then(res => res[0])
		expect(aliceRecord?.points).toBe(1000)
		expect(aliceRecord?.gambleWins).toBe(1)
		expect(aliceRecord?.gambleLosses).toBe(0)
		expect(aliceRecord?.gambleNetPoints).toBe(500)
	})

	it('should support !gamble all with invisible unicode characters and trailing spaces', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.74) // win

		// Invisible characters: \u034F (combining grapheme joiner), \u200B (zero width space), trailing space
		const { replies } = await simulateCommand('!gamble all \u034F\u200B ', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, rolled a 75 and won 500 points! You went from 500 to 1000 points.')

		const aliceRecord = await db.select().from(users).where(eq(users.id, '12345')).then(res => res[0])
		expect(aliceRecord?.points).toBe(1000)
	})

	it('should support !gamble half shortcut', async () => {
		vi.spyOn(Math, 'random').mockReturnValue(0.1) // lose (11)

		const { replies } = await simulateCommand('!gamble half', {
			id: '12345',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})

		expect(replies).toHaveLength(1)
		expect(replies[0]).toBe('@Alice, rolled a 11 and lost 250 points. You went from 500 to 250 points.')

		const aliceRecord = await db.select().from(users).where(eq(users.id, '12345')).then(res => res[0])
		expect(aliceRecord?.points).toBe(250)
		expect(aliceRecord?.gambleWins).toBe(0)
		expect(aliceRecord?.gambleLosses).toBe(1)
		expect(aliceRecord?.gambleNetPoints).toBe(-250)
	})

	describe('!gamble stats', () => {
		it('should show user\'s own gamble stats', async () => {
			const { replies } = await simulateCommand('!gamble stats', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 500,
				gambleWins: 5,
				gambleLosses: 3,
				gambleNetPoints: 200,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, you have 5 wins and 3 losses, with a net total of 200 points from gambling.')
		})

		it('should show another user\'s gamble stats', async () => {
			await createTestUser({
				id: '67890',
				username: 'bob',
				displayName: 'Bob',
				points: 100,
				gambleWins: 2,
				gambleLosses: 8,
				gambleNetPoints: -300,
			})

			const { replies } = await simulateCommand('!gamble stats bob', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, Bob has 2 wins and 8 losses, with a net total of -300 points from gambling.')
		})

		it('should reply with user-not-found if target does not exist', async () => {
			const { replies } = await simulateCommand('!gamble stats nonexistent', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, User nonexistent hasn\'t been seen by the bot yet.')
		})
	})

	describe('!gamble bonus subcommand', () => {
		it('should silently drop if triggered by viewer', async () => {
			const { replies } = await simulateCommand('!gamble bonus', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				role: 'viewer',
			})
			expect(replies).toHaveLength(0)
		})

		it('should trigger bonus and broadcast chat message if executed by moderator', async () => {
			const { replies } = await simulateCommand('!gamble bonus', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				role: 'moderator',
			})
			expect(replies).toHaveLength(1)
			expect(replies[0]).toContain('A limited-time gambling bonus event is now active!')

			const settingsObj = getAppSettingsSync()
			expect(settingsObj.pointsGamblingBonusEndTime).toBeGreaterThan(Date.now())
		})

		it('should fail to trigger if another bonus event is already active', async () => {
			// Trigger first
			await simulateCommand('!gamble bonus', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				role: 'moderator',
			})
			// Try to trigger second
			const { replies } = await simulateCommand('!gamble bonus', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				role: 'moderator',
			})
			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, A gambling bonus event is already active!')
		})

		it('should apply bonus win multiplier, deduct tickets, and fallback to normal odds after exhausting tickets', async () => {
			// Configure custom bonus settings in DB (2 tickets per user)
			await db.insert(settings).values([
				{ key: 'points.gambling_bonus_duration', value: '10', updatedAt: new Date() },
				{ key: 'points.gambling_bonus_win_multiplier', value: '3.0', updatedAt: new Date() },
				{ key: 'points.gambling_bonus_win_min_roll', value: '80', updatedAt: new Date() },
				{ key: 'points.gambling_bonus_tickets_per_user', value: '2', updatedAt: new Date() },
				{ key: 'points.gambling_bonus_end_time', value: String(Date.now() + 10 * 60 * 1000), updatedAt: new Date() },
			])
			await refreshAppSettingsCache()

			// Ticket 1: roll a 75 (75 < 80 => bonus lose, 1 ticket remaining)
			const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.74)

			const { replies: replies1 } = await simulateCommand('!gamble 100', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 500,
			})
			expect(replies1[0]).toBe('@Alice, rolled a 75 and lost 100 points. (Bonus Ticket Used, 1 left) You went from 500 to 400 points.')

			// Ticket 2: roll a 85 (85 >= 80 => bonus win with 3x multiplier, 0 tickets remaining)
			mockRandom.mockReturnValue(0.84)
			const { replies: replies2 } = await simulateCommand('!gamble 100', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 400,
			})
			expect(replies2[0]).toBe('@Alice, rolled a 85 and won 300 bonus points! (Bonus Ticket Used, 0 left) You went from 400 to 700 points.')

			// Ticket 3 (exhausted tickets): roll 75 (75 >= 50 normal threshold => normal win with 1x multiplier, normal template)
			mockRandom.mockReturnValue(0.74)
			const { replies: replies3, user } = await simulateCommand('!gamble 100', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 700,
			})
			expect(replies3[0]).toBe('@Alice, rolled a 75 and won 100 points! You went from 700 to 800 points.')
			expect(user?.points).toBe(800)
		})
	})
})
