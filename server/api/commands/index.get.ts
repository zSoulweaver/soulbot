import { registry } from '~~/server/bot/core/registry'
import { templateRegistry } from '~~/server/bot/core/templates'
import { db } from '~~/server/database'
import { commandAliases, commands, commandTemplates } from '~~/server/database/schema'

export default defineEventHandler(async () => {
	// Ensure DB data is fetched in parallel using descriptive names
	const [databaseCommands, databaseAliases, databaseTemplates] = await Promise.all([
		db.select().from(commands),
		db.select().from(commandAliases),
		db.select().from(commandTemplates),
	])

	const allCoreCommands = registry.getAllCommands()

	const result = allCoreCommands.map((command) => {
		const databaseConfig = databaseCommands.find(cmd => cmd.id === command.id) || {
			id: command.id,
			trigger: command.id,
			enabled: true,
			cost: command.cost ?? 0,
			globalCooldown: command.globalCooldown ?? 0,
			userCooldown: command.userCooldown ?? 0,
		}

		// Find all registered aliases for this specific command
		const aliases = databaseAliases
			.filter(alias => alias.commandId === command.id)
			.map(alias => ({
				id: alias.id,
				trigger: alias.trigger,
				subcommand: alias.subcommand,
				overrideArgs: alias.overrideArgs,
			}))

		// Gather template declarations from the root command
		const rootTemplateIds = command.templates ?? []
		const rootTemplates = rootTemplateIds.map((templateId) => {
			const definition = templateRegistry.get(templateId)
			const custom = databaseTemplates.find(tpl => tpl.id === templateId)?.template || null
			return {
				id: templateId,
				default: definition?.default ?? '',
				custom,
				params: definition?.params ?? [],
			}
		})

		// Recursive helper to gather subcommands and all nested child subcommands
		const buildSubcommandsTree = (subcommandsMap: Record<string, any>, prefix: string): Record<string, any> => {
			const subcommandsTree: Record<string, any> = {}
			for (const [subcommandName, subcommand] of Object.entries(subcommandsMap)) {
				const subcommandTemplateIds = subcommand.templates ?? []
				const subcommandTemplates = subcommandTemplateIds.map((templateId: string) => {
					const definition = templateRegistry.get(templateId)
					const custom = databaseTemplates.find(tpl => tpl.id === templateId)?.template || null
					return {
						id: templateId,
						default: definition?.default ?? '',
						custom,
						params: definition?.params ?? [],
					}
				})

				const subcommandId = `${prefix}.${subcommandName}`
				const subcommandDbConfig = databaseCommands.find(cmd => cmd.id === subcommandId) || {
					enabled: true,
					cost: 0,
					globalCooldown: 0,
					userCooldown: 0,
					trigger: null,
				}

				subcommandsTree[subcommandName] = {
					id: subcommandId,
					trigger: subcommandDbConfig.trigger,
					activeTrigger: subcommandDbConfig.trigger || subcommandName,
					description: subcommand.description,
					usage: subcommand.usage,
					permission: subcommand.permission,
					enabled: Boolean(subcommandDbConfig.enabled),
					cost: subcommandDbConfig.cost,
					globalCooldown: subcommandDbConfig.globalCooldown,
					userCooldown: subcommandDbConfig.userCooldown,
					templates: subcommandTemplates,
					hasHandler: Boolean(subcommand.handler),
					subcommands: subcommand.subcommands ? buildSubcommandsTree(subcommand.subcommands, subcommandId) : undefined,
				}
			}
			return subcommandsTree
		}

		const subcommandsData = command.subcommands ? buildSubcommandsTree(command.subcommands, command.id) : {}

		return {
			id: command.id,
			description: command.description,
			usage: command.usage,
			permission: command.permission,
			// Dynamic database parameters
			trigger: databaseConfig.trigger,
			activeTrigger: databaseConfig.trigger || command.id,
			enabled: Boolean(databaseConfig.enabled),
			cost: databaseConfig.cost,
			globalCooldown: databaseConfig.globalCooldown,
			userCooldown: databaseConfig.userCooldown,
			// Mapped sub-structures
			aliases,
			templates: rootTemplates,
			subcommands: subcommandsData,
		}
	})

	return result
})
