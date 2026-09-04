import type { TemplateVariableMeta } from '~~/shared/types/templates'
import { computed, getCurrentInstance, ref, watch } from 'vue'

export type TemplateCatalogResponse = Awaited<ReturnType<typeof import('~~/server/api/templates/catalog.get').default>>
export type TemplateScopeDefinition = NonNullable<TemplateCatalogResponse['scopes'][string]>
export type { TemplateVariableMeta }

export function useTemplateCatalog() {
	const { loggedIn, user } = useUserSession()
	const isModeratorOrCaster = computed(() => {
		return loggedIn.value && (user.value?.role === 'caster' || user.value?.role === 'admin' || user.value?.role === 'moderator')
	})

	const nuxtData = useNuxtData<TemplateCatalogResponse | null>('template-catalog')
	let catalog = nuxtData.data
	let loading = ref(false)
	let refresh: () => Promise<any> = () => refreshNuxtData('template-catalog')

	// Only register useAsyncData when called during synchronous component setup
	if (getCurrentInstance()) {
		const asyncData = useAsyncData<TemplateCatalogResponse | null>(
			'template-catalog',
			async () => {
				if (!isModeratorOrCaster.value) {
					return null
				}
				try {
					if (import.meta.server) {
						return await useRequestFetch()<TemplateCatalogResponse>('/api/templates/catalog')
					}
					return await $fetch<TemplateCatalogResponse>('/api/templates/catalog')
				}
				catch (err) {
					console.error('Failed to load template catalog:', err)
					return null
				}
			},
			{
				immediate: isModeratorOrCaster.value,
				lazy: false,
			},
		)
		catalog = asyncData.data
		loading = asyncData.pending
		refresh = asyncData.refresh

		watch(isModeratorOrCaster, (allowed) => {
			if (allowed && !catalog.value) {
				refresh()
			}
		})
	}

	const globalVariables = computed<TemplateVariableMeta[]>(() => catalog.value?.globalVariables || [])
	const scopes = computed<Record<string, TemplateScopeDefinition>>(() => catalog.value?.scopes || {})

	function getScope(scopeId: string | undefined): TemplateScopeDefinition | undefined {
		if (!scopeId || !catalog.value?.scopes)
			return undefined
		return catalog.value.scopes[scopeId]
	}

	function getVariablesForScope(
		scopeId?: string,
		customVariables?: TemplateVariableMeta[],
		includeGlobal = true,
	) {
		const scopeDef = getScope(scopeId)
		const scopedVars: TemplateVariableMeta[] = []

		if (scopeDef?.variables) {
			scopedVars.push(...scopeDef.variables.map(v => ({ ...v, category: 'event' as const })))
		}

		if (customVariables) {
			scopedVars.push(...customVariables.map(v => ({ ...v, category: 'custom' as const })))
		}

		const globalVars = includeGlobal ? globalVariables.value : []
		const allVars = [...scopedVars, ...globalVars]

		return {
			scoped: scopedVars,
			global: globalVars,
			all: allVars,
		}
	}

	function renderPreview(
		template: string,
		scopeId?: string,
		customVariables?: TemplateVariableMeta[],
		mockDataOverride?: Record<string, string | number>,
	): string {
		if (!template)
			return ''

		const { all: vars } = getVariablesForScope(scopeId, customVariables, true)
		const mockData: Record<string, string | number | boolean> = {}

		for (const v of vars) {
			mockData[v.name] = v.example ?? v.name
		}

		if (mockDataOverride) {
			Object.assign(mockData, mockDataOverride)
		}

		let rendered = template
		// Match any $(variable.subfield) or $(var)
		rendered = rendered.replace(/\$\(([^()]+)\)/g, (fullMatch, expr) => {
			const trimmed = expr.trim()
			if (trimmed in mockData) {
				return String(mockData[trimmed])
			}
			return fullMatch
		})

		return rendered
	}

	return {
		catalog,
		globalVariables,
		scopes,
		loading,
		refresh,
		getScope,
		getVariablesForScope,
		renderPreview,
	}
}
