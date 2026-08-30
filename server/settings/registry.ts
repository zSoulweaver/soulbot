import type { z } from 'zod'
import type { SettingsDomainOptions } from './core'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'
import { SettingsDomain } from './core'

class SettingsRegistry {
	private domains = new Map<string, SettingsDomain<any>>()
	private warmupPromise: Promise<void> | null = null

	public register<TSchema extends z.ZodType<Record<string, any>, any, any>>(
		domain: SettingsDomain<TSchema>,
	): SettingsDomain<TSchema> {
		this.domains.set(domain.namespace, domain)
		return domain
	}

	public getDomain<TSchema extends z.ZodType<Record<string, any>, any, any> = z.ZodType<Record<string, any>>>(
		namespace: string,
	): SettingsDomain<TSchema> | undefined {
		return this.domains.get(namespace) as SettingsDomain<TSchema> | undefined
	}

	public getAllDomains(): SettingsDomain<any>[] {
		return Array.from(this.domains.values())
	}

	public async warmup(): Promise<void> {
		if (this.warmupPromise) {
			return this.warmupPromise
		}

		this.warmupPromise = this.performWarmup().finally(() => {
			this.warmupPromise = null
		})

		return this.warmupPromise
	}

	private async performWarmup(): Promise<void> {
		try {
			const dbSettings = await db.select().from(settings)
			for (const domain of this.domains.values()) {
				domain.loadFromDbRows(dbSettings)
			}
			botLogger.info('Settings registry warmed up (%d domains loaded).', this.domains.size)
		}
		catch (err) {
			botLogger.error({ err }, 'Failed to warm up settings registry from database')
		}
	}
}

export const settingsRegistry = new SettingsRegistry()

export function defineSettingsDomain<TSchema extends z.ZodType<Record<string, any>, any, any>>(
	options: SettingsDomainOptions<TSchema>,
): SettingsDomain<TSchema> {
	const domain = new SettingsDomain(options)
	return settingsRegistry.register(domain)
}
