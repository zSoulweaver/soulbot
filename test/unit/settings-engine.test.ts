import type { GamblingSettingsSchema, PointsSettingsSchema } from '~~/server/settings'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { defineSettingsDomain, SettingsDomain, settingsRegistry } from '~~/server/settings'
import { clearDatabase } from '../helpers'

describe('Settings Engine Unit Tests', () => {
	beforeEach(async () => {
		await clearDatabase()
	})

	it('should initialize with Zod default values', () => {
		const TestSchema = z.object({
			foo: z.string().default('hello'),
			bar: z.number().default(42),
			baz: z.boolean().default(true),
		})

		const domain = new SettingsDomain({
			namespace: 'test.engine',
			schema: TestSchema,
		})

		expect(domain.get()).toEqual({
			foo: 'hello',
			bar: 42,
			baz: true,
		})
	})

	it('should load and coerce SQLite KV rows into typed objects', () => {
		const TestSchema = z.object({
			minBet: z.number().default(10),
			enabled: z.boolean().default(false),
			title: z.string().default('Default Title'),
		})

		const domain = new SettingsDomain({
			namespace: 'test.load',
			schema: TestSchema,
		})

		domain.loadFromDbRows([
			{ key: 'test.load.min_bet', value: '500' },
			{ key: 'test.load.enabled', value: 'true' },
			{ key: 'test.load.title', value: 'Custom Title' },
		])

		expect(domain.get()).toEqual({
			minBet: 500,
			enabled: true,
			title: 'Custom Title',
		})
	})

	it('should support custom key mappings', () => {
		const TestSchema = z.object({
			legacyProp: z.string().default('legacy_default'),
		})

		const domain = new SettingsDomain({
			namespace: 'test.custom',
			schema: TestSchema,
			customKeys: {
				legacyProp: 'legacy_custom_key',
			},
		})

		domain.loadFromDbRows([
			{ key: 'legacy_custom_key', value: 'legacy_override' },
		])

		expect(domain.get().legacyProp).toBe('legacy_override')
	})

	it('should persist updates to database and update RAM cache', async () => {
		const TestSchema = z.object({
			count: z.number().int().min(1).default(5),
			label: z.string().default('initial'),
		})

		const domain = defineSettingsDomain({
			namespace: 'test.update',
			schema: TestSchema,
		})

		const updated = await domain.update({
			count: 99,
			label: 'updated label',
		})

		expect(updated).toEqual({
			count: 99,
			label: 'updated label',
		})
		expect(domain.get()).toEqual({
			count: 99,
			label: 'updated label',
		})

		// Verify database row
		const dbRows = await db.select().from(settings)
		const countRow = dbRows.find(r => r.key === 'test.update.count')
		const labelRow = dbRows.find(r => r.key === 'test.update.label')

		expect(countRow?.value).toBe('99')
		expect(labelRow?.value).toBe('updated label')
	})

	it('should trigger onChange callback on update', async () => {
		const onChangeSpy = vi.fn()
		const TestSchema = z.object({
			active: z.boolean().default(false),
		})

		const domain = new SettingsDomain({
			namespace: 'test.hook',
			schema: TestSchema,
			onChange: onChangeSpy,
		})

		await domain.update({ active: true })

		expect(onChangeSpy).toHaveBeenCalledTimes(1)
		expect(onChangeSpy).toHaveBeenCalledWith({ active: true }, { active: false })
	})

	it('should enforce Zod refinement rules on update', async () => {
		const TestSchema = z.object({
			minVal: z.number().default(10),
			maxVal: z.number().default(100),
		}).refine(data => data.maxVal >= data.minVal, {
			message: 'maxVal must be greater than or equal to minVal',
			path: ['maxVal'],
		})

		const domain = new SettingsDomain({
			namespace: 'test.refine',
			schema: TestSchema,
		})

		await expect(domain.update({ minVal: 200, maxVal: 50 })).rejects.toThrow(
			'maxVal must be greater than or equal to minVal',
		)
	})

	it('should warm up all registered domains in settingsRegistry', async () => {
		await db.insert(settings).values([
			{ key: 'points.currency_name', value: 'gold', updatedAt: new Date() },
			{ key: 'points.gambling.min_bet', value: '25', updatedAt: new Date() },
		])

		await settingsRegistry.warmup()

		const pts = settingsRegistry.getDomain<typeof PointsSettingsSchema>('points')?.get()
		const gmb = settingsRegistry.getDomain<typeof GamblingSettingsSchema>('points.gambling')?.get()

		expect(pts?.currencyName).toBe('gold')
		expect(gmb?.minBet).toBe(25)
	})
})
