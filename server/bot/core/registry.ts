import type { CommandDefinition, CommandTarget } from './types'
import { db } from '~~/server/database'
import { commandAliases, commands, customCommands } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'

class CommandRegistry {
	private commands = new Map<string, CommandDefinition>()
	private triggerMap = new Map<string, CommandTarget>()
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
		const dbCustomCommands = await db.select().from(customCommands).catch(() => [])

		// Clear only dynamic runtime trigger and config caches (preserving static code definitions)
		this.triggerMap.clear()
		this.dbConfigs.clear()
		this.subcommandTriggers.clear()

		// 1. Core commands & database config synchronization
		for (const def of this.commands.values()) {
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

			// Map root trigger if active
			if (dbCmd!.enabled) {
				const triggerWord = (dbCmd!.trigger || def.id).toLowerCase()
				this.triggerMap.set(triggerWord, {
					type: 'core',
					commandId: def.id,
					def,
					config: dbCmd!,
				})
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

		// 2. Dynamic trigger aliases for core commands
		for (const alias of dbAliases) {
			const targetDbCmd = this.dbConfigs.get(alias.commandId)
			const def = this.commands.get(alias.commandId)
			// Only register alias if the target command exists and is enabled
			if (targetDbCmd && targetDbCmd.enabled && def) {
				this.triggerMap.set(alias.trigger.toLowerCase(), {
					type: 'core',
					commandId: alias.commandId,
					def,
					config: targetDbCmd,
					subcommand: alias.subcommand ?? undefined,
					overrideArgs: alias.overrideArgs ?? undefined,
				})
			}
		}

		// 3. Dynamic custom commands from database
		for (const custom of dbCustomCommands) {
			if (custom.enabled) {
				this.triggerMap.set(custom.trigger.toLowerCase(), {
					type: 'custom',
					record: custom,
				})
			}
		}
	}

	getCommand(id: string): CommandDefinition | undefined {
		return this.commands.get(id)
	}

	getCommandConfig(id: string): typeof commands.$inferSelect | undefined {
		return this.dbConfigs.get(id)
	}

	resolveTrigger(trigger: string): CommandTarget | undefined {
		return this.triggerMap.get(trigger.toLowerCase())
	}

	resolveSubcommandKey(parentPrefix: string, triggerWord: string): string | null {
		return this.subcommandTriggers.get(`${parentPrefix}:${triggerWord.toLowerCase()}`) || null
	}

	getAllCommands(): CommandDefinition[] {
		return Array.from(this.commands.values())
	}
}

export const registry = new CommandRegistry()
