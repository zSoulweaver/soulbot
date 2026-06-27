import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

const definitions = {
	'spotify.song.playing': {
		default: 'Now playing: "$(track) by $(artist)" - $(link)',
		params: { track: '', artist: '', link: '' } as { track: string, artist: string, link: string },
	},
	'spotify.song.not-playing': {
		default: 'No song is currently playing on Spotify.',
		params: undefined,
	},
	'spotify.song.not-connected': {
		default: 'Spotify is not connected. The broadcaster needs to connect their Spotify account on the admin panel.',
		params: undefined,
	},
	'spotify.sr.enabled': {
		default: 'Spotify song requests have been enabled.',
		params: undefined,
	},
	'spotify.sr.disabled': {
		default: 'Spotify song requests have been disabled (queue paused).',
		params: undefined,
	},
	'spotify.sr.cleared': {
		default: 'The song request queue has been cleared and all points refunded.',
		params: undefined,
	},
	'spotify.sr.removed': {
		default: 'Removed $(track) requested by $(user) from the queue.',
		params: { track: '', user: '' } as { track: string, user: string },
	},
	'spotify.sr.wrongsong': {
		default: 'Removed your last request $(track) from the queue and refunded $(points) $(core.currency).',
		params: { track: '', points: 0 } as { track: string, points: number },
	},
	'spotify.sr.no-request': {
		default: 'You have no pending requests in the queue.',
		params: undefined,
	},
	'spotify.sr.requested': {
		default: '"$(track) by $(artist)" has been added to the queue (Position #$(position)).',
		params: { track: '', artist: '', position: 0 } as { track: string, artist: string, position: number },
	},
	'spotify.sr.not-found': {
		default: 'Could not find track on Spotify.',
		params: undefined,
	},
	'spotify.sr.limit-reached': {
		default: 'The song request queue is full ($(max) songs).',
		params: { max: 0 } as { max: number },
	},
	'spotify.sr.too-long': {
		default: 'That song is too long. The maximum allowed length is $(max) minutes.',
		params: { max: 0 } as { max: number },
	},
	'spotify.sr.explicit-blocked': {
		default: 'Explicit songs are not allowed on this stream.',
		params: undefined,
	},
	'spotify.sr.followers-only': {
		default: 'Song requests are restricted to followers only.',
		params: undefined,
	},
	'spotify.sr.no-points': {
		default: 'You do not have enough points. Cost: $(cost) $(core.currency).',
		params: { cost: 0 } as { cost: number },
	},
	'spotify.sr.offline': {
		default: 'Song requests are only available when the stream is live.',
		params: undefined,
	},
	'spotify.playlist.liked': {
		default: '@$(caster), the current track requested by @$(requester) has been saved to the playlist!',
		params: { caster: '', requester: '' } as { caster: string, requester: string },
	},
	'spotify.playlist.already-liked': {
		default: 'This song is already saved to the stream Spotify playlist!',
		params: undefined,
	},
	'spotify.playlist.no-target': {
		default: 'No target playlist is configured. Go to the Spotify admin panel to configure it.',
		params: undefined,
	},
	'spotify.sr.blacklisted': {
		default: 'This track is blacklisted and cannot be requested.',
		params: undefined,
	},
	'spotify.sr.user-limit-reached': {
		default: 'You have reached your limit of active song requests ($(max) songs).',
		params: { max: 0 } as { max: number },
	},
} as const satisfies TemplateSourceMap

export function registerSpotifyTemplates() {
	botLogger.info('Registering spotify templates...')

	for (const [id, def] of Object.entries(definitions)) {
		templateRegistry.register({
			id,
			default: def.default,
			params: def.params ? Object.keys(def.params) : [],
		})
	}
}

declare module '../../core/templates' {
	interface CommandTemplates extends MapTemplates<typeof definitions> {}
}
