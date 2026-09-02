import { describe, expect, it } from 'vitest'
import { templateRegistry } from '~~/server/bot/core/templates'
import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'

describe('Unified Variable & Template Engine', () => {
	it('should resolve standard $() variables in custom templates', async () => {
		const ctx = createTemplateContext('mysuperchannel', {
			id: '123',
			name: 'coolstreamer',
			displayName: 'CoolStreamer',
		})

		const result = await renderCustomTemplate('Hello $(sender)! Welcome to $(channel).', ctx)
		expect(result).toBe('Hello CoolStreamer! Welcome to mysuperchannel.')
	})

	it('should support $() tokens for Discord guild events', async () => {
		const ctx = createTemplateContext('general', {
			id: '999',
			name: 'newmember',
			displayName: '<@999>',
		})

		const joinResult = await renderCustomTemplate('Welcome to $(server), $(user)!', ctx, {
			user: '<@999>',
			username: 'newmember',
			server: 'MyDiscordGuild',
			memberCount: '150',
		})
		expect(joinResult).toBe('Welcome to MyDiscordGuild, <@999>!')

		const leaveResult = await renderCustomTemplate('$(username) has left $(server).', ctx, {
			user: 'NewMember',
			username: 'newmember',
			server: 'MyDiscordGuild',
			memberCount: '149',
		})
		expect(leaveResult).toBe('newmember has left MyDiscordGuild.')
	})

	it('should dynamically render core templates with renderAsync', async () => {
		const ctx = createTemplateContext('streamerchannel', {
			id: '456',
			name: 'viewer1',
			displayName: 'ViewerOne',
		})

		templateRegistry.register({
			id: 'test.core.template',
			default: 'Hey $(sender), you transferred $(amount) $(core.currency)!',
		})

		const rendered = await templateRegistry.renderAsync('test.core.template', ctx, {
			amount: 50,
		})

		expect(rendered).toContain('Hey ViewerOne, you transferred 50')
	})

	it('should resolve scoped semantic variables cleanly', async () => {
		const ctx = createTemplateContext('mysuperchannel', {
			id: '123',
			name: 'chatter',
			displayName: 'Chatter',
		})

		const followResult = await renderCustomTemplate('Thank you for following, $(follower)!', ctx, {
			'follower': 'NewFollower',
			'follower.name': 'newfollower',
			'follower.id': '999',
		})
		expect(followResult).toBe('Thank you for following, NewFollower!')

		const subResult = await renderCustomTemplate('$(subscriber) subscribed at $(tier)!', ctx, {
			subscriber: 'CoolSub',
			tier: 'Tier 2',
		})
		expect(subResult).toBe('CoolSub subscribed at Tier 2!')

		const raidResult = await renderCustomTemplate('$(raider) raided with $(viewers) viewers!', ctx, {
			raider: 'BigBroadcaster',
			viewers: 100,
		})
		expect(raidResult).toBe('BigBroadcaster raided with 100 viewers!')

		const banResult = await renderCustomTemplate('$(target) was banned by $(moderator)!', ctx, {
			target: 'TrollUser',
			moderator: 'ChiefMod',
		})
		expect(banResult).toBe('TrollUser was banned by ChiefMod!')
	})
})
