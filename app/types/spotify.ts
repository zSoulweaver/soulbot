export type SpotifyStatusResponse = Awaited<ReturnType<typeof import('~~/server/api/spotify/status.get').default>>
export type SpotifyQueueResponse = Awaited<ReturnType<typeof import('~~/server/api/spotify/queue/index.get').default>>

export type StatusTrack = NonNullable<SpotifyStatusResponse['currentlyPlaying']>
export type QueueTrack = NonNullable<SpotifyQueueResponse['currentlyPlaying']>

export type CurrentlyPlayingTrack = StatusTrack & {
	isLiked?: boolean
}
