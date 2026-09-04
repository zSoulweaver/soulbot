import { and, eq, gte, sql } from 'drizzle-orm'
import { templateRegistry } from '~~/server/bot/core/templates'
import { createTemplateContext, renderCustomTemplate } from '~~/server/bot/core/variables-engine'
import { db } from '~~/server/database'
import { users, vaultRaiders } from '~~/server/database/schema'
import { vaultSettings } from '~~/server/settings'
import { sendRawChatMessage } from '~~/server/utils/chat'
import { botLogger } from '~~/server/utils/logger'
import { getStreamerChannelName } from '~~/server/utils/twurple'

export interface VaultRaider {
	userId: string
	username: string
	displayName: string
	betAmount: number
}

let vaultTimeout: NodeJS.Timeout | null = null
let warningTimeout: NodeJS.Timeout | null = null

export function isVaultActive(): boolean {
	const settings = vaultSettings.get()
	return Number(settings.endTime) > Date.now()
}

export async function getRaiders(): Promise<VaultRaider[]> {
	const rows = await db.select().from(vaultRaiders)
	return rows.map(r => ({
		userId: r.userId,
		username: r.username,
		displayName: r.displayName,
		betAmount: r.betAmount,
	}))
}

export async function getRaider(username: string): Promise<VaultRaider | undefined> {
	const [row] = await db.select().from(vaultRaiders).where(eq(vaultRaiders.username, username.toLowerCase()))
	if (!row) {
		return undefined
	}
	return {
		userId: row.userId,
		username: row.username,
		displayName: row.displayName,
		betAmount: row.betAmount,
	}
}

export async function getTotalPot(): Promise<number> {
	const rows = await db.select().from(vaultRaiders)
	return rows.reduce((sum, r) => sum + r.betAmount, 0)
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

export async function startVaultRaid(durationSec?: number, commandCtx?: any, isResume = false): Promise<{ success: boolean, endTime: number }> {
	const settings = vaultSettings.get()
	const now = Date.now()

	if (!isResume && Number(settings.endTime) > now) {
		throw new Error('A Vault Raid is already active')
	}

	const duration = durationSec ?? settings.duration
	const endTime = now + duration * 1000

	clearVaultTimers()

	if (!isResume) {
		// Clean any stale raiders if starting fresh
		await db.delete(vaultRaiders)
	}

	await vaultSettings.update({ endTime })

	// Schedule 15-second warning if enabled and duration allows
	if (settings.warningEnabled && duration > 15) {
		const warningDelay = (duration - 15) * 1000
		warningTimeout = setTimeout(async () => {
			await broadcastVaultWarning()
		}, warningDelay)
	}

	// Schedule end roll
	vaultTimeout = setTimeout(async () => {
		await resolveVaultRaid()
	}, duration * 1000)

	if (!isResume) {
		// Broadcast start message
		const template = templateRegistry.get('vault.start')?.template || ''
		if (commandCtx) {
			const rendered = await renderCustomTemplate(template, commandCtx, {
				duration,
				multiplier: settings.winMultiplier,
				minBet: settings.minBet,
				maxBet: settings.maxBet,
			})
			await commandCtx.say(rendered)
		}
		else {
			const channel = await getStreamerChannelName()
			if (channel) {
				const ctx = createTemplateContext(channel)
				const rendered = await renderCustomTemplate(template, ctx, {
					duration,
					multiplier: settings.winMultiplier,
					minBet: settings.minBet,
					maxBet: settings.maxBet,
				})
				await sendRawChatMessage(channel, rendered)
			}
		}
	}

	botLogger.info(`[Vault Manager] Vault raid ${isResume ? 'resumed' : 'started'} for ${duration}s`)
	return { success: true, endTime }
}

export async function broadcastVaultWarning(): Promise<void> {
	warningTimeout = null
	try {
		const settings = vaultSettings.get()
		if (Number(settings.endTime) <= Date.now()) {
			return
		}

		const raidersList = await getRaiders()
		const pot = raidersList.reduce((sum, r) => sum + r.betAmount, 0)

		const channel = await getStreamerChannelName()
		if (channel) {
			const ctx = createTemplateContext(channel)
			const template = templateRegistry.get('vault.warning')?.template || ''
			const rendered = await renderCustomTemplate(template, ctx, {
				secondsLeft: 15,
				raidersCount: raidersList.length,
				pot,
				multiplier: settings.winMultiplier,
			})
			await sendRawChatMessage(channel, rendered)
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Vault Manager] Error broadcasting vault warning')
	}
}

export async function joinVaultRaid(
	user: { id: string, username: string, displayName: string },
	betAmount: number,
): Promise<{ action: 'joined' | 'updated' | 'opt-out' | 'not-joined' | 'not-enough-points', raider?: VaultRaider, currentPoints?: number }> {
	const now = new Date()

	return db.transaction((tx) => {
		const [existing] = tx.select().from(vaultRaiders).where(eq(vaultRaiders.userId, user.id)).all()

		if (betAmount === 0) {
			if (existing) {
				// Refund escrowed bet
				tx.update(users)
					.set({
						points: sql`${users.points} + ${existing.betAmount}`,
						updatedAt: now,
					})
					.where(eq(users.id, user.id))
					.run()

				tx.delete(vaultRaiders).where(eq(vaultRaiders.userId, user.id)).run()
				return { action: 'opt-out' }
			}
			return { action: 'not-joined' }
		}

		const existingBet = existing ? existing.betAmount : 0
		const delta = betAmount - existingBet

		if (delta > 0) {
			// Deduct delta atomically
			const [senderUpdate] = tx.update(users)
				.set({
					points: sql`${users.points} - ${delta}`,
					updatedAt: now,
				})
				.where(and(eq(users.id, user.id), gte(users.points, delta)))
				.returning()
				.all()

			if (!senderUpdate) {
				const [userRow] = tx.select().from(users).where(eq(users.id, user.id)).all()
				return { action: 'not-enough-points', currentPoints: userRow?.points ?? 0 }
			}
		}
		else if (delta < 0) {
			// Refund excess bet
			const refund = Math.abs(delta)
			tx.update(users)
				.set({
					points: sql`${users.points} + ${refund}`,
					updatedAt: now,
				})
				.where(eq(users.id, user.id))
				.run()
		}

		const raider: VaultRaider = {
			userId: user.id,
			username: user.username.toLowerCase(),
			displayName: user.displayName,
			betAmount,
		}

		tx.insert(vaultRaiders)
			.values({
				userId: user.id,
				username: user.username.toLowerCase(),
				displayName: user.displayName,
				betAmount,
				createdAt: now,
			})
			.onConflictDoUpdate({
				target: vaultRaiders.userId,
				set: {
					betAmount,
					username: user.username.toLowerCase(),
					displayName: user.displayName,
				},
			})
			.run()

		return { action: existing ? 'updated' : 'joined', raider }
	})
}

export async function cancelVaultRaid(cancelledBy?: string, commandCtx?: any): Promise<void> {
	clearVaultTimers()

	const now = new Date()
	db.transaction((tx) => {
		const allRaiders = tx.select().from(vaultRaiders).all()
		for (const raider of allRaiders) {
			tx.update(users)
				.set({
					points: sql`${users.points} + ${raider.betAmount}`,
					updatedAt: now,
				})
				.where(eq(users.id, raider.userId))
				.run()
		}
		tx.delete(vaultRaiders).run()
	})

	try {
		await vaultSettings.update({ endTime: 0 })

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
		botLogger.info('[Vault Manager] Vault raid cancelled and all bets refunded')
	}
	catch (err) {
		botLogger.error({ err }, '[Vault Manager] Error cancelling vault raid')
	}
}

export async function resolveVaultRaid(): Promise<{ roll: number, isWin: boolean, raidersCount: number, pot: number, totalWon: number }> {
	clearVaultTimers()

	const settings = vaultSettings.get()
	const raidersList = await db.select().from(vaultRaiders)
	const pot = raidersList.reduce((sum, r) => sum + r.betAmount, 0)
	const raidersCount = raidersList.length

	// Clear active end time
	await vaultSettings.update({ endTime: 0 })

	// If no one joined, just notify chat
	if (raidersCount === 0) {
		const channel = await getStreamerChannelName()
		if (channel) {
			await sendRawChatMessage(channel, 'The Vault Raid has ended with 0 raiders. The vault remains locked!')
		}
		return { roll: 0, isWin: false, raidersCount: 0, pot: 0, totalWon: 0 }
	}

	// Roll 1 to 100
	const roll = Math.floor(Math.random() * 100) + 1
	const isWin = roll >= settings.winMinRoll
	let totalWon = 0
	const now = new Date()

	db.transaction((tx) => {
		for (const raider of raidersList) {
			if (isWin) {
				const winGain = Math.floor(raider.betAmount * settings.winMultiplier)
				const payoutTotal = raider.betAmount + winGain
				totalWon += winGain

				tx.update(users)
					.set({
						points: sql`${users.points} + ${payoutTotal}`,
						gambleWins: sql`${users.gambleWins} + 1`,
						gambleNetPoints: sql`${users.gambleNetPoints} + ${winGain}`,
						updatedAt: now,
					})
					.where(eq(users.id, raider.userId))
					.run()
			}
			else {
				// Bet was already deducted into escrow on join! Simply update loss statistics
				tx.update(users)
					.set({
						gambleLosses: sql`${users.gambleLosses} + 1`,
						gambleNetPoints: sql`${users.gambleNetPoints} - ${raider.betAmount}`,
						updatedAt: now,
					})
					.where(eq(users.id, raider.userId))
					.run()
			}
		}
		tx.delete(vaultRaiders).run()
	})

	const channel = await getStreamerChannelName()
	if (channel) {
		const ctx = createTemplateContext(channel)
		const template = (isWin ? templateRegistry.get('vault.win') : templateRegistry.get('vault.lose'))?.template || ''
		const rendered = await renderCustomTemplate(template, ctx, {
			roll,
			threshold: settings.winMinRoll,
			raidersCount,
			pot,
			totalWon,
			multiplier: settings.winMultiplier,
		})
		await sendRawChatMessage(channel, rendered)
	}

	botLogger.info(`[Vault Manager] Vault raid resolved: roll=${roll}, isWin=${isWin}, raiders=${raidersCount}, pot=${pot}, totalWon=${totalWon}`)
	return { roll, isWin, raidersCount, pot, totalWon }
}

export async function initVaultManager(): Promise<void> {
	try {
		const settings = vaultSettings.get()
		const endTime = Number(settings.endTime)
		const now = Date.now()
		const existingRaiders = await db.select().from(vaultRaiders)

		if (endTime > now) {
			// Reschedule remaining duration
			const remaining = Math.round((endTime - now) / 1000)
			await startVaultRaid(remaining, undefined, true)
		}
		else {
			// If raid expired while offline, auto-refund all escrowed bets
			if (existingRaiders.length > 0) {
				const nowDate = new Date()
				db.transaction((tx) => {
					for (const raider of existingRaiders) {
						tx.update(users)
							.set({
								points: sql`${users.points} + ${raider.betAmount}`,
								updatedAt: nowDate,
							})
							.where(eq(users.id, raider.userId))
							.run()
					}
					tx.delete(vaultRaiders).run()
				})
				botLogger.info('[Vault Manager] Refunded %d raiders from interrupted Vault raid upon boot.', existingRaiders.length)
			}

			if (endTime > 0) {
				await vaultSettings.update({ endTime: 0 })
			}
		}
	}
	catch (err) {
		botLogger.error({ err }, '[Vault Manager] Failed to initialize vault manager')
	}
}
