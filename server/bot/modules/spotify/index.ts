import { getCurrentlyPlaying, getSpotifyToken } from '~~/server/utils/spotify'
import { defineCommand } from '../../core/define-command'
import { registerSpotifyTemplates } from './templates'

registerSpotifyTemplates()

const songCommand = defineCommand({
	id: 'song',
	description: 'Get the currently playing song on Spotify',
	usage: '!song',
	permission: 'everyone',
	templates: [
		'spotify.song.playing',
		'spotify.song.not-playing',
		'spotify.song.not-connected',
	],
	handler: async (ctx) => {
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
	},
})

export const spotifyModule = [
	songCommand,
]
