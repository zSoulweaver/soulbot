export default defineNuxtRouteMiddleware((to) => {
	if (to.path === '/admin' || to.path.startsWith('/admin/')) {
		const { loggedIn, user } = useUserSession()
		if (!loggedIn.value || !user.value) {
			return navigateTo('/')
		}
		const role = user.value.role
		if (role !== 'caster' && role !== 'moderator') {
			return navigateTo('/')
		}
	}
})
