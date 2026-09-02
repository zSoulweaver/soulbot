import type { TemplateCatalogResponse, TemplateScopeDefinition, TemplateVariableMeta } from '~~/server/bot/core/template-catalog'
import { computed } from 'vue'

export type { TemplateCatalogResponse, TemplateScopeDefinition, TemplateVariableMeta }

export function useTemplateCatalog() {
	const { data: catalog, pending: loading, refresh } = useFetch<TemplateCatalogResponse>('/api/templates/catalog', {
		key: 'template-catalog',
		lazy: true,
	})

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
		const mockData: Record<string, string | number> = {}

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
