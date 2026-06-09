import type { MapTemplates, TemplateSourceMap } from '../../core/templates'
import { botLogger } from '~~/server/utils/logger'
import { templateRegistry } from '../../core/templates'

const definitions = {
	'spotify.song.playing': {
		default: 'Now playing: $(track) by $(artist) - $(link)',
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
