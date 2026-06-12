import { getApiClient, getStreamerToken } from '~~/server/utils/twurple'

export function parseSpotifyTrackId(input: string): string | null {
	const trimmed = input.trim()
	const uriMatch = trimmed.match(/^spotify:track:([a-zA-Z0-9]{22})$/)
	if (uriMatch)
		return uriMatch[1] || null

	const urlMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]{22})/)
	if (urlMatch)
		return urlMatch[1] || null

	return null
}

export async function checkIsFollowing(twitchUserId: string): Promise<boolean> {
	try {
		const streamerToken = await getStreamerToken()
		if (!streamerToken || !streamerToken.userId)
			return false
		const api = getApiClient()
		const followResult = await api.channels.getChannelFollowers(streamerToken.userId, twitchUserId)
		return followResult.data.length > 0
	}
	catch {
		return false
	}
}
