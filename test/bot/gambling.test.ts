import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { clearDatabase, simulateCommand } from '../helpers'

describe('Bot Gamble Command Integration', () => {
	beforeEach(async () => {
		await clearDatabase()
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
	})
})
