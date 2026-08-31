import { asc } from 'drizzle-orm'
import { registry } from '~~/server/bot/core/registry'
import { db } from '~~/server/database'
import { commandAliases, commands, customCommands } from '~~/server/database/schema'
import { botLogger } from '~~/server/utils/logger'

export async function clearCommandsDirectoryCache(): Promise<void> {
	try {
		const storage = useStorage('cache')
		const keys = await storage.getKeys('nitro:handlers:commands-directory')
		for (const key of keys) {
			await storage.removeItem(key)
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Commands Directory] Failed to clear directory cache')
	}
}

export default defineCachedEventHandler(
	async (event) => {
		const session = await getUserSession(event)
		const userRole = session?.user?.role
		const isPrivileged = Boolean(userRole && ['moderator', 'admin', 'caster'].includes(userRole))

		const [databaseCommands, databaseAliases, databaseCustomCommands] = await Promise.all([
			db.select().from(commands),
			db.select().from(commandAliases),
			db.select().from(customCommands).orderBy(asc(customCommands.trigger)),
		])

		const allCoreCommands = registry.getAllCommands()

		const publicCoreCommands: any[] = []

		for (const command of allCoreCommands) {
			const dbConfig = databaseCommands.find(cmd => cmd.id === command.id) || {
				id: command.id,
				trigger: command.id,
				enabled: true,
				cost: command.cost ?? 0,
				globalCooldown: command.globalCooldown ?? 0,
				userCooldown: command.userCooldown ?? 0,
				permission: null,
				allowWhisper: false,
				whisperSilentResponse: false,
				hidden: false,
			}

			// Exclude disabled commands for all users
			if (!dbConfig.enabled) {
				continue
			}

			const isHidden = Boolean(dbConfig.hidden)
			const permission = dbConfig.permission || command.permission || 'everyone'

			// If viewer is not privileged and root command is hidden or not public
			if (!isPrivileged && (isHidden || permission !== 'everyone')) {
				continue
			}

			// Subcommands builder & filtering
			const buildSubcommandsTree = (subcommandsMap: Record<string, any>, prefix: string, relativePathPrefix = ''): Record<string, any> => {
				const subcommandsTree: Record<string, any> = {}

				for (const [subcommandName, subcommand] of Object.entries(subcommandsMap)) {
					const subcommandId = `${prefix}.${subcommandName}`
					const currentRelativePath = relativePathPrefix ? `${relativePathPrefix}.${subcommandName}` : subcommandName
					const subDbConfig = databaseCommands.find(cmd => cmd.id === subcommandId) || {
						enabled: true,
						cost: 0,
						globalCooldown: 0,
						userCooldown: 0,
						trigger: null,
						permission: null,
						allowWhisper: false,
						whisperSilentResponse: false,
						hidden: false,
					}

					// Exclude disabled subcommands
					if (!subDbConfig.enabled) {
						continue
					}

					const subHidden = Boolean(subDbConfig.hidden)
					const subPermission = subDbConfig.permission || subcommand.permission || 'everyone'

					if (!isPrivileged && (subHidden || subPermission !== 'everyone')) {
						continue
					}

					const nestedSubcommands = subcommand.subcommands
						? buildSubcommandsTree(subcommand.subcommands, subcommandId, currentRelativePath)
						: undefined

					// If this is purely a route group (no handler) and has no visible children, skip it
					if (!subcommand.handler && (!nestedSubcommands || Object.keys(nestedSubcommands).length === 0)) {
						continue
					}

					const subAliases = databaseAliases
						.filter(alias => alias.commandId === command.id && alias.subcommand === currentRelativePath)
						.map(alias => ({
							id: alias.id,
							trigger: alias.trigger,
							subcommand: alias.subcommand,
							overrideArgs: alias.overrideArgs,
						}))

					subcommandsTree[subcommandName] = {
						id: subcommandId,
						trigger: subDbConfig.trigger,
						activeTrigger: subDbConfig.trigger || subcommandName,
						description: subcommand.description,
						usage: subcommand.usage,
						permission: subPermission,
						cost: subDbConfig.cost,
						hidden: subHidden,
						hasHandler: Boolean(subcommand.handler),
						aliases: subAliases,
						subcommands: nestedSubcommands && Object.keys(nestedSubcommands).length > 0 ? nestedSubcommands : undefined,
					}
				}

				return subcommandsTree
			}

			const subcommandsData = command.subcommands ? buildSubcommandsTree(command.subcommands, command.id) : {}

			// Filter root-level aliases for this command
			const rootAliases = databaseAliases
				.filter(alias => alias.commandId === command.id && (!alias.subcommand || alias.subcommand === ''))
				.map(alias => ({
					id: alias.id,
					trigger: alias.trigger,
					subcommand: null,
					overrideArgs: alias.overrideArgs,
				}))

			publicCoreCommands.push({
				id: command.id,
				type: 'core' as const,
				trigger: dbConfig.trigger,
				activeTrigger: dbConfig.trigger || command.id,
				description: command.description,
				usage: command.usage,
				permission,
				cost: dbConfig.cost,
				hidden: isHidden,
				aliases: rootAliases,
				subcommands: subcommandsData,
			})
		}

		// Process Custom Commands
		const publicCustomCommands: any[] = []

		for (const custom of databaseCustomCommands) {
			if (!custom.enabled) {
				continue
			}

			const isHidden = Boolean(custom.hidden)
			const permission = custom.permission || 'everyone'

			if (!isPrivileged && (isHidden || permission !== 'everyone')) {
				continue
			}

			publicCustomCommands.push({
				id: custom.id,
				type: 'custom' as const,
				trigger: custom.trigger,
				activeTrigger: custom.trigger,
				description: custom.description,
				usage: `!${custom.trigger}`,
				permission,
				cost: custom.cost,
				hidden: isHidden,
				aliases: [],
				subcommands: {},
			})
		}

		// Combine and sort alphabetically
		const allCommands = [...publicCoreCommands, ...publicCustomCommands].sort((a, b) =>
			a.activeTrigger.localeCompare(b.activeTrigger),
		)

		return allCommands
	},
	{
		maxAge: 300,
		swr: false,
		name: 'commands-directory',
		getKey: async (event) => {
			const session = await getUserSession(event)
			const role = session?.user?.role
			const isPrivileged = role && ['moderator', 'admin', 'caster'].includes(role)
			return isPrivileged ? 'privileged' : 'public'
		},
	},
)
