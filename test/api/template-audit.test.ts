import { beforeEach, describe, expect, it } from 'vitest'
import issuesGetHandler from '~~/server/api/admin/templates/issues.get'
import resetPostHandler from '~~/server/api/admin/templates/reset.post'
import { templateRegistry } from '~~/server/bot/core/templates'
import { db } from '~~/server/database'
import { commandTemplates, customCommands, generalTemplates, timers, widgets } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

describe('Template Variable Audit & Reset API', () => {
	beforeEach(async () => {
		await clearDatabase()
	})

	describe('GET /api/admin/templates/issues', () => {
		it('should return 0 issues for clean default state', async () => {
			const res = await issuesGetHandler({
				context: { user: { role: 'moderator' } },
			} as any)

			expect(res).toBeDefined()
			expect(res.totalIssues).toBe(0)
			expect(res.hasIssues).toBe(false)
			expect(res.issues).toHaveLength(0)
		})

		it('should detect invalid variables in alerts general templates', async () => {
			// Set broken template with $(user) in follow alert
			await templateRegistry.update('eventsub.alert.follow', 'Thank you for following, $(user)!')

			const res = await issuesGetHandler({
				context: { user: { role: 'moderator' } },
			} as any)

			expect(res.hasIssues).toBe(true)
			expect(res.totalIssues).toBeGreaterThanOrEqual(1)

			const followIssue = res.issues.find(i => i.id === 'alerts:eventsub.alert.follow')
			expect(followIssue).toBeDefined()
			expect(followIssue?.domain).toBe('alerts')
			expect(followIssue?.canReset).toBe(true)
			expect(followIssue?.editUrl).toBe('/admin/alerts')
			expect(followIssue?.invalidVariables).toHaveLength(1)
			expect(followIssue?.invalidVariables[0]?.name).toBe('user')
			expect(followIssue?.invalidVariables[0]?.suggestions).toContain('follower')
		})

		it('should detect invalid variables in command templates table', async () => {
			// Register a test template in templateRegistry
			templateRegistry.register({
				id: 'points.test_cmd',
				default: 'User $(target) got $(amount) points!',
				params: [
					{ name: 'target', label: 'Target', description: '', example: 'user' },
					{ name: 'amount', label: 'Amount', description: '', example: 100 },
				],
			})

			// Insert broken override into command_templates
			await db.insert(commandTemplates).values({
				id: 'points.test_cmd',
				template: 'User $(target) got $(amont) points and $(invalid_var)!',
				updatedAt: new Date(),
			})

			const res = await issuesGetHandler({
				context: { user: { role: 'moderator' } },
			} as any)

			const cmdIssue = res.issues.find(i => i.id === 'commands:points.test_cmd')
			expect(cmdIssue).toBeDefined()
			expect(cmdIssue?.domain).toBe('commands')
			expect(cmdIssue?.invalidVariables.some(v => v.name === 'amont')).toBe(true)
			expect(cmdIssue?.invalidVariables.some(v => v.name === 'invalid_var')).toBe(true)
		})

		it('should detect invalid variables in custom commands table', async () => {
			await db.insert(customCommands).values({
				id: 'cmd-test-1',
				trigger: 'broken',
				response: 'Hello $(random_unregistered_tag) from $(sender)!',
			})

			const res = await issuesGetHandler({
				context: { user: { role: 'moderator' } },
			} as any)

			const customIssue = res.issues.find(i => i.id === 'custom_commands:cmd-test-1')
			expect(customIssue).toBeDefined()
			expect(customIssue?.domain).toBe('custom_commands')
			expect(customIssue?.canReset).toBe(false)
			expect(customIssue?.invalidVariables[0]?.name).toBe('random_unregistered_tag')
		})

		it('should detect invalid variables in timers table', async () => {
			await db.insert(timers).values({
				id: 'timer-1',
				name: 'Socials',
				messages: [
					{ text: 'Valid message $(channel)', enabled: true },
					{ text: 'Broken message $(invalid_timer_var)', enabled: true },
				],
			})

			const res = await issuesGetHandler({
				context: { user: { role: 'moderator' } },
			} as any)

			const timerIssue = res.issues.find(i => i.id === 'timers:timer-1:1')
			expect(timerIssue).toBeDefined()
			expect(timerIssue?.domain).toBe('timers')
			expect(timerIssue?.invalidVariables[0]?.name).toBe('invalid_timer_var')
		})

		it('should detect invalid variables in gambling and vault general templates', async () => {
			await templateRegistry.update('gambling.bonus_start', 'Bonus event with $(invalid_bonus_mult)x multiplier!')
			await templateRegistry.update('vault.warning', 'Vault warning $(invalid_pot_token) pot')

			const res = await issuesGetHandler({
				context: { user: { role: 'moderator' } },
			} as any)

			const gambleIssue = res.issues.find(i => i.id === 'gambling:gambling.bonus_start')
			expect(gambleIssue).toBeDefined()
			expect(gambleIssue?.domain).toBe('gambling')
			expect(gambleIssue?.editUrl).toBe('/admin/loyalty/gambling')

			const vaultIssue = res.issues.find(i => i.id === 'vault:vault.warning')
			expect(vaultIssue).toBeDefined()
			expect(vaultIssue?.domain).toBe('vault')
			expect(vaultIssue?.editUrl).toBe('/admin/loyalty/vault')
		})

		it('should detect invalid variables in widgets table', async () => {
			await db.insert(widgets).values({
				id: 'deaths',
				name: 'Death Counter',
				template: '$(game) Deaths: $(broken_counter_var)',
				styles: {} as any,
			})

			const res = await issuesGetHandler({
				context: { user: { role: 'moderator' } },
			} as any)

			const widgetIssue = res.issues.find(i => i.id === 'widgets:deaths')
			expect(widgetIssue).toBeDefined()
			expect(widgetIssue?.domain).toBe('widgets')
			expect(widgetIssue?.canReset).toBe(true)
		})
	})

	describe('POST /api/admin/templates/reset', () => {
		it('should reset broken alert template back to system default', async () => {
			// Set broken template
			await templateRegistry.update('eventsub.alert.follow', 'Broken follow $(user)')

			const resetRes = await resetPostHandler({
				context: { user: { role: 'moderator' } },
				body: { id: 'alerts:eventsub.alert.follow' },
			} as any)

			expect(resetRes.success).toBe(true)
			expect(resetRes.defaultTemplate).toBe('Thank you for the follow, $(follower)!')

			// Verify templateRegistry override is deleted
			expect(templateRegistry.get('eventsub.alert.follow')?.isOverridden).toBe(false)
			expect(templateRegistry.get('eventsub.alert.follow')?.current).toBe('Thank you for the follow, $(follower)!')

			// Verify audit list is now clean
			const auditRes = await issuesGetHandler({
				context: { user: { role: 'moderator' } },
			} as any)
			expect(auditRes.issues.some(i => i.id === 'alerts:eventsub.alert.follow')).toBe(false)
		})

		it('should reset broken discord template back to default', async () => {
			await templateRegistry.update('discord.alert.follow', 'Broken discord $(user)')

			const resetRes = await resetPostHandler({
				context: { user: { role: 'moderator' } },
				body: { id: 'discord:discord.alert.follow' },
			} as any)

			expect(resetRes.success).toBe(true)
			expect(resetRes.defaultTemplate).toBe('Thank you for the follow, $(follower)!')

			expect(templateRegistry.get('discord.alert.follow')?.isOverridden).toBe(false)
		})

		it('should reset broken ads template with targetId parameter', async () => {
			await templateRegistry.update('ads.alert', 'Ad break starts in $(broken_var)!')

			const resetRes = await resetPostHandler({
				context: { user: { role: 'moderator' } },
				body: { targetId: 'ads.alert' },
			} as any)

			expect(resetRes.success).toBe(true)
			expect(resetRes.defaultTemplate).toBe('Ad break of $(duration) seconds is starting in $(time)!')

			expect(templateRegistry.get('ads.alert')?.isOverridden).toBe(false)
		})

		it('should reset broken widget template back to default', async () => {
			await db.insert(widgets).values({
				id: 'deaths',
				name: 'Death Counter',
				template: 'Broken $(invalid_widget_tag)',
				styles: {} as any,
			})

			const resetRes = await resetPostHandler({
				context: { user: { role: 'moderator' } },
				body: { id: 'widgets:deaths' },
			} as any)

			expect(resetRes.success).toBe(true)
			expect(resetRes.defaultTemplate).toBe('$(game) Deaths: $(count)')

			const [w] = await db.select().from(widgets)
			expect(w?.template).toBe('$(game) Deaths: $(count)')
		})

		it('should reset broken command template by removing database override', async () => {
			templateRegistry.register({
				id: 'points.reset_test',
				default: 'User $(target) balance: $(amount)',
				params: [
					{ name: 'target', label: 'Target', description: '', example: 'user' },
					{ name: 'amount', label: 'Amount', description: '', example: 100 },
				],
			})

			await db.insert(commandTemplates).values({
				id: 'points.reset_test',
				template: 'Broken $(invalid)',
				updatedAt: new Date(),
			})
			await templateRegistry.syncWithDb()

			const resetRes = await resetPostHandler({
				context: { user: { role: 'moderator' } },
				body: { id: 'commands:points.reset_test' },
			} as any)

			expect(resetRes.success).toBe(true)
			expect(resetRes.defaultTemplate).toBe('User $(target) balance: $(amount)')

			const remaining = await db.select().from(commandTemplates)
			expect(remaining.some(r => r.id === 'points.reset_test')).toBe(false)
		})

		it('should reset broken vault and gambling templates back to default', async () => {
			await templateRegistry.update('vault.warning', 'Broken $(invalid_vault_token)')
			await templateRegistry.update('gambling.bonus_start', 'Broken $(invalid_gamble_token)')

			const vaultRes = await resetPostHandler({
				context: { user: { role: 'moderator' } },
				body: { id: 'vault:vault.warning' },
			} as any)
			expect(vaultRes.success).toBe(true)

			const gambleRes = await resetPostHandler({
				context: { user: { role: 'moderator' } },
				body: { id: 'gambling:gambling.bonus_start' },
			} as any)
			expect(gambleRes.success).toBe(true)

			expect(templateRegistry.get('vault.warning')?.isOverridden).toBe(false)
			expect(templateRegistry.get('gambling.bonus_start')?.isOverridden).toBe(false)
		})

		it('should reject reset attempts on non-resetable domains like custom_commands', async () => {
			await expect(resetPostHandler({
				context: { user: { role: 'moderator' } },
				body: { id: 'custom_commands:cmd-1' },
			} as any)).rejects.toThrow()
		})

		it('should correctly map editUrl routes for command templates across domains', async () => {
			templateRegistry.register({ id: 'spotify.test', default: 'Song $(title)', editUrl: '/admin/commands/song', params: [] })
			templateRegistry.register({ id: 'twitch.test', default: 'Twitch $(streamer)', editUrl: '/admin/commands/twitch', params: [] })
			templateRegistry.register({ id: 'deaths.test', default: 'Deaths $(count)', editUrl: '/admin/commands/deaths', params: [] })
			templateRegistry.register({ id: 'watchtime.test', default: 'Time $(time)', editUrl: '/admin/commands/watchtime', params: [] })

			await db.insert(commandTemplates).values([
				{ id: 'spotify.test', template: 'Broken $(broken_1)', updatedAt: new Date() },
				{ id: 'twitch.test', template: 'Broken $(broken_2)', updatedAt: new Date() },
				{ id: 'deaths.test', template: 'Broken $(broken_3)', updatedAt: new Date() },
				{ id: 'watchtime.test', template: 'Broken $(broken_4)', updatedAt: new Date() },
			])

			const res = await issuesGetHandler({
				context: { user: { role: 'moderator' } },
			} as any)

			const spotifyIssue = res.issues.find(i => i.id === 'commands:spotify.test')
			expect(spotifyIssue?.editUrl).toBe('/admin/commands/song')

			const twitchIssue = res.issues.find(i => i.id === 'commands:twitch.test')
			expect(twitchIssue?.editUrl).toBe('/admin/commands/twitch')

			const deathsIssue = res.issues.find(i => i.id === 'commands:deaths.test')
			expect(deathsIssue?.editUrl).toBe('/admin/commands/deaths')

			const watchtimeIssue = res.issues.find(i => i.id === 'commands:watchtime.test')
			expect(watchtimeIssue?.editUrl).toBe('/admin/commands/watchtime')
		})

		it('should detect orphaned database templates and allow cleaning them up', async () => {
			await db.insert(generalTemplates).values({
				id: 'legacy.old_alert',
				template: 'Old $(foo) alert',
				updatedAt: new Date(),
			})

			const res = await issuesGetHandler({
				context: { user: { role: 'moderator' } },
			} as any)

			const orphanIssue = res.issues.find(i => i.targetId === 'legacy.old_alert')
			expect(orphanIssue).toBeDefined()
			expect(orphanIssue?.isOrphan).toBe(true)
			expect(orphanIssue?.canReset).toBe(true)
			expect(orphanIssue?.editUrl).toBeUndefined()
			expect(orphanIssue?.location).toBe('Orphaned Template: legacy.old_alert')

			// Reset/delete the orphan
			const resetRes = await resetPostHandler({
				context: { user: { role: 'moderator' } },
				body: { id: orphanIssue!.id },
			} as any)
			expect(resetRes.success).toBe(true)

			// Verify row is removed from DB
			const rows = await db.select().from(generalTemplates)
			expect(rows.some(r => r.id === 'legacy.old_alert')).toBe(false)
		})
	})
})
