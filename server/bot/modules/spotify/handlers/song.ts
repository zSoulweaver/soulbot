import type { CommandHandler } from '~~/server/bot/core/types'
import { getCurrentlyPlaying, getSpotifyToken } from '~~/server/utils/spotify'

export const handleSong: CommandHandler = async (ctx) => {
	const token = await getSpotifyToken()
	if (!token) {
		await ctx.reply('spotify.song.not-connected')
		return
	}

	const currentlyPlaying = await getCurrentlyPlaying()
	if (!currentlyPlaying || !currentlyPlaying.isPlaying) {
		await ctx.reply('spotify.song.not-playing')
		return
	}

	await ctx.reply('spotify.song.playing', {
		track: currentlyPlaying.title,
		artist: currentlyPlaying.artist,
		link: currentlyPlaying.link,
	})
}
