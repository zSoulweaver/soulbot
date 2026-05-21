import type { CommandDefinition } from './types'
import { db } from '~~/server/database'
import { commandAliases, commands } from '~~/server/database/schema'

class CommandRegistry {
	private commands = new Map<string, CommandDefinition>()
	private triggerMap = new Map<string, { commandId: string, subcommand?: string, overrideArgs?: string[] }>()
	private dbConfigs = new Map<string, typeof commands.$inferSelect>()
	private subcommandTriggers = new Map<string, string>()

	register(def: CommandDefinition) {
		this.commands.set(def.id, def)
		console.log('[Bot] Registering', def.id, 'module')
	}

	async syncWithDb() {
		const dbCommands = await db.select().from(commands)
		const dbAliases = await db.select().from(commandAliases)

		// Clear existing memory caches
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
				}
				await db.insert(commands).values(newRow)
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
						}
						await db.insert(commands).values(newSubRow)
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

		// 2. Dynamic trigger aliases
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
