export default defineNuxtRouteMiddleware(async (to) => {
	if (to.path === '/admin' || to.path.startsWith('/admin/')) {
		const { loggedIn, user } = useUserSession()
		if (!loggedIn.value || !user.value) {
			return navigateTo('/')
		}
		const role = user.value.role
		if (role !== 'caster' && role !== 'admin' && role !== 'moderator') {
			return navigateTo('/')
		}
	}

	if (to.path === '/setup') {
		const { loggedIn, user } = useUserSession()
		if (loggedIn.value && user.value && user.value.role !== 'caster') {
			try {
				const status = await $fetch<any>('/api/bot/status')
				const isBotAccount = Boolean(status?.bot?.userId && user.value.id === status.bot.userId)
				const isOnboarded = Boolean(status?.streamer && status?.bot)
				if (isOnboarded && !isBotAccount) {
					return navigateTo('/')
				}
			}
			catch {
				return navigateTo('/')
			}
		}
	}
})
