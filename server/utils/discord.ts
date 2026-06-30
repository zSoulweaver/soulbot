import process from 'node:process'
import { ChannelType, Client, GatewayIntentBits, PermissionFlagsBits } from 'discord.js'
import { botLogger } from './logger'
import { getAppSettings } from './settings'

let discordClient: Client | null = null
let connectPromise: Promise<void> | null = null

export function isDiscordTokenConfigured(): boolean {
	return !!process.env.DISCORD_BOT_TOKEN
}

export function isDiscordConnected(): boolean {
	return !!discordClient && discordClient.isReady()
}

export async function getDiscordGuilds(): Promise<{ id: string, name: string }[]> {
	if (!isDiscordConnected()) {
		return []
	}

	try {
		const guilds = await discordClient!.guilds.fetch()
		return Array.from(guilds.values()).map(g => ({
			id: g.id,
			name: g.name,
		}))
	}
	catch (err) {
		botLogger.error({ err }, '[Discord Bot] Failed to fetch Discord guilds')
		return []
	}
}

export async function stopDiscord(): Promise<void> {
	if (discordClient) {
		try {
			discordClient.destroy()
			botLogger.info('[Discord Bot] Discord client destroyed successfully')
		}
		catch (err) {
			botLogger.error({ err }, '[Discord Bot] Error destroying Discord client')
		}
		discordClient = null
	}
}

export async function startDiscord(): Promise<void> {
	if (process.env.NODE_ENV === 'test') {
		return
	}

	if (isDiscordConnected()) {
		return
	}

	if (connectPromise) {
		return connectPromise
	}

	connectPromise = (async () => {
		// Always clean up previous client
		await stopDiscord()

		if (!isDiscordTokenConfigured()) {
			botLogger.info('[Discord Bot] Discord Bot Token not configured in env. Skipping connection.')
			return
		}

		try {
			botLogger.info('[Discord Bot] Initializing Discord bot client...')
			const client = new Client({
				intents: [
					GatewayIntentBits.Guilds,
					GatewayIntentBits.GuildMembers,
				],
			})

			const readyPromise = new Promise<void>((resolve) => {
				const timeout = setTimeout(() => {
					botLogger.warn('[Discord Bot] Timeout waiting for ready event')
					resolve()
				}, 10000)

				client.once('clientReady', () => {
					clearTimeout(timeout)
					botLogger.info({ tag: client.user?.tag }, '[Discord Bot] Discord bot is logged in and ready')
					resolve()
				})
			})

			client.on('guildMemberAdd', async (member) => {
				try {
					const currentSettings = await getAppSettings()
					if (!currentSettings.discordEnabled || !currentSettings.discordRolesAutoBestowEnabled) {
						return
					}

					if (member.guild.id !== currentSettings.discordGuildId) {
						return
					}

					const roleIds = currentSettings.discordRolesAutoBestowRoles
						.split(',')
						.map(id => id.trim())
						.filter(id => !!id)

					if (roleIds.length > 0) {
						botLogger.info({ userId: member.id, roles: roleIds }, '[Discord Bot] Bestowing roles on member join')
						await member.roles.add(roleIds)
					}
				}
				catch (err) {
					botLogger.error({ err, userId: member.id }, '[Discord Bot] Failed to auto-bestow roles to user')
				}
			})

			await client.login(process.env.DISCORD_BOT_TOKEN)
			await readyPromise
			discordClient = client
		}
		catch (err) {
			botLogger.error({ err }, '[Discord Bot] Failed to connect to Discord')
			discordClient = null
		}
	})()

	try {
		await connectPromise
	}
	finally {
		connectPromise = null
	}
}

export async function getDiscordChannels(): Promise<{ id: string, name: string }[]> {
	if (!isDiscordConnected()) {
		return []
	}

	try {
		const settings = await getAppSettings()
		if (!settings.discordGuildId) {
			return []
		}

		const guild = await discordClient!.guilds.fetch(settings.discordGuildId)
		if (!guild) {
			return []
		}

		const channels = await guild.channels.fetch()
		const list: { id: string, name: string }[] = []
		for (const c of channels.values()) {
			if (c && c.type === ChannelType.GuildText) {
				list.push({
					id: c.id,
					name: c.name,
				})
			}
		}
		return list
	}
	catch (err) {
		botLogger.error({ err }, '[Discord Bot] Failed to fetch Discord channels')
		return []
	}
}

export async function getDiscordRoles(): Promise<{ id: string, name: string, color?: string, isManageable: boolean }[]> {
	if (!isDiscordConnected()) {
		return []
	}

	try {
		const settings = await getAppSettings()
		if (!settings.discordGuildId) {
			return []
		}

		const guild = await discordClient!.guilds.fetch(settings.discordGuildId)
		if (!guild) {
			return []
		}

		const me = guild.members.me || await guild.members.fetchMe()
		const highestRole = me?.roles.highest
		const hasManageRolesPerm = me?.permissions.has(PermissionFlagsBits.ManageRoles) ?? false

		const roles = await guild.roles.fetch()
		const list: { id: string, name: string, color?: string, isManageable: boolean }[] = []
		for (const r of roles.values()) {
			if (r && r.name !== '@everyone' && !r.managed) {
				const isManageable = hasManageRolesPerm && highestRole && r.position < highestRole.position
				list.push({
					id: r.id,
					name: r.name,
					color: r.hexColor !== '#000000' ? r.hexColor : undefined,
					isManageable: !!isManageable,
				})
			}
		}
		return list
	}
	catch (err) {
		botLogger.error({ err }, '[Discord Bot] Failed to fetch Discord roles')
		return []
	}
}

export async function sendDiscordMessage(channelId: string, content: string): Promise<boolean> {
	const settings = await getAppSettings()
	if (!settings.discordEnabled) {
		return false
	}

	if (!isDiscordConnected()) {
		botLogger.warn({ channelId }, '[Discord Bot] Cannot send message: Discord not connected')
		return false
	}

	try {
		const channel = await discordClient!.channels.fetch(channelId)
		if (channel && channel.type === ChannelType.GuildText) {
			await channel.send(content)
			return true
		}
		botLogger.warn({ channelId }, '[Discord Bot] Target channel is not a text channel or not found')
		return false
	}
	catch (err) {
		botLogger.error({ err, channelId }, '[Discord Bot] Failed to send message to channel')
		return false
	}
}
