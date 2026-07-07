import { defineCommand } from '../../core/define-command'
import { handleSong } from './handlers/song'
import { handleSongRequestBlacklist } from './handlers/songrequest-blacklist'
import { handleSongRequestDisable } from './handlers/songrequest-disable'
import { handleSongRequestEnable } from './handlers/songrequest-enable'
import { handleSongRequestLike } from './handlers/songrequest-like'
import { handleSongRequestPlay } from './handlers/songrequest-play'
import { handleSongRequestRemove } from './handlers/songrequest-remove'
import { handleSongRequestRoot } from './handlers/songrequest-root'
import { handleSongRequestSkip } from './handlers/songrequest-skip'
import { handleSongRequestWrongSong } from './handlers/songrequest-wrongsong'
import { SongRequestArgs, SongRequestBlacklistArgs, SongRequestRemoveArgs } from './schema'
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
	handler: handleSong,
})

export const songrequestModule = defineCommand({
	id: 'songrequest',
	description: 'Request a song or manage song requests',
	usage: '!songrequest <spotify link|subcommand>',
	permission: 'everyone',
	args: SongRequestArgs,
	templates: [
		'spotify.sr.enabled',
		'spotify.sr.disabled',
		'spotify.sr.cleared',
		'spotify.sr.removed',
		'spotify.sr.wrongsong',
		'spotify.sr.no-request',
		'spotify.sr.requested',
		'spotify.sr.not-found',
		'spotify.sr.limit-reached',
		'spotify.sr.too-long',
		'spotify.sr.explicit-blocked',
		'spotify.sr.followers-only',
		'spotify.sr.no-points',
		'spotify.sr.offline',
		'spotify.song.not-playing',
		'spotify.playlist.liked',
		'spotify.playlist.already-liked',
		'spotify.playlist.no-target',
		'spotify.sr.blacklisted',
		'spotify.sr.user-limit-reached',
		'spotify.sr.queue-low',
		'spotify.sr.queue-empty-autoplay',
		'spotify.sr.queue-empty-no-autoplay',
	],
	handler: handleSongRequestRoot,
	subcommands: {
		like: {
			description: 'Save the currently playing track to the stream target playlist',
			permission: 'moderator',
			handler: handleSongRequestLike,
		},
		blacklist: {
			description: 'Add a track to the blacklist and remove pending requests',
			permission: 'moderator',
			args: SongRequestBlacklistArgs,
			handler: handleSongRequestBlacklist,
		},
		wrongsong: {
			description: 'Remove your latest pending request and get a points refund',
			permission: 'everyone',
			handler: handleSongRequestWrongSong,
		},
		remove: {
			description: 'Remove a specific song request from the queue by position',
			permission: 'moderator',
			args: SongRequestRemoveArgs,
			handler: handleSongRequestRemove,
		},
		skip: {
			description: 'Skip the currently playing song request',
			permission: 'moderator',
			handler: handleSongRequestSkip,
		},
		enable: {
			description: 'Enable Twitch song requests',
			permission: 'broadcaster',
			handler: handleSongRequestEnable,
		},
		disable: {
			description: 'Disable Twitch song requests',
			permission: 'broadcaster',
			handler: handleSongRequestDisable,
		},
		play: {
			description: 'Start playback of the song request playlist on the streamer\'s Spotify player',
			permission: 'moderator',
			handler: handleSongRequestPlay,
		},
	},
})

export const spotifyModule = [
	songCommand,
	songrequestModule,
]
