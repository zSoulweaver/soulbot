import { beforeEach, describe, expect, it } from 'vitest'
import { clearDatabase, createTestUser, simulateCommand } from '../helpers'

describe('Bot Watch Time Command Integration', () => {
	beforeEach(async () => {
		await clearDatabase()
	})

	describe('!time - View own watch time', () => {
		it('should reply with zero watch time template when user has 0 watch time', async () => {
			const { replies } = await simulateCommand('!time', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				watchTime: 0,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, you haven\'t accumulated any watch time yet.')
		})

		it('should reply with show-self template when user has watch time', async () => {
			// Seed alice in database with watch time
			await createTestUser({
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				watchTime: 75,
			})

			const { replies } = await simulateCommand('!time', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
				watchTime: 75,
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, you have spent 1 hour 15 minutes hanging out in chat and are rank #1 on the leaderboard.')
		})

		it('should calculate correct rank relative to other users', async () => {
			// Seed multiple users
			await createTestUser({ id: '1', username: 'bob', displayName: 'Bob', watchTime: 120 })
			await createTestUser({ id: '2', username: 'charlie', displayName: 'Charlie', watchTime: 45 })
			await createTestUser({ id: '3', username: 'alice', displayName: 'Alice', watchTime: 75 })

			const { replies } = await simulateCommand('!time', {
				id: '3',
				username: 'alice',
				displayName: 'Alice',
				watchTime: 75,
			})

			expect(replies).toHaveLength(1)
			// Bob (120m) is #1, Alice (75m) is #2, Charlie (45m) is #3
			expect(replies[0]).toBe('@Alice, you have spent 1 hour 15 minutes hanging out in chat and are rank #2 on the leaderboard.')
		})
	})

	describe('!time <user> - View others\' watch time', () => {
		it('should reply that target has no watch time if they are not in the DB', async () => {
			const { replies } = await simulateCommand('!time nonexistent', {
				id: '12345',
				username: 'alice',
				displayName: 'Alice',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Alice, nonexistent hasn\'t accumulated any watch time yet.')
		})

		it('should show target\'s watch time and rank if target exists', async () => {
			// Seed bob and charlie
			await createTestUser({ id: '1', username: 'bob', displayName: 'Bob', watchTime: 120 })
			await createTestUser({ id: '2', username: 'charlie', displayName: 'Charlie', watchTime: 30 })

			const { replies } = await simulateCommand('!time bob', {
				id: '2',
				username: 'charlie',
				displayName: 'Charlie',
			})

			expect(replies).toHaveLength(1)
			expect(replies[0]).toBe('@Charlie, Bob has spent 2 hours hanging out in chat and is rank #1 on the leaderboard.')
		})
	})
})
