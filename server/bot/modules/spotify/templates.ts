import type { InferTemplateParams } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { defineTemplates } from '../../core/templates'

export const spotifyTemplates = defineTemplates({
	domain: 'commands',
	category: 'command',
	editUrl: '/admin/commands/song',
	templates: {
		'spotify.song.playing': {
			default: 'Now playing: "$(track) by $(artist)" - $(link)',
			params: {
				track: { label: 'Track Title', description: 'The title of the playing song.', example: 'Blinding Lights' },
				artist: { label: 'Artist Name', description: 'The artist of the song.', example: 'The Weeknd' },
				link: { label: 'Spotify Link', description: 'The Spotify URL to listen to the song.', example: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b' },
			},
		},
		'spotify.song.not-playing': {
			default: 'No song is currently playing on Spotify.',
		},
		'spotify.song.not-connected': {
			default: 'Spotify is not connected. The broadcaster needs to connect their Spotify account on the admin panel.',
		},
		'spotify.sr.enabled': {
			default: 'Spotify song requests have been enabled.',
		},
		'spotify.sr.disabled': {
			default: 'Spotify song requests have been disabled (queue paused).',
		},
		'spotify.sr.cleared': {
			default: 'The song request queue has been cleared and all points refunded.',
		},
		'spotify.sr.removed': {
			default: 'Removed $(track) requested by $(user) from the queue.',
			params: {
				track: { label: 'Track Title', description: 'The title of the removed song.', example: 'Levitating' },
				user: { label: 'Requester Username', description: 'The Twitch username of the user who requested it.', example: 'CoolFella123' },
			},
		},
		'spotify.sr.wrongsong': {
			default: 'Removed your last request $(track) from the queue and refunded $(points) $(core.currency).',
			params: {
				track: { label: 'Track Title', description: 'The title of the removed song.', example: 'Levitating' },
				points: { label: 'Points Refunded', description: 'The number of currency points refunded.', example: 100 },
			},
		},
		'spotify.sr.no-request': {
			default: 'You have no pending requests in the queue.',
		},
		'spotify.sr.requested': {
			default: '"$(track) by $(artist)" has been added to the queue (Position #$(position)).',
			params: {
				track: { label: 'Track Title', description: 'The title of the requested song.', example: 'Stay' },
				artist: { label: 'Artist Name', description: 'The artist of the song.', example: 'The Kid LAROI, Justin Bieber' },
				position: { label: 'Queue Position', description: 'The song\'s numerical position in the queue.', example: 3 },
			},
		},
		'spotify.sr.not-found': {
			default: 'Could not find track on Spotify.',
		},
		'spotify.sr.limit-reached': {
			default: 'The song request queue is full ($(max) songs).',
			params: {
				max: { label: 'Max Capacity', description: 'The maximum capacity limit of the queue.', example: 20 },
			},
		},
		'spotify.sr.too-long': {
			default: 'That song is too long. The maximum allowed length is $(max) minutes.',
			params: {
				max: { label: 'Max Minutes', description: 'The maximum allowed duration in minutes.', example: 6 },
			},
		},
		'spotify.sr.explicit-blocked': {
			default: 'Explicit songs are not allowed on this stream.',
		},
		'spotify.sr.followers-only': {
			default: 'Song requests are restricted to followers only.',
		},
		'spotify.sr.no-points': {
			default: 'You do not have enough points. Cost: $(cost) $(core.currency).',
			params: {
				cost: { label: 'Points Cost', description: 'The points cost required to request a song.', example: 100 },
			},
		},
		'spotify.sr.offline': {
			default: 'Song requests are only available when the stream is live.',
		},
		'spotify.playlist.liked': {
			default: '@$(caster), the current track requested by @$(requester) has been saved to the playlist!',
			params: {
				caster: { label: 'Caster Username', description: 'The broadcaster\'s Twitch username.', example: 'StreamerBroadcaster' },
				requester: { label: 'Requester Username', description: 'The Twitch username of the user who requested the song.', example: 'CoolFella123' },
			},
		},
		'spotify.playlist.already-liked': {
			default: 'This song is already saved to the stream Spotify playlist!',
		},
		'spotify.playlist.no-target': {
			default: 'No target playlist is configured. Go to the Spotify admin panel to configure it.',
		},
		'spotify.sr.blacklisted': {
			default: 'This track is blacklisted and cannot be requested.',
		},
		'spotify.sr.user-limit-reached': {
			default: 'You have reached your limit of active song requests ($(max) songs).',
			params: {
				max: { label: 'User Request Limit', description: 'The maximum requests allowed per user at any one time.', example: 2 },
			},
		},
		'spotify.sr.queue-low': {
			default: 'The song request queue is running low (5 songs remaining).',
		},
		'spotify.sr.queue-empty-autoplay': {
			default: 'The song request queue has finished! Autoplay songs have been added to keep the music going.',
		},
		'spotify.sr.queue-empty-no-autoplay': {
			default: 'The song request queue has finished! There are no autoplay songs configured.',
		},
	},
})

export function registerSpotifyTemplates() {
	botLogger.info('Registering spotify templates...')
	spotifyTemplates.register()
}

declare module '../../core/templates' {
	interface CommandTemplates extends InferTemplateParams<typeof spotifyTemplates> {}
}
