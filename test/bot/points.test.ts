import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '~~/server/database'
import { users } from '~~/server/database/schema'
import { clearDatabase, createTestUser, simulateCommand } from '../helpers'

describe('Bot Points Command Integration', () => {
	beforeEach(async () => {
		await clearDatabase()
	})

	describe('!points - View own points', () => {
		it('should reply with zero points template when user has 0 points', async () => {
			const { replies } = await simulateCommand('!points', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 0,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, you have 0 points. Rank #1')
		})

		it('should reply with show-self template when user has points', async () => {
			const { replies } = await simulateCommand('!points', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 150,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, you have 150 points. Rank #1')
		})

		it('should calculate points rank excluding bot and excluded users', async () => {
			const { excludedUsers } = await import('~~/server/database/schema')
			// Excluded user should be ignored
			await createTestUser({ id: '99', username: 'excluded', displayName: 'Excluded', points: 1000 })
			await db.insert(excludedUsers).values({
				id: '99',
				username: 'excluded',
				displayName: 'Excluded',
				reason: 'test',
			})
			// Alice
			const { replies } = await simulateCommand('!points', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 150,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, you have 150 points. Rank #1')
		})
	})

	describe('!points <user> - View others\' points', () => {
		it('should reply that target has no points if they are not in the DB', async () => {
			const { replies } = await simulateCommand('!points nonexistent', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, nonexistent hasn\'t earned any points yet.')
		})

		it('should show target\'s points if target exists and has points', async () => {
			// Seed bob in database first
			await createTestUser({
				id: '67890',
				username: 'bob',
				displayName: 'Bob',
				points: 500,
			})

			const { replies } = await simulateCommand('!points bob', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, bob has 500 points. Rank #1')
		})
	})

	describe('!points add <user> <amount> - Mod-restricted administration', () => {
		it('should silently ignore command if run by normal viewer (permission gate)', async () => {
			// Seed bob
			await createTestUser({
				id: '67890',
				username: 'bob',
				displayName: 'Bob',
				points: 100,
			})

			const { replies } = await simulateCommand('!points add bob 50', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				role: 'viewer',
			})

			// Viewer does not have permission, command should be dropped silently by permission middleware
			expect(replies).toHaveLength(0)

			// Bob's points should remain unchanged in database
			const bobRecord = await db.select().from(users).where(eq(users.id, '67890')).then(res => res[0])
			expect(bobRecord?.points).toBe(100)
		})

		it('should successfully add points and update database when run by moderator', async () => {
			// Seed bob
			await createTestUser({
				id: '67890',
				username: 'bob',
				displayName: 'Bob',
				points: 100,
			})

			const { replies } = await simulateCommand('!points add bob 50', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				role: 'moderator',
			})

			// Verify correct success reply
			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, Added 50 points to Bob. They now have 150 points.')

			// Verify Bob's database points field was directly updated
			const bobRecord = await db.select().from(users).where(eq(users.id, '67890')).then(res => res[0])
			expect(bobRecord?.points).toBe(150)

			// Double check: subsequent check command shows new amount
			const checkResult = await simulateCommand('!points bob', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})
			expect(checkResult.replies[0]).toBe('@Alice, bob has 150 points. Rank #1')
		})

		it('should reply with does-not-exist template if trying to add points to non-existent user', async () => {
			const { replies } = await simulateCommand('!points add charlie 50', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				role: 'moderator',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, charlie does not have an account on Twitch.')
		})
	})

	describe('!points gift <user> <amount> - Gift points to another user', () => {
		it('should successfully gift points from sender to recipient', async () => {
			// Seed both sender and target
			await createTestUser({
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 500,
			})
			await createTestUser({
				id: '67890',
				username: 'bob',
				displayName: 'Bob',
				points: 100,
			})

			const { replies } = await simulateCommand('!points gift bob 150', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 500,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, Gifted 150 points to Bob. You now have 350 points and they have 250 points.')

			// Assert database state updates
			const aliceRecord = await db.select().from(users).where(eq(users.id, '12345')).then(res => res[0])
			const bobRecord = await db.select().from(users).where(eq(users.id, '67890')).then(res => res[0])
			expect(aliceRecord?.points).toBe(350)
			expect(bobRecord?.points).toBe(250)
		})

		it('should reply with not-enough-points template if sender has insufficient points', async () => {
			await createTestUser({
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 50,
			})
			await createTestUser({
				id: '67890',
				username: 'bob',
				displayName: 'Bob',
				points: 100,
			})

			const { replies } = await simulateCommand('!points gift bob 100', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 50,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, You only have 50 points (tried to gift: 100).')

			// Verify DB remained unchanged
			const aliceRecord = await db.select().from(users).where(eq(users.id, '12345')).then(res => res[0])
			expect(aliceRecord?.points).toBe(50)
		})

		it('should reply with self template if trying to gift to oneself', async () => {
			await createTestUser({
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 500,
			})

			const { replies } = await simulateCommand('!points gift alice 100', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 500,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, You cannot gift points to yourself!')
		})

		it('should reply with invalid-amount template or validation error if amount is invalid', async () => {
			const { replies: negativeReplies } = await simulateCommand('!points gift bob -50', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 500,
			})
			expect(negativeReplies).toHaveLength(1)
			expect(negativeReplies[0]).toBe('@Alice, Incorrect usage, amount must be a positive integer. | Usage: `!points gift <user> <amount>`')

			const { replies: zeroReplies } = await simulateCommand('!points gift bob 0', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 500,
			})
			expect(zeroReplies).toHaveLength(1)
			expect(zeroReplies[0]).toBe('@Alice, Incorrect usage, amount must be a positive integer. | Usage: `!points gift <user> <amount>`')

			const { replies: stringReplies } = await simulateCommand('!points gift bob abc', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 500,
			})
			expect(stringReplies).toHaveLength(1)
			expect(stringReplies[0]).toBe('@Alice, Incorrect usage, amount must be a number. | Usage: `!points gift <user> <amount>`')
		})

		it('should reply with does-not-exist template if target user does not exist', async () => {
			await createTestUser({
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 500,
			})

			const { replies } = await simulateCommand('!points gift charlie 100', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 500,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, charlie does not have an account on Twitch.')
		})
	})

	describe('!points get top - View leaderboard', () => {
		it('should return empty template if no users have > 0 points', async () => {
			const { replies } = await simulateCommand('!points get top', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				points: 0,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, The leaderboard is currently empty.')
		})

		it('should return top active point earners formatted on a single line', async () => {
			// Seed several users
			await createTestUser({ id: '1', username: 'u1', displayName: 'User1', points: 30 })
			await createTestUser({ id: '2', username: 'u2', displayName: 'User2', points: 50 })
			await createTestUser({ id: '3', username: 'u3', displayName: 'User3', points: 10 })

			const { replies } = await simulateCommand('!points get top 2', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			// User2 has 50, User1 has 30, User3 has 10. We requested top 2.
			expect(replies[0]).toBe('@Alice, Top 2 Leaders: #1 User2 (50 points), #2 User1 (30 points)')
		})
	})
})
