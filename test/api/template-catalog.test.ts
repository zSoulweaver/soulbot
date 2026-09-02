import { describe, expect, it } from 'vitest'
import catalogGetHandler from '~~/server/api/templates/catalog.get'

describe('Template Catalog API', () => {
	it('should return global variables and scoped definitions', async () => {
		const res = await catalogGetHandler({
			context: {
				user: {
					role: 'moderator',
				},
			},
		} as any)

		expect(res).toBeDefined()
		expect(res.globalVariables).toBeInstanceOf(Array)
		expect(res.globalVariables.length).toBeGreaterThan(0)
		expect(res.globalVariables.some(v => v.name === 'core.currency')).toBe(true)

		expect(res.scopes).toBeDefined()
		expect(res.scopes['eventsub.alert.follow']).toBeDefined()
		expect(res.scopes['eventsub.alert.follow']?.variables.some(v => v.name === 'follower')).toBe(true)

		expect(res.scopes['vault.win']).toBeDefined()
		expect(res.scopes['vault.win']?.variables.some(v => v.name === 'totalWon')).toBe(true)

		expect(res.scopes['discord.events.join']).toBeDefined()
		expect(res.scopes['ads.alert']).toBeDefined()
	})
})
