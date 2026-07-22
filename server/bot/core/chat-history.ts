interface ChatEntry {
	text: string
	timestamp: number
}

const MAX_MESSAGES_PER_USER = 5
const TTL_MS = 15 * 60 * 1000 // 15 minutes
const MAX_TRACKED_USERS = 500

const userMessageHistory = new Map<string, ChatEntry[]>()
let lastCleanupTime = Date.now()

function cleanupStaleEntries() {
	const now = Date.now()
	// Only run cleanup if at least 5 minutes have passed since last cleanup
	if (now - lastCleanupTime < 5 * 60 * 1000 && userMessageHistory.size <= MAX_TRACKED_USERS) {
		return
	}

	lastCleanupTime = now
	for (const [userId, entries] of userMessageHistory.entries()) {
		const newestTimestamp = entries[entries.length - 1]?.timestamp ?? 0
		if (now - newestTimestamp > TTL_MS) {
			userMessageHistory.delete(userId)
		}
	}

	// Safety cap: if still too large, delete oldest entries
	if (userMessageHistory.size > MAX_TRACKED_USERS) {
		const keysToDelete = Array.from(userMessageHistory.keys()).slice(0, userMessageHistory.size - MAX_TRACKED_USERS)
		for (const key of keysToDelete) {
			userMessageHistory.delete(key)
		}
	}
}

/**
 * Tracks a user chat message in an in-memory rolling buffer (max 5 per user).
 */
export function trackUserChatMessage(userId: string, text: string): void {
	if (!userId || !text)
		return

	cleanupStaleEntries()

	const current = userMessageHistory.get(userId) || []
	current.push({ text, timestamp: Date.now() })

	if (current.length > MAX_MESSAGES_PER_USER) {
		current.shift()
	}

	userMessageHistory.set(userId, current)
}

/**
 * Retrieves the last 5 messages for a user.
 */
export function getUserRecentMessages(userId: string): string[] {
	if (!userId)
		return []

	const entries = userMessageHistory.get(userId) || []
	const now = Date.now()

	// Filter out entries older than TTL
	const validEntries = entries.filter(e => now - e.timestamp <= TTL_MS)
	return validEntries.map(e => e.text)
}
