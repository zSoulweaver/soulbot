import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	cancelVaultRaid,
	clearVaultTimers,
	getRaiders,
	getTotalPot,
	initVaultManager,
	joinVaultRaid,
	startVaultRaid,
} from '~~/server/bot/modules/points/vault-manager'
import { db } from '~~/server/database'
import { users, vaultRaiders } from '~~/server/database/schema'
import { vaultSettings } from '~~/server/settings'
import { clearDatabase } from '../helpers'

describe('Vault Raid Persistent Escrow & Recovery', () => {
	beforeEach(async () => {
		await clearDatabase()
		clearVaultTimers()
		await vaultSettings.update({ endTime: 0 })
	})

	afterEach(() => {
		clearVaultTimers()
	})

	it('should atomically escrow points on join and update pot', async () => {
		await db.insert(users).values({
			id: 'u1',
			username: 'alice',
			displayName: 'Alice',
			points: 1000,
		})

		await startVaultRaid(90)

		const joinRes = await joinVaultRaid({ id: 'u1', username: 'alice', displayName: 'Alice' }, 400)
		expect(joinRes.action).toBe('joined')

		// User points should be deducted into escrow
		const [user] = await db.select().from(users).where(eq(users.id, 'u1'))
		expect(user?.points).toBe(600)

		// Raider row in SQLite
		const raiders = await getRaiders()
		expect(raiders).toHaveLength(1)
		expect(raiders[0]?.betAmount).toBe(400)

		const pot = await getTotalPot()
		expect(pot).toBe(400)
	})

	it('should atomically adjust escrow when bet is increased or decreased', async () => {
		await db.insert(users).values({
			id: 'u1',
			username: 'alice',
			displayName: 'Alice',
			points: 1000,
		})

		await startVaultRaid(90)

		// Initial bet 300 (balance -> 700)
		await joinVaultRaid({ id: 'u1', username: 'alice', displayName: 'Alice' }, 300)
		let [user] = await db.select().from(users).where(eq(users.id, 'u1'))
		expect(user?.points).toBe(700)

		// Increase bet to 500 (additional 200 deducted, balance -> 500)
		const upRes = await joinVaultRaid({ id: 'u1', username: 'alice', displayName: 'Alice' }, 500)
		expect(upRes.action).toBe('updated')
		;[user] = await db.select().from(users).where(eq(users.id, 'u1'))
		expect(user?.points).toBe(500)

		// Decrease bet to 200 (refund 300, balance -> 800)
		const downRes = await joinVaultRaid({ id: 'u1', username: 'alice', displayName: 'Alice' }, 200)
		expect(downRes.action).toBe('updated')
		;[user] = await db.select().from(users).where(eq(users.id, 'u1'))
		expect(user?.points).toBe(800)
	})

	it('should atomically refund escrow on opt-out (!vault 0)', async () => {
		await db.insert(users).values({
			id: 'u1',
			username: 'alice',
			displayName: 'Alice',
			points: 500,
		})

		await startVaultRaid(90)
		await joinVaultRaid({ id: 'u1', username: 'alice', displayName: 'Alice' }, 300)

		const optOutRes = await joinVaultRaid({ id: 'u1', username: 'alice', displayName: 'Alice' }, 0)
		expect(optOutRes.action).toBe('opt-out')

		const [user] = await db.select().from(users).where(eq(users.id, 'u1'))
		expect(user?.points).toBe(500)

		const raiders = await getRaiders()
		expect(raiders).toHaveLength(0)
	})

	it('should reject join when points are insufficient', async () => {
		await db.insert(users).values({
			id: 'u1',
			username: 'alice',
			displayName: 'Alice',
			points: 100,
		})

		await startVaultRaid(90)
		const res = await joinVaultRaid({ id: 'u1', username: 'alice', displayName: 'Alice' }, 200)

		expect(res.action).toBe('not-enough-points')
		const [user] = await db.select().from(users).where(eq(users.id, 'u1'))
		expect(user?.points).toBe(100)
	})

	it('should refund all raiders on cancelVaultRaid', async () => {
		await db.insert(users).values([
			{ id: 'u1', username: 'alice', displayName: 'Alice', points: 1000 },
			{ id: 'u2', username: 'bob', displayName: 'Bob', points: 500 },
		])

		await startVaultRaid(90)
		await joinVaultRaid({ id: 'u1', username: 'alice', displayName: 'Alice' }, 400)
		await joinVaultRaid({ id: 'u2', username: 'bob', displayName: 'Bob' }, 200)

		await cancelVaultRaid('admin')

		const [alice] = await db.select().from(users).where(eq(users.id, 'u1'))
		const [bob] = await db.select().from(users).where(eq(users.id, 'u2'))

		expect(alice?.points).toBe(1000)
		expect(bob?.points).toBe(500)

		const raiders = await getRaiders()
		expect(raiders).toHaveLength(0)
	})

	it('should auto-refund all raiders on boot if raid expired while offline', async () => {
		await db.insert(users).values([
			{ id: 'u1', username: 'alice', displayName: 'Alice', points: 600 },
			{ id: 'u2', username: 'bob', displayName: 'Bob', points: 300 },
		])

		// Simulate interrupted raid in database where bets were in escrow
		await db.insert(vaultRaiders).values([
			{ userId: 'u1', username: 'alice', displayName: 'Alice', betAmount: 400 },
			{ userId: 'u2', username: 'bob', displayName: 'Bob', betAmount: 200 },
		])

		// Expired endTime in past
		await vaultSettings.update({ endTime: Date.now() - 5000 })

		// Server boots up
		await initVaultManager()

		// Verify 100% of escrowed bets refunded
		const [alice] = await db.select().from(users).where(eq(users.id, 'u1'))
		const [bob] = await db.select().from(users).where(eq(users.id, 'u2'))

		expect(alice?.points).toBe(1000)
		expect(bob?.points).toBe(500)

		const remainingRaiders = await db.select().from(vaultRaiders)
		expect(remainingRaiders).toHaveLength(0)
	})
})
