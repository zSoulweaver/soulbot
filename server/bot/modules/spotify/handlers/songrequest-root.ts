import type { CommandHandler } from '~~/server/bot/core/types'
import type { SongRequestArgs } from '../schema'
import { requestSong, SongRequestError } from '~~/server/utils/songrequest'

export const handleSongRequestRoot: CommandHandler<typeof SongRequestArgs> = async (ctx, [spotifyLink]) => {
	try {
		const isModOrAbove = ctx.raw.userInfo.isBroadcaster || ctx.raw.userInfo.isMod
		const { track, position } = await requestSong({
			linkOrQuery: spotifyLink,
			user: {
				id: ctx.raw.userInfo.userId,
				username: ctx.user.name,
				displayName: ctx.user.displayName,
				isModOrAbove,
			},
		})

		return ctx.reply('spotify.sr.requested', {
			track: track.title,
			artist: track.artist,
			position,
		})
	}
	catch (err: any) {
		if (err instanceof SongRequestError) {
			if (err.templateId) {
				return ctx.reply(err.templateId as any, err.templateData)
			}
			return ctx.reply(err.message)
		}
		throw err
	}
}
