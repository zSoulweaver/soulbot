declare module '#auth-utils' {
	interface User {
		id: string
		username: string
		displayName: string
		image: string | null
		role: 'viewer' | 'moderator' | 'caster'
		isVip: boolean
		isSubscriber: boolean
	}

	interface UserSession {
		user: User
		loggedInAt: string
	}
}

export {}
