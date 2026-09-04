import type {
	TemplateToken,
	TemplateValidationOptions,
	TemplateValidationResult,
	TemplateVariableMeta,
} from '~~/shared/types/templates'
import {
	validateTemplate as baseValidateTemplate,
	getAllowedVariables,
	getSuggestionsForVariable,
	tokenizeTemplate,
} from '~~/shared/utils/template-validator'
import { useTemplateCatalog } from './useTemplateCatalog'

export type {
	TemplateToken,
	TemplateValidationOptions,
	TemplateValidationResult,
	TemplateVariableMeta,
}

export function validateTemplate(
	template: string,
	options: TemplateValidationOptions = {},
): TemplateValidationResult {
	if (!options.allowedVariables && options.scopeId) {
		try {
			const { getVariablesForScope } = useTemplateCatalog()
			const { all } = getVariablesForScope(options.scopeId, options.customVariables, options.includeGlobal ?? true)
			if (all && all.length > 0) {
				return baseValidateTemplate(template, {
					...options,
					allowedVariables: all,
				})
			}
		}
		catch {
			// Fall through if outside Nuxt context
		}
	}
	return baseValidateTemplate(template, options)
}

export {
	getAllowedVariables,
	getSuggestionsForVariable,
	tokenizeTemplate,
}
