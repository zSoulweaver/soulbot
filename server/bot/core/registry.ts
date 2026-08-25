import type { CommandDefinition, CommandPermission } from './types'
import { renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { db } from '~~/server/database'
import { commandAliases, commands, customCommands } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'

class CommandRegistry {
	private commands = new Map<string, CommandDefinition>()
	private triggerMap = new Map<string, { commandId: string, subcommand?: string, overrideArgs?: string[] }>()
	private dbConfigs = new Map<string, typeof commands.$inferSelect>()
	private subcommandTriggers = new Map<string, string>()
	private syncPromise: Promise<void> | null = null

	register(definition: CommandDefinition | CommandDefinition[]) {
		if (Array.isArray(definition)) {
			for (const def of definition) {
				this.register(def)
			}
			return
		}
		this.commands.set(definition.id, definition)
		botLogger.info('Registering %s module', definition.id)
	}

	async syncWithDb(): Promise<void> {
		if (this.syncPromise) {
			return this.syncPromise
		}
		this.syncPromise = this.performSyncWithDb().finally(() => {
			this.syncPromise = null
		})
		return this.syncPromise
	}

	private async performSyncWithDb() {
		const dbCommands = await db.select().from(commands)
		const dbAliases = await db.select().from(commandAliases)

		// Clear existing memory caches
		this.triggerMap.clear()
		this.dbConfigs.clear()
		this.subcommandTriggers.clear()

		// Clear existing dynamic custom commands from registry map before rebuilding
		for (const [key] of this.commands.entries()) {
			if (key.startsWith('custom:')) {
				this.commands.delete(key)
			}
		}

		const dbCustomCommands = await db.select().from(customCommands).catch(() => [])

		// Register custom commands dynamically in memory
		for (const custom of dbCustomCommands) {
			const commandId = `custom:${custom.id}`
			this.commands.set(commandId, {
				id: commandId,
				description: custom.description || `Custom command !${custom.trigger}`,
				permission: custom.permission as CommandPermission,
				cost: custom.cost,
				globalCooldown: custom.globalCooldown,
				userCooldown: custom.userCooldown,
				handler: async (ctx) => {
					const response = await renderCustomTemplate(custom.response, ctx)
					if (response) {
						const lines = response.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
						await Promise.all(lines.map(line => ctx.say(line)))
					}
				},
			})
		}

		// Core commands & database config synchronization
		for (const def of this.commands.values()) {
			if (def.id.startsWith('custom:')) {
				const custom = dbCustomCommands.find(c => `custom:${c.id}` === def.id)
				if (custom) {
					const mockDbRow = {
						id: def.id,
						trigger: custom.trigger,
						enabled: custom.enabled,
						cost: custom.cost,
						cooldown: 0,
						globalCooldown: custom.globalCooldown,
						userCooldown: custom.userCooldown,
						permission: custom.permission,
						allowWhisper: false,
						whisperSilentResponse: false,
						hidden: Boolean(custom.hidden),
					}
					// Populate dbConfigs map so other middlewares (cooldown, cost, role checks) read the config
					this.dbConfigs.set(def.id, mockDbRow as any)

					if (custom.enabled) {
						this.triggerMap.set(custom.trigger.toLowerCase(), { commandId: def.id })
					}
				}
				continue
			}
			let dbCmd = dbCommands.find(c => c.id === def.id)
			if (!dbCmd) {
				const newRow = {
					id: def.id,
					trigger: def.id,
					enabled: true,
					cost: def.cost ?? 0,
					cooldown: def.cooldown ?? 0,
					globalCooldown: def.globalCooldown ?? 0,
					userCooldown: def.userCooldown ?? 0,
					permission: null,
					allowWhisper: def.allowWhisper ?? false,
					whisperSilentResponse: false,
					hidden: false,
				}
				await db.insert(commands).values(newRow).onConflictDoNothing()
				dbCmd = { ...newRow } as any
			}

			this.dbConfigs.set(def.id, dbCmd!)

			// Only map the trigger if the command itself is active/enabled in the DB
			if (dbCmd!.enabled) {
				const triggerWord = dbCmd!.trigger || def.id
				this.triggerMap.set(triggerWord, { commandId: def.id })
			}

			// Synchronize all nested subcommands recursively in Drizzle SQLite
			const syncSubcommandsRecursive = async (subcommandsMap: Record<string, any>, prefix: string) => {
				for (const [subKey, subValue] of Object.entries(subcommandsMap)) {
					const subId = `${prefix}.${subKey}`
					let dbSubCmd = dbCommands.find(c => c.id === subId)
					if (!dbSubCmd) {
						const newSubRow = {
							id: subId,
							trigger: null, // Subcommands do not have unique root triggers
							enabled: true,
							cost: 0,
							cooldown: 0,
							globalCooldown: 0,
							userCooldown: 0,
							permission: null,
							allowWhisper: subValue.allowWhisper ?? false,
							whisperSilentResponse: false,
							hidden: false,
						}
						await db.insert(commands).values(newSubRow).onConflictDoNothing()
						dbSubCmd = { ...newSubRow } as any
					}
					this.dbConfigs.set(subId, dbSubCmd!)

					// Map custom trigger word if defined in the database
					if (dbSubCmd!.enabled && dbSubCmd!.trigger) {
						this.subcommandTriggers.set(`${prefix}:${dbSubCmd!.trigger.toLowerCase()}`, subKey)
					}

					if (subValue.subcommands) {
						await syncSubcommandsRecursive(subValue.subcommands, subId)
					}
				}
			}

			if (def.subcommands) {
				await syncSubcommandsRecursive(def.subcommands, def.id)
			}
		}

		// Dynamic trigger aliases
		for (const alias of dbAliases) {
			const targetDbCmd = this.dbConfigs.get(alias.commandId)
			// Only register alias if the target command exists and is enabled
			if (targetDbCmd && targetDbCmd.enabled) {
				this.triggerMap.set(alias.trigger, {
					commandId: alias.commandId,
					subcommand: alias.subcommand ?? undefined,
					overrideArgs: alias.overrideArgs ?? undefined,
				})
			}
		}
	}

	getCommand(id: string) {
		return this.commands.get(id)
	}

	getCommandConfig(id: string) {
		return this.dbConfigs.get(id)
	}

	resolveTrigger(trigger: string) {
		return this.triggerMap.get(trigger)
	}

	resolveSubcommandKey(parentPrefix: string, triggerWord: string): string | null {
		return this.subcommandTriggers.get(`${parentPrefix}:${triggerWord.toLowerCase()}`) || null
	}

	getAllCommands() {
		return Array.from(this.commands.values())
	}
}

export const registry = new CommandRegistry()
