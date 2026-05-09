import type { CommandDefinition } from './types'
import { db } from '~~/server/database'
import { commandAliases, commands } from '~~/server/database/schema'

class CommandRegistry {
	private commands = new Map<string, CommandDefinition>()
	private triggerMap = new Map<string, { commandId: string, subcommand?: string, overrideArgs?: string[] }>()

	register(def: CommandDefinition) {
		this.commands.set(def.id, def)
		console.log('[Bot] Registering', def.id, 'module')
	}

	async syncWithDb() {
		const dbCommands = await db.select().from(commands)
		const dbAliases = await db.select().from(commandAliases)

		// Map triggers from DB
		this.triggerMap.clear()

		// 1. Core commands
		for (const def of this.commands.values()) {
			const dbCmd = dbCommands.find(c => c.id === def.id)
			if (dbCmd) {
				this.triggerMap.set(dbCmd.trigger, { commandId: def.id })
			}
			else {
				// Initial sync: Add to DB if missing
				await db.insert(commands).values({
					id: def.id,
					trigger: def.id,
					cost: def.cost ?? 0,
					cooldown: def.cooldown ?? 0,
				})
				this.triggerMap.set(def.id, { commandId: def.id })
			}
		}

		// 2. Aliases
		for (const alias of dbAliases) {
			this.triggerMap.set(alias.trigger, {
				commandId: alias.commandId,
				subcommand: alias.subcommand ?? undefined,
				overrideArgs: alias.overrideArgs ?? undefined,
			})
		}
	}

	getCommand(id: string) {
		return this.commands.get(id)
	}

	resolveTrigger(trigger: string) {
		return this.triggerMap.get(trigger)
	}

	getAllCommands() {
		return Array.from(this.commands.values())
	}
}

export const registry = new CommandRegistry()
