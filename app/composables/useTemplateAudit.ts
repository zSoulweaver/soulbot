import { computed, watch } from 'vue'

export type TemplateIssuesResponse = Awaited<ReturnType<typeof import('~~/server/api/admin/templates/issues.get').default>>
export type TemplateResetResponse = Awaited<ReturnType<typeof import('~~/server/api/admin/templates/reset.post').default>>
export type TemplateAuditResult = TemplateIssuesResponse
export type TemplateAuditIssue = TemplateIssuesResponse['issues'][number]

export function useTemplateAudit() {
	const { loggedIn, user } = useUserSession()
	const isModeratorOrCaster = computed(() => {
		return loggedIn.value && (user.value?.role === 'caster' || user.value?.role === 'admin' || user.value?.role === 'moderator')
	})

	const { data: auditResult, pending: loading, refresh } = useFetch<TemplateIssuesResponse>('/api/admin/templates/issues', {
		key: 'template-audit-issues',
		lazy: true,
		immediate: isModeratorOrCaster.value,
	})

	watch(isModeratorOrCaster, (allowed) => {
		if (allowed && !auditResult.value) {
			refresh()
		}
	})

	async function resetTemplate(issueId: string) {
		const res = await $fetch<TemplateResetResponse>('/api/admin/templates/reset', {
			method: 'POST',
			body: { id: issueId },
		})
		await refresh()
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
