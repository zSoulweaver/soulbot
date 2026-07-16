import type { UserRole } from '~/config/navigation'
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'

export function useRequireUserRole(allowedRoles?: UserRole[]) {
	const { loggedIn, user } = useUserSession()
	const route = useRoute()

	watchEffect(() => {
		if (!loggedIn.value || !user.value) {
			navigateTo('/')
			return
		}

		const userRole = user.value.role
		if (!allowedRoles)
			return

		let permitted = allowedRoles.includes(userRole)

		// Admin has access to all caster or moderator endpoints except for the admin roles management page
		if (!permitted && userRole === 'admin') {
			const hasCasterOrMod = allowedRoles.includes('caster') || allowedRoles.includes('moderator')
			if (hasCasterOrMod && route.path !== '/admin/misc/roles') {
				permitted = true
			}
		}

		if (!permitted) {
			navigateTo('/')
		}
	})
}
