import { registry } from '~~/server/bot/core/registry'
import { templateRegistry } from '~~/server/bot/core/templates'
import { db } from '~~/server/database'
import { commandAliases, commands, commandTemplates } from '~~/server/database/schema'

export default defineEventHandler(async () => {
	// Ensure DB data is fetched in parallel
	const [dbCmds, dbAliases, dbTpls] = await Promise.all([
		db.select().from(commands),
		db.select().from(commandAliases),
		db.select().from(commandTemplates),
	])

	const allCoreCommands = registry.getAllCommands()

	const result = allCoreCommands.map((command) => {
		const dbConfig = dbCmds.find(c => c.id === command.id) || {
			id: command.id,
			trigger: command.id,
			enabled: true,
			cost: command.cost ?? 0,
			globalCooldown: command.globalCooldown ?? 0,
			userCooldown: command.userCooldown ?? 0,
		}

		// Find all registered aliases for this specific command
		const aliases = dbAliases
			.filter(a => a.commandId === command.id)
			.map(a => ({
				id: a.id,
				trigger: a.trigger,
				subcommand: a.subcommand,
				overrideArgs: a.overrideArgs,
			}))

		// Gather template declarations from the root command
		const rootTemplateIds = command.templates ?? []
		const rootTemplates = rootTemplateIds.map((tplId) => {
			const def = templateRegistry.get(tplId)
			const custom = dbTpls.find(t => t.id === tplId)?.template || null
			return {
				id: tplId,
				default: def?.default ?? '',
				custom,
				params: def?.params ?? [],
				description: def?.description ?? '',
			}
		})

		// Recursive helper to gather subcommands and all nested child subcommands
		const buildSubcommandsTree = (subcommandsMap: Record<string, any>, prefix: string): Record<string, any> => {
			const res: Record<string, any> = {}
			for (const [subName, sub] of Object.entries(subcommandsMap)) {
				const subTemplateIds = sub.templates ?? []
				const subTemplates = subTemplateIds.map((tplId: string) => {
					const def = templateRegistry.get(tplId)
					const custom = dbTpls.find(t => t.id === tplId)?.template || null
					return {
						id: tplId,
						default: def?.default ?? '',
						custom,
						params: def?.params ?? [],
						description: def?.description ?? '',
					}
				})

				const subId = `${prefix}.${subName}`
				const subDbConfig = dbCmds.find(c => c.id === subId) || {
					enabled: true,
					cost: 0,
					globalCooldown: 0,
					userCooldown: 0,
					trigger: null,
				}

				res[subName] = {
					id: subId,
					trigger: subDbConfig.trigger,
					description: sub.description,
					usage: sub.usage,
					permission: sub.permission,
					enabled: Boolean(subDbConfig.enabled),
					cost: subDbConfig.cost,
					globalCooldown: subDbConfig.globalCooldown,
					userCooldown: subDbConfig.userCooldown,
					templates: subTemplates,
					hasHandler: Boolean(sub.handler),
					subcommands: sub.subcommands ? buildSubcommandsTree(sub.subcommands, subId) : undefined,
				}
			}
			return res
		}

		const subcommandsData = command.subcommands ? buildSubcommandsTree(command.subcommands, command.id) : {}

		return {
			id: command.id,
			description: command.description,
			usage: command.usage,
			permission: command.permission,
			// Dynamic database parameters
			trigger: dbConfig.trigger,
			enabled: Boolean(dbConfig.enabled),
			cost: dbConfig.cost,
			globalCooldown: dbConfig.globalCooldown,
			userCooldown: dbConfig.userCooldown,
			// Mapped sub-structures
			aliases,
			templates: rootTemplates,
			subcommands: subcommandsData,
		}
	})

	return result
})
