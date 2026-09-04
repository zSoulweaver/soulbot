import type { TemplateVariableMeta } from '~~/shared/types/templates'
import { computed, watch } from 'vue'

export type TemplateCatalogResponse = Awaited<ReturnType<typeof import('~~/server/api/templates/catalog.get').default>>
export type TemplateScopeDefinition = NonNullable<TemplateCatalogResponse['scopes'][string]>
export type { TemplateVariableMeta }

let inFlightPromise: Promise<TemplateCatalogResponse | null> | null = null

export function useTemplateCatalog() {
	const catalog = useState<TemplateCatalogResponse | null>('template-catalog', () => null)
	const loading = useState<boolean>('template-catalog-loading', () => false)

	const { loggedIn, user } = useUserSession()
	const isModeratorOrCaster = computed(() => {
		return loggedIn.value && (user.value?.role === 'caster' || user.value?.role === 'admin' || user.value?.role === 'moderator')
	})

	async function loadCatalog(options?: { force?: boolean }): Promise<TemplateCatalogResponse | null> {
		if (catalog.value && !options?.force) {
			return catalog.value
		}

		if (inFlightPromise) {
			return inFlightPromise
		}

		if (!isModeratorOrCaster.value) {
			loading.value = false
			return null
		}

		loading.value = true
		const promise = $fetch<TemplateCatalogResponse>('/api/templates/catalog')
			.then((data) => {
				catalog.value = data
				return data
			})
			.catch((err) => {
				console.error('Failed to load template catalog:', err)
				return null
			})
			.finally(() => {
				inFlightPromise = null
				loading.value = false
			})

		inFlightPromise = promise
		return promise
	}

	if (import.meta.client) {
		if (isModeratorOrCaster.value && !catalog.value && !inFlightPromise) {
			loadCatalog()
		}
		else if (!catalog.value && !inFlightPromise) {
			watch(isModeratorOrCaster, (allowed) => {
				if (allowed && !catalog.value && !inFlightPromise) {
					loadCatalog()
				}
			}, { once: true })
		}
	}

	async function refresh() {
		return loadCatalog({ force: true })
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
