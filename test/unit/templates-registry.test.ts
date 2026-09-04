import { beforeEach, describe, expect, it } from 'vitest'
import { initRegistry } from '~~/server/bot'
import { templateRegistry } from '~~/server/bot/core/templates'
import { db } from '~~/server/database'
import { commandTemplates, generalTemplates } from '~~/server/database/schema'
import { clearDatabase } from '../helpers'

describe('Universal Template Registry', () => {
	beforeEach(async () => {
		await clearDatabase()
		initRegistry()
		await templateRegistry.syncWithDb()
	})

	it('should register both command and general templates on module initialization', () => {
		expect(templateRegistry.has('points.add')).toBe(true)
		expect(templateRegistry.has('eventsub.alert.follow')).toBe(true)
		expect(templateRegistry.has('discord.events.join')).toBe(true)
		expect(templateRegistry.has('vault.start')).toBe(true)
		expect(templateRegistry.has('gambling.bonus_start')).toBe(true)
		expect(templateRegistry.has('ads.alert')).toBe(true)
		expect(templateRegistry.has('widgets.deaths')).toBe(true)
	})

	it('should return correct category and domain metadata', () => {
		const followAlert = templateRegistry.get('eventsub.alert.follow')
		expect(followAlert).toBeDefined()
		expect(followAlert?.category).toBe('general')
		expect(followAlert?.domain).toBe('alerts')
		expect(followAlert?.default).toBe('Thank you for the follow, $(follower)!')

		const pointsAdd = templateRegistry.get('points.add')
		expect(pointsAdd).toBeDefined()
		expect(pointsAdd?.category).toBe('command')
	})

	it('should update command overrides in command_templates table', async () => {
		await templateRegistry.update('points.add', 'Custom points: $(amount) for $(target)')

		const [row] = await db.select().from(commandTemplates)
		expect(row).toBeDefined()
		expect(row?.id).toBe('points.add')
		expect(row?.template).toBe('Custom points: $(amount) for $(target)')

		expect(templateRegistry.get('points.add')?.template).toBe('Custom points: $(amount) for $(target)')
		expect(templateRegistry.get('points.add')?.isOverridden).toBe(true)
	})

	it('should update general/alert overrides in general_templates table', async () => {
		await templateRegistry.update('eventsub.alert.follow', 'Welcome to the crew, $(follower)!')

		const [row] = await db.select().from(generalTemplates)
		expect(row).toBeDefined()
		expect(row?.id).toBe('eventsub.alert.follow')
		expect(row?.template).toBe('Welcome to the crew, $(follower)!')

		expect(templateRegistry.get('eventsub.alert.follow')?.template).toBe('Welcome to the crew, $(follower)!')
		expect(templateRegistry.get('eventsub.alert.follow')?.isOverridden).toBe(true)
	})

	it('should reset templates and remove overrides from the database', async () => {
		await templateRegistry.update('eventsub.alert.follow', 'Custom follow')
		expect(templateRegistry.get('eventsub.alert.follow')?.isOverridden).toBe(true)

		const defaultStr = await templateRegistry.reset('eventsub.alert.follow')
		expect(defaultStr).toBe('Thank you for the follow, $(follower)!')

		const rows = await db.select().from(generalTemplates)
		expect(rows).toHaveLength(0)
		expect(templateRegistry.get('eventsub.alert.follow')?.isOverridden).toBe(false)
		expect(templateRegistry.get('eventsub.alert.follow')?.template).toBe('Thank you for the follow, $(follower)!')
	})

	it('should render global currency and custom parameters synchronously', () => {
		const rendered = templateRegistry.render('points.add', {
			amount: 50,
			target: 'CoolViewer',
			newAmount: 250,
		})

		expect(rendered).toContain('50')
		expect(rendered).toContain('CoolViewer')
		expect(rendered).toContain('250')
	})

	it('should export full catalog format for frontend API', () => {
		const catalog = templateRegistry.getCatalog()
		expect(catalog.globalVariables).toBeDefined()
		expect(catalog.globalVariables.length).toBeGreaterThan(0)
		expect(catalog.scopes['eventsub.alert.follow']).toBeDefined()
		expect(catalog.scopes['points.add']).toBeDefined()
	})
})
