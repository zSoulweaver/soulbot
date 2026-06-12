import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/database'
import { settings } from '~~/server/database/schema'
import { requireUserRole } from '~~/server/utils/auth'
import { refreshAppSettingsCache } from '~~/server/utils/settings'

const saveSpotifySettingsSchema = z.object({
	active: z.boolean(),
	pointsCost: z.number().int().min(0),
	maxLength: z.number().int().min(0),
	maxQueue: z.number().int().min(0),
	maxUserRequests: z.number().int().min(0),
	modsBypassLimits: z.boolean(),
	followersOnly: z.boolean(),
	permitExplicit: z.boolean(),
	offlineOverride: z.boolean(),
	targetPlaylist: z.string(),
	targetPlaylistName: z.string(),
	allowModerators: z.boolean(),
	whisperNotifications: z.boolean(),
})

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'caster')
	const body = await readBody(event)
	const parsed = saveSpotifySettingsSchema.safeParse(body)

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid Spotify settings data',
			data: parsed.error.format(),
		})
	}

	const d = parsed.data

	const keysToUpsert = [
		{ key: 'spotify.sr.enabled', value: String(d.active), updatedAt: new Date() },
		{ key: 'spotify.sr.points_cost', value: String(d.pointsCost), updatedAt: new Date() },
		{ key: 'spotify.sr.max_length', value: String(d.maxLength), updatedAt: new Date() },
		{ key: 'spotify.sr.max_queue', value: String(d.maxQueue), updatedAt: new Date() },
		{ key: 'spotify.sr.max_user_requests', value: String(d.maxUserRequests), updatedAt: new Date() },
		{ key: 'spotify.sr.mods_bypass_limits', value: String(d.modsBypassLimits), updatedAt: new Date() },
		{ key: 'spotify.sr.followers_only', value: String(d.followersOnly), updatedAt: new Date() },
		{ key: 'spotify.sr.permit_explicit', value: String(d.permitExplicit), updatedAt: new Date() },
		{ key: 'spotify.sr.offline_override', value: String(d.offlineOverride), updatedAt: new Date() },
		{ key: 'spotify.playlist.target_id', value: d.targetPlaylist, updatedAt: new Date() },
		{ key: 'spotify.playlist.target_name', value: d.targetPlaylistName, updatedAt: new Date() },
		{ key: 'spotify.playlist.allow_mods', value: String(d.allowModerators), updatedAt: new Date() },
		{ key: 'spotify.playlist.whisper', value: String(d.whisperNotifications), updatedAt: new Date() },
	]

	await db
		.insert(settings)
		.values(keysToUpsert)
		.onConflictDoUpdate({
			target: settings.key,
			set: {
				value: sql`excluded.value`,
				updatedAt: sql`excluded.updated_at`,
			},
		})

	await refreshAppSettingsCache()

	if (d.targetPlaylist) {
		const { syncTargetPlaylist } = await import('~~/server/utils/spotify')
		syncTargetPlaylist(d.targetPlaylist, true).catch(() => {})
	}

	return { success: true }
})
