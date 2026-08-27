import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { botLogger } from '~~/server/utils/logger'
import { getAppSettings, getAppSettingsSync, refreshAppSettingsCache, updateAppSetting } from '~~/server/utils/settings'
import { getStreamerChannelName } from '~~/server/utils/twurple'
import { updateUserPointsAndGambleStats } from './service'

export interface VaultRaider {
	username: string
	displayName: string
	betAmount: number
}

const raiders = new Map<string, VaultRaider>()
let vaultTimeout: NodeJS.Timeout | null = null
let warningTimeout: NodeJS.Timeout | null = null

export function isVaultActive(): boolean {
	const settings = getAppSettingsSync()
	return Number(settings.pointsVaultEndTime) > Date.now()
}

export function getRaiders(): VaultRaider[] {
	return Array.from(raiders.values())
}

export function getRaider(username: string): VaultRaider | undefined {
	return raiders.get(username)
}

export function getTotalPot(): number {
	let total = 0
	for (const raider of raiders.values()) {
		total += raider.betAmount
	}
	return total
}

export function clearVaultTimers(): void {
	if (vaultTimeout) {
		clearTimeout(vaultTimeout)
		vaultTimeout = null
	}
	if (warningTimeout) {
		clearTimeout(warningTimeout)
		warningTimeout = null
	}
}

export async function startVaultRaid(durationSec?: number, commandCtx?: any): Promise<{ success: boolean, endTime: number }> {
	const settings = await getAppSettings()
	const now = Date.now()

	if (Number(settings.pointsVaultEndTime) > now) {
		throw new Error('A Vault Raid is already active')
	}

	const duration = durationSec ?? settings.pointsVaultDuration
	const endTime = now + duration * 1000

	clearVaultTimers()
	raiders.clear()

	await updateAppSetting('points.vault_end_time', String(endTime))
	await refreshAppSettingsCache()

	// Schedule 15-second warning if enabled and duration allows
	if (settings.pointsVaultWarningEnabled && duration > 15) {
		const warningDelay = (duration - 15) * 1000
		warningTimeout = setTimeout(async () => {
			await broadcastVaultWarning()
		}, warningDelay)
	}

	// Schedule end roll
	vaultTimeout = setTimeout(async () => {
		await resolveVaultRaid()
	}, duration * 1000)

	// Broadcast start message
	if (commandCtx) {
		const rendered = await renderCustomTemplate(settings.pointsVaultStartMessage, commandCtx, {
			duration,
			multiplier: settings.pointsVaultWinMultiplier,
			minBet: settings.pointsVaultMinBet,
			maxBet: settings.pointsVaultMaxBet,
		})
		await commandCtx.say(rendered)
	}
	else {
		const channel = await getStreamerChannelName()
		if (channel) {
			const ctx = createTemplateContext(channel)
			const rendered = await renderCustomTemplate(settings.pointsVaultStartMessage, ctx, {
				duration,
				multiplier: settings.pointsVaultWinMultiplier,
				minBet: settings.pointsVaultMinBet,
				maxBet: settings.pointsVaultMaxBet,
			})
			await sendRawChatMessage(channel, rendered)
		}
	}

	botLogger.info(`[Vault Manager] Vault raid started for ${duration}s`)
	return { success: true, endTime }
}

export async function broadcastVaultWarning(): Promise<void> {
	warningTimeout = null
	try {
		const settings = await getAppSettings()
		if (Number(settings.pointsVaultEndTime) <= Date.now()) {
			return
		}

		const channel = await getStreamerChannelName()
		if (channel) {
			const ctx = createTemplateContext(channel)
			const rendered = await renderCustomTemplate(settings.pointsVaultWarningMessage, ctx, {
				secondsLeft: 15,
				raidersCount: raiders.size,
				pot: getTotalPot(),
				multiplier: settings.pointsVaultWinMultiplier,
			})
			await sendRawChatMessage(channel, rendered)
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Vault Manager] Error broadcasting vault warning')
	}
}

export function joinVaultRaid(
	user: { username: string, displayName: string },
	betAmount: number,
): { action: 'joined' | 'updated' | 'opt-out' | 'not-joined', raider?: VaultRaider } {
	if (betAmount === 0) {
		if (raiders.has(user.username)) {
			raiders.delete(user.username)
			return { action: 'opt-out' }
		}
		return { action: 'not-joined' }
	}

	const isUpdate = raiders.has(user.username)
	const raider: VaultRaider = {
		username: user.username,
		displayName: user.displayName,
		betAmount,
	}
	raiders.set(user.username, raider)
	return { action: isUpdate ? 'updated' : 'joined', raider }
}

export async function cancelVaultRaid(cancelledBy?: string, commandCtx?: any): Promise<void> {
	clearVaultTimers()
	raiders.clear()

	try {
		await updateAppSetting('points.vault_end_time', '0')
		await refreshAppSettingsCache()

		if (cancelledBy) {
			if (commandCtx) {
				const rendered = await renderCustomTemplate(
					'The Vault Raid has been cancelled by @$(sender). All bets have been refunded.',
					commandCtx,
					{ sender: cancelledBy },
				)
				await commandCtx.say(rendered)
			}
			else {
				const channel = await getStreamerChannelName()
				if (channel) {
					const ctx = createTemplateContext(channel)
					const rendered = await renderCustomTemplate(
						'The Vault Raid has been cancelled by @$(sender). All bets have been refunded.',
						ctx,
						{ sender: cancelledBy },
					)
					await sendRawChatMessage(channel, rendered)
				}
			}
		}
		botLogger.info('[Vault Manager] Vault raid cancelled')
	}
	catch (err) {
		botLogger.error({ err }, '[Vault Manager] Error cancelling vault raid')
	}
}

export async function resolveVaultRaid(): Promise<{ roll: number, isWin: boolean, raidersCount: number, pot: number, totalWon: number }> {
	clearVaultTimers()

	const settings = await getAppSettings()
	const raidersList = getRaiders()
	const pot = getTotalPot()
	const raidersCount = raidersList.length

	// Clear active end time
	await updateAppSetting('points.vault_end_time', '0')
	await refreshAppSettingsCache()

	// If no one joined, just notify chat
	if (raidersCount === 0) {
		raiders.clear()
		const channel = await getStreamerChannelName()
		if (channel) {
			await sendRawChatMessage(channel, 'The Vault Raid has ended with 0 raiders. The vault remains locked!')
		}
		return { roll: 0, isWin: false, raidersCount: 0, pot: 0, totalWon: 0 }
	}

	// Roll 1 to 100
	const roll = Math.floor(Math.random() * 100) + 1
	const isWin = roll >= settings.pointsVaultWinMinRoll
	let totalWon = 0

	for (const raider of raidersList) {
		if (isWin) {
			const winGain = Math.floor(raider.betAmount * settings.pointsVaultWinMultiplier)
			totalWon += winGain
			await updateUserPointsAndGambleStats(raider.username, winGain, true)
		}
		else {
			await updateUserPointsAndGambleStats(raider.username, -raider.betAmount, false)
		}
	}

	raiders.clear()

	const channel = await getStreamerChannelName()
	if (channel) {
		const ctx = createTemplateContext(channel)
		const template = isWin ? settings.pointsVaultEndWinMessage : settings.pointsVaultEndLoseMessage
		const rendered = await renderCustomTemplate(template, ctx, {
			roll,
			threshold: settings.pointsVaultWinMinRoll,
			raidersCount,
			pot,
			totalWon,
			multiplier: settings.pointsVaultWinMultiplier,
		})
		await sendRawChatMessage(channel, rendered)
	}

	botLogger.info(`[Vault Manager] Vault raid resolved: roll=${roll}, isWin=${isWin}, raiders=${raidersCount}, pot=${pot}, totalWon=${totalWon}`)
	return { roll, isWin, raidersCount, pot, totalWon }
}

export async function initVaultManager(): Promise<void> {
	try {
		const settings = await getAppSettings()
		const endTime = Number(settings.pointsVaultEndTime)
		if (endTime > Date.now()) {
			// Reschedule remaining duration
			const remaining = Math.round((endTime - Date.now()) / 1000)
			await startVaultRaid(remaining)
		}
		else if (endTime > 0) {
			await updateAppSetting('points.vault_end_time', '0')
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Vault Manager] Failed to initialize vault manager')
	}
}
