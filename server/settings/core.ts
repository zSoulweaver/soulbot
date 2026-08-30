import type { z } from 'zod'
import { sql } from 'drizzle-orm'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'

export function toSnakeCase(str: string): string {
	return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

export interface SettingsDomainOptions<TSchema extends z.ZodType<Record<string, any>, any, any>> {
	namespace: string
	schema: TSchema
	customKeys?: Partial<Record<string, string>>
	onChange?: (newSettings: z.infer<TSchema>, oldSettings: z.infer<TSchema>) => Promise<void> | void
}

export class SettingsDomain<TSchema extends z.ZodType<Record<string, any>, any, any>> {
	public readonly namespace: string
	public readonly schema: TSchema
	public readonly customKeys: Partial<Record<string, string>>
	public readonly onChange?: (newSettings: z.infer<TSchema>, oldSettings: z.infer<TSchema>) => Promise<void> | void

	private cachedData: z.infer<TSchema>

	constructor(options: SettingsDomainOptions<TSchema>) {
		this.namespace = options.namespace
		this.schema = options.schema
		this.customKeys = options.customKeys ?? {}
		this.onChange = options.onChange

		// Initialize with schema defaults
		try {
			this.cachedData = this.schema.parse({})
		}
		catch {
			this.cachedData = {} as z.infer<TSchema>
		}
	}

	public getObjectSchema(): z.ZodObject<any> {
		let current: any = this.schema
		while (current && current._def) {
			if (current._def.schema) {
				current = current._def.schema
			}
			else if (current._def.innerType) {
				current = current._def.innerType
			}
			else {
				break
			}
		}
		return current as z.ZodObject<any>
	}

	public getDbKey(field: string): string {
		if (this.customKeys[field]) {
			return this.customKeys[field]!
		}
		return `${this.namespace}.${toSnakeCase(field)}`
	}

	public get(): z.infer<TSchema> {
		return this.cachedData
	}

	public loadFromDbRows(rows: { key: string, value: string }[]): void {
		const rawMap = new Map<string, string>()
		for (const row of rows) {
			rawMap.set(row.key, row.value)
		}

		const rawObj: Record<string, any> = {}
		const objSchema = this.getObjectSchema()
		const shape = objSchema.shape

		for (const field of Object.keys(shape)) {
			const dbKey = this.getDbKey(field)
			const legacyUnderscoreKey = dbKey.replace(/\.([a-z0-9_]+)$/, '_$1')
			if (rawMap.has(dbKey)) {
				const rawVal = rawMap.get(dbKey)!
				rawObj[field] = this.coerceValue(rawVal, shape[field])
			}
			else if (rawMap.has(legacyUnderscoreKey)) {
				const rawVal = rawMap.get(legacyUnderscoreKey)!
				rawObj[field] = this.coerceValue(rawVal, shape[field])
			}
		}

		const defaults = (this.schema.parse({}) ?? {}) as Record<string, any>
		const merged = {
			...defaults,
			...rawObj,
		}

		try {
			this.cachedData = this.schema.parse(merged)
		}
		catch (err) {
			botLogger.error({ err, namespace: this.namespace }, 'Failed to parse settings domain from DB')
		}
	}

	public async update(patch: Partial<z.infer<TSchema>>): Promise<z.infer<TSchema>> {
		const oldSettings = { ...(this.cachedData as any) }
		const merged = {
			...(this.cachedData as any),
			...patch,
		}

		const validated = this.schema.parse(merged) as z.infer<TSchema>

		const keysToUpsert: { key: string, value: string, updatedAt: Date }[] = []
		for (const field of Object.keys(patch)) {
			const dbKey = this.getDbKey(field)
			const val = (validated as any)[field]
			if (val !== undefined) {
				keysToUpsert.push({
					key: dbKey,
					value: String(val),
					updatedAt: new Date(),
				})
			}
		}

		if (keysToUpsert.length > 0) {
			await db
				.insert(settings)
				.values(keysToUpsert)
				.onConflictDoUpdate({
					target: settings.key,
					set: {
						value: sql`excluded.value`,
						updatedAt: sql`excluded.updated_at`,
					},
				})
		}

		this.cachedData = validated

		if (this.onChange) {
			try {
				await this.onChange(validated, oldSettings)
			}
			catch (err) {
				botLogger.error({ err, namespace: this.namespace }, 'Error executing onChange hook for settings domain')
			}
		}

		return validated
	}

	private coerceValue(val: string, zodFieldDef: any): any {
		let unwrapped = zodFieldDef
		while (unwrapped) {
			if (unwrapped._def?.innerType) {
				unwrapped = unwrapped._def.innerType
			}
			else if (unwrapped._def?.schema) {
				unwrapped = unwrapped._def.schema
			}
			else if (unwrapped.innerType) {
				unwrapped = unwrapped.innerType
			}
			else if (unwrapped.schema) {
				unwrapped = unwrapped.schema
			}
			else {
				break
			}
		}

		const type = unwrapped?._def?.type || unwrapped?._def?.typeName || unwrapped?.type || unwrapped?.constructor?.name

		if (type === 'ZodBoolean' || type === 'boolean' || unwrapped?.constructor?.name === 'ZodBoolean') {
			return val === 'true' || val === '1'
		}
		if (type === 'ZodNumber' || type === 'number' || unwrapped?.constructor?.name === 'ZodNumber') {
			const num = Number(val)
			return Number.isNaN(num) ? 0 : num
		}
		return val
	}
}
