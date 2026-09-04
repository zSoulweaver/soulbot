import { computed, watch } from 'vue'

export type TemplateIssuesResponse = Awaited<ReturnType<typeof import('~~/server/api/admin/templates/issues.get').default>>
export type TemplateResetResponse = Awaited<ReturnType<typeof import('~~/server/api/admin/templates/reset.post').default>>
export type TemplateAuditResult = TemplateIssuesResponse
export type TemplateAuditIssue = TemplateIssuesResponse['issues'][number]

export const TEMPLATE_AUDIT_KEY = 'template-audit-issues'

export function refreshTemplateAudit() {
	return refreshNuxtData(TEMPLATE_AUDIT_KEY)
}

export function useTemplateAudit() {
	const { loggedIn, user } = useUserSession()
	const isModeratorOrCaster = computed(() => {
		return loggedIn.value && (user.value?.role === 'caster' || user.value?.role === 'admin' || user.value?.role === 'moderator')
	})

	const { data: auditResult, pending: loading, refresh } = useFetch<TemplateIssuesResponse>('/api/admin/templates/issues', {
		key: TEMPLATE_AUDIT_KEY,
		lazy: true,
		immediate: isModeratorOrCaster.value,
	})

	watch(isModeratorOrCaster, (allowed) => {
		if (allowed && !auditResult.value) {
			refresh()
		}
	})

	try {
		const route = useRoute()
		watch(() => route.path, (newPath) => {
			if (isModeratorOrCaster.value && newPath.startsWith('/admin')) {
				refresh()
			}
		})
	}
	catch {
		// Ignore if outside Nuxt context
	}

	async function resetTemplate(issueId: string) {
		const res = await $fetch<TemplateResetResponse>('/api/admin/templates/reset', {
			method: 'POST',
			body: { id: issueId },
		})
		const { refresh: refreshCatalog } = useTemplateCatalog()
		await Promise.all([
			refresh(),
			refreshCatalog(),
		])
		return res
	}

	return {
		auditResult,
		loading,
		refresh,
		resetTemplate,
		isModeratorOrCaster,
	}
}
