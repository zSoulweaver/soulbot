import type {
	TemplateToken,
	TemplateValidationOptions,
	TemplateValidationResult,
	TemplateVariableMeta,
} from '../types/templates'
import { GLOBAL_TEMPLATE_VARIABLES } from '../types/templates'

export type ScopeVariablesResolver = (scopeId: string) => readonly TemplateVariableMeta[] | undefined

let globalScopeVariablesResolver: ScopeVariablesResolver | undefined

export function registerScopeVariablesResolver(resolver: ScopeVariablesResolver) {
	globalScopeVariablesResolver = resolver
}

/**
 * Standard registered command variables and positional args
 */
const REGISTERED_COMMAND_VARIABLES = [
	'sender',
	'sender.name',
	'sender.id',
	'sender.display_name',
	'touser',
	'touser.name',
	'touser.id',
	'query',
	'query.1',
	'query.2',
	'query.3',
	'count',
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'7',
	'8',
	'9',
]

/**
 * Common scope-specific alias and typo mappings
 */
const SCOPE_COMMON_MAPPINGS: Record<string, Record<string, string[]>> = {
	'eventsub.alert.follow': {
		user: ['follower', 'follower.name'],
		username: ['follower.name'],
		name: ['follower'],
		follow: ['follower'],
		follower_name: ['follower.name'],
	},
	'discord.alert.follow': {
		user: ['follower', 'follower.name'],
		username: ['follower.name'],
		name: ['follower'],
		follow: ['follower'],
	},
	'eventsub.alert.sub': {
		user: ['subscriber', 'subscriber.name'],
		username: ['subscriber.name'],
		name: ['subscriber'],
		sub: ['subscriber'],
		subscriber_name: ['subscriber.name'],
		plan: ['tier'],
	},
	'discord.alert.sub': {
		user: ['subscriber', 'subscriber.name'],
		username: ['subscriber.name'],
		name: ['subscriber'],
		sub: ['subscriber'],
	},
	'eventsub.alert.gift': {
		user: ['gifter', 'gifter.name'],
		username: ['gifter.name'],
		name: ['gifter'],
		gift: ['gifter'],
		amount: ['count'],
		subs: ['count'],
	},
	'discord.alert.gift': {
		user: ['gifter'],
		name: ['gifter'],
		gift: ['gifter'],
		amount: ['count'],
	},
	'eventsub.alert.cheer': {
		user: ['cheerer', 'cheerer.name'],
		username: ['cheerer.name'],
		name: ['cheerer'],
		cheer: ['cheerer'],
		amount: ['bits'],
		cheer_message: ['message'],
	},
	'discord.alert.cheer': {
		user: ['cheerer'],
		cheer: ['cheerer'],
		amount: ['bits'],
	},
	'eventsub.alert.raid': {
		user: ['raider', 'raider.name'],
		username: ['raider.name'],
		name: ['raider'],
		raid: ['raider'],
		viewercount: ['viewers'],
		viewer_count: ['viewers'],
		count: ['viewers'],
	},
	'discord.alert.raid': {
		user: ['raider'],
		viewercount: ['viewers'],
		viewer_count: ['viewers'],
		count: ['viewers'],
	},
	'eventsub.alert.live': {
		user: ['broadcaster'],
		streamer: ['broadcaster'],
		game_name: ['game'],
		category: ['game'],
		stream_title: ['title'],
	},
	'discord.alert.live': {
		user: ['broadcaster'],
		streamer: ['broadcaster'],
		game_name: ['game'],
		category: ['game'],
		stream_title: ['title'],
	},
	'eventsub.alert.offline': {
		user: ['broadcaster'],
		streamer: ['broadcaster'],
	},
	'discord.alert.offline': {
		user: ['broadcaster'],
		streamer: ['broadcaster'],
	},
	'eventsub.alert.ban': {
		user: ['target', 'target.name'],
		username: ['target.name'],
		banned_user: ['target'],
		mod: ['moderator'],
	},
	'eventsub.alert.timeout': {
		user: ['target', 'target.name'],
		username: ['target.name'],
		mod: ['moderator'],
		time: ['duration'],
		seconds: ['duration'],
	},
	'eventsub.alert.unban': {
		user: ['target', 'target.name'],
		username: ['target.name'],
		mod: ['moderator'],
	},
	'eventsub.alert.message_delete': {
		user: ['target', 'target.name'],
		username: ['target.name'],
		mod: ['moderator'],
		deleted_message: ['message'],
	},
	'discord.alert.ban': {
		user: ['target'],
		username: ['target'],
	},
	'discord.alert.timeout': {
		user: ['target'],
		time: ['duration'],
		seconds: ['duration'],
	},
	'discord.alert.unban': {
		user: ['target'],
	},
	'discord.alert.message_delete': {
		user: ['target'],
	},
	'eventsub.alert.adbreak': {
		time: ['duration'],
		seconds: ['duration'],
		user: ['requester'],
		streamer: ['requester'],
	},
	'ads.alert': {
		seconds: ['duration'],
		countdown: ['time'],
		secondsLeft: ['duration'],
	},
	'vault.start': {
		time: ['duration'],
		seconds: ['duration'],
		mult: ['multiplier'],
	},
	'vault.warning': {
		duration: ['secondsLeft'],
		time: ['secondsLeft'],
		raiders: ['raidersCount'],
	},
	'vault.win': {
		raiders: ['raidersCount'],
		won: ['totalWon'],
		payout: ['totalWon'],
	},
	'vault.lose': {
		raiders: ['raidersCount'],
		lost: ['pot'],
	},
	'gambling.bonus_start': {
		time: ['duration'],
		mult: ['multiplier'],
		win_multiplier: ['multiplier'],
		ticket_count: ['tickets'],
	},
	'gambling.bonus_end': {
		time: ['duration'],
		mult: ['multiplier'],
	},
	'commands.custom': {
		user: ['sender', 'touser'],
		username: ['sender.name', 'touser.name'],
		author: ['sender'],
		target: ['touser'],
		counter: ['count'],
		curr: ['core.currency'],
		currency: ['core.currency'],
		points_balance: ['points'],
	},
	'widgets.deaths': {
		deaths: ['count', 'total'],
		all_deaths: ['total'],
		current_game: ['game'],
	},
}

/**
 * Universal typo / migration mapping across all scopes
 */
const GLOBAL_COMMON_MAPPINGS: Record<string, string[]> = {
	'#': ['randint'],
	'point': ['core.currency', 'points'],
	'curr': ['core.currency'],
	'currency': ['core.currency'],
	'currency_name': ['core.currency'],
	'streamer': ['channel', 'broadcaster'],
	'stream_uptime': ['uptime'],
	'follow_age': ['followage'],
	'random': ['randint'],
	'rand': ['randint'],
}

/**
 * Calculates the Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
	const lenA = a.length
	const lenB = b.length
	const matrix: number[][] = Array.from({ length: lenA + 1 }, () => Array.from<number>({ length: lenB + 1 }).fill(0))

	for (let i = 0; i <= lenA; i++) {
		const row = matrix[i]
		if (row) {
			row[0] = i
		}
	}
	for (let j = 0; j <= lenB; j++) {
		const row0 = matrix[0]
		if (row0) {
			row0[j] = j
		}
	}

	for (let i = 1; i <= lenA; i++) {
		for (let j = 1; j <= lenB; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1
			const prevRow = matrix[i - 1]
			const currRow = matrix[i]
			const val1 = (prevRow ? prevRow[j] : 0) ?? 0
			const val2 = (currRow ? currRow[j - 1] : 0) ?? 0
			const val3 = (prevRow ? prevRow[j - 1] : 0) ?? 0

			if (currRow) {
				currRow[j] = Math.min(val1 + 1, val2 + 1, val3 + cost)
			}
		}
	}

	const lastRow = matrix[lenA]
	return lastRow && typeof lastRow[lenB] === 'number' ? lastRow[lenB] : 0
}

/**
 * Extracts variable token occurrences from a raw template string.
 * Supports standard $(var), nested $(var $(arg)), legacy {var}, and unescaped legacy (var).
 */
export function tokenizeTemplate(template: string): Array<{
	raw: string
	name: string
	type: 'standard' | 'legacy_brace' | 'legacy_paren'
	startIndex: number
	endIndex: number
}> {
	const tokens: Array<{
		raw: string
		name: string
		type: 'standard' | 'legacy_brace' | 'legacy_paren'
		startIndex: number
		endIndex: number
	}> = []

	if (!template || typeof template !== 'string')
		return tokens

	// 1. Standard variable tokens: $(variable) or $(variable args...) with support for nested tokens
	let workingCopy = template
	let depth = 0
	const maxDepth = 5

	while (depth < maxDepth) {
		let foundMatch = false
		const standardRegex = /\$\(([^()]+)\)/g

		for (const match of workingCopy.matchAll(standardRegex)) {
			foundMatch = true
			const fullMatch = match[0]
			const inner = match[1]?.trim() ?? ''
			const startIndex = match.index ?? 0
			const endIndex = startIndex + fullMatch.length
			const originalRaw = template.substring(startIndex, endIndex)
			const cleanName = inner.replace(/\s+/g, ' ').trim()

			tokens.push({
				raw: originalRaw,
				name: cleanName,
				type: 'standard',
				startIndex,
				endIndex,
			})
		}

		if (!foundMatch)
			break

		// Mask matched tokens with spaces in workingCopy so outer tokens can be matched in next iteration
		for (const match of workingCopy.matchAll(standardRegex)) {
			const startIndex = match.index ?? 0
			const fullMatch = match[0]
			const spaces = ' '.repeat(fullMatch.length)
			workingCopy = workingCopy.substring(0, startIndex) + spaces + workingCopy.substring(startIndex + fullMatch.length)
		}
		depth++
	}

	// 2. Legacy curly brace tokens: {var} (excluding JSON-like structures or multi-lines)
	const braceRegex = /\{([\w.]+)\}/g
	for (const match of template.matchAll(braceRegex)) {
		const fullMatch = match[0]
		const inner = match[1]?.trim() ?? ''
		const startIndex = match.index ?? 0
		tokens.push({
			raw: fullMatch,
			name: inner,
			type: 'legacy_brace',
			startIndex,
			endIndex: startIndex + fullMatch.length,
		})
	}

	// 3. Legacy parentheses tokens: (#), (uptime), (followage), or known unescaped keywords in parens
	// Note: only match if NOT preceded by $
	const parenRegex = /(?<!\$)\((#|[\w.]+)\)/g
	const knownLegacyKeywords = [
		'#',
		'uptime',
		'followage',
		'sender',
		'user',
		'username',
		'streamer',
		'broadcaster',
		'points',
		'point',
		'channel',
		'subscriber',
		'sub',
		'follower',
		'raider',
		'raid',
		'gifter',
		'gift',
		'cheerer',
		'cheer',
		'bits',
		'viewers',
		'target',
		'game',
		'title',
		'count',
		'tier',
		'duration',
		'message',
		'pot',
		'roll',
		'currency',
		'curr',
	]

	for (const match of template.matchAll(parenRegex)) {
		const fullMatch = match[0]
		const inner = match[1]?.trim() ?? ''
		const startIndex = match.index ?? 0
		const lower = inner.toLowerCase()

		if (knownLegacyKeywords.includes(lower)) {
			tokens.push({
				raw: fullMatch,
				name: inner,
				type: 'legacy_paren',
				startIndex,
				endIndex: startIndex + fullMatch.length,
			})
		}
	}

	// Sort tokens by their appearance in the text
	tokens.sort((a, b) => a.startIndex - b.startIndex)
	return tokens
}

/**
 * Gathers all allowed variable names and metadata for a given validation context.
 */
export function getAllowedVariables(options: TemplateValidationOptions = {}): {
	variableMap: Map<string, TemplateVariableMeta>
	allowedNames: Set<string>
	scopeParams?: readonly TemplateVariableMeta[]
} {
	const variableMap = new Map<string, TemplateVariableMeta>()
	const allowedNames = new Set<string>()

	// 1. Add global variables by default
	if (options.includeGlobal !== false) {
		for (const gVar of GLOBAL_TEMPLATE_VARIABLES) {
			variableMap.set(gVar.name.toLowerCase(), gVar)
			allowedNames.add(gVar.name.toLowerCase())
		}
	}

	// 2. Add scope-specific variables if scopeId is provided
	let scopeParams: readonly TemplateVariableMeta[] | undefined
	if (options.scopeId && globalScopeVariablesResolver) {
		scopeParams = globalScopeVariablesResolver(options.scopeId)
		if (scopeParams) {
			for (const sVar of scopeParams) {
				variableMap.set(sVar.name.toLowerCase(), sVar)
				allowedNames.add(sVar.name.toLowerCase())
			}
		}
	}

	// 3. Add registered command variables if scope is custom commands or explicitly provided
	if (options.scopeId === 'commands.custom') {
		for (const cmdVar of REGISTERED_COMMAND_VARIABLES) {
			allowedNames.add(cmdVar.toLowerCase())
		}
	}

	// 4. Add allowed / custom parameter variables
	if (options.allowedVariables) {
		for (const aVar of options.allowedVariables) {
			variableMap.set(aVar.name.toLowerCase(), aVar)
			allowedNames.add(aVar.name.toLowerCase())
		}
	}

	if (options.customVariables) {
		for (const cVar of options.customVariables) {
			variableMap.set(cVar.name.toLowerCase(), cVar)
			allowedNames.add(cVar.name.toLowerCase())
		}
	}

	return { variableMap, allowedNames, scopeParams }
}

/**
 * Generates smart suggestions for an invalid variable token in a given scope.
 */
export function getSuggestionsForVariable(
	rawVarName: string,
	options: TemplateValidationOptions = {},
): string[] {
	const trimmed = rawVarName.trim()
	const parts = trimmed.split(/\s+/)
	const name = parts[0]?.toLowerCase() || ''
	const { allowedNames } = getAllowedVariables(options)

	const suggestions: string[] = []

	// 1. Check exact scope-specific mappings
	if (options.scopeId && SCOPE_COMMON_MAPPINGS[options.scopeId]) {
		const scopeMap = SCOPE_COMMON_MAPPINGS[options.scopeId]
		const mapping = scopeMap ? scopeMap[name] : undefined
		if (mapping) {
			for (const sug of mapping) {
				if (allowedNames.has(sug.toLowerCase()) || sug.startsWith('core.')) {
					suggestions.push(sug)
				}
			}
		}
	}

	// 2. Check universal global mappings
	if (GLOBAL_COMMON_MAPPINGS[name]) {
		for (const sug of GLOBAL_COMMON_MAPPINGS[name]) {
			if (allowedNames.has(sug.toLowerCase()) || sug.startsWith('core.')) {
				if (!suggestions.includes(sug)) {
					suggestions.push(sug)
				}
			}
		}
	}

	// 3. Check if root dot-prefix exists in scope (e.g. user typed "follower.username" -> suggest "follower.name")
	if (name.includes('.')) {
		const root = name.split('.')[0]
		for (const allowed of allowedNames) {
			if (allowed.startsWith(`${root}.`)) {
				if (!suggestions.includes(allowed)) {
					suggestions.push(allowed)
				}
			}
		}
	}

	// 4. Levenshtein distance & fuzzy match against all valid names
	const scoredCandidates: Array<{ name: string, score: number }> = []

	for (const allowed of allowedNames) {
		if (suggestions.includes(allowed))
			continue

		// Positional argument digits (1, 2, etc.) do not need fuzzy match unless typed as digit
		if (/^\d+$/.test(allowed) && !/^\d+$/.test(name))
			continue

		const dist = levenshteinDistance(name, allowed)

		// Substring match bonus
		if (allowed.includes(name) || name.includes(allowed)) {
			scoredCandidates.push({ name: allowed, score: Math.min(dist, 1) })
		}
		else if (dist <= 3) {
			scoredCandidates.push({ name: allowed, score: dist })
		}
	}

	scoredCandidates.sort((a, b) => a.score - b.score)

	for (const candidate of scoredCandidates.slice(0, 3)) {
		if (!suggestions.includes(candidate.name)) {
			suggestions.push(candidate.name)
		}
	}

	return suggestions
}

/**
 * Validates a template string against a specific scope and variable configuration.
 */
export function validateTemplate(
	template: string,
	options: TemplateValidationOptions = {},
): TemplateValidationResult {
	if (!template || typeof template !== 'string') {
		return {
			isValid: true,
			tokens: [],
			invalidVariables: [],
			validVariables: [],
		}
	}

	const rawTokens = tokenizeTemplate(template)
	const { allowedNames } = getAllowedVariables(options)

	const tokens: TemplateToken[] = []
	const invalidVariables: TemplateToken[] = []
	const validVariables: TemplateToken[] = []

	for (const rawToken of rawTokens) {
		const trimmedExpr = rawToken.name.trim()
		const parts = trimmedExpr.split(/\s+/)
		const rootName = parts[0]?.toLowerCase() || ''

		// Check if it is a legacy token
		if (rawToken.type === 'legacy_brace' || rawToken.type === 'legacy_paren') {
			let suggestedVar = rootName === '#' ? 'randint' : rootName
			const smartSuggestions = getSuggestionsForVariable(suggestedVar, options)
			if (smartSuggestions.length > 0 && smartSuggestions[0]) {
				suggestedVar = smartSuggestions[0]
			}

			const tokenObj: TemplateToken = {
				...rawToken,
				isValid: false,
				reason: `Legacy syntax "${rawToken.raw}". Use "$(${suggestedVar})" instead.`,
				suggestions: [suggestedVar, ...smartSuggestions.filter(s => s !== suggestedVar)],
			}
			tokens.push(tokenObj)
			invalidVariables.push(tokenObj)
			continue
		}

		// Standard $(...) token validation
		// Positional numbers $(1), $(2) are only valid in custom commands or if explicitly declared
		const isPositionalNumber = /^\d+$/.test(rootName) && (options.scopeId === 'commands.custom' || allowedNames.has(rootName))
		// Positional query parameters $(query.1), $(query.2) are valid in custom commands
		const isQueryPositional = options.scopeId === 'commands.custom' && /^query\.\d+$/.test(rootName)
		const isValidName = allowedNames.has(rootName) || isPositionalNumber || isQueryPositional

		if (isValidName) {
			const tokenObj: TemplateToken = {
				...rawToken,
				isValid: true,
				suggestions: [],
			}
			tokens.push(tokenObj)
			validVariables.push(tokenObj)
		}
		else {
			const suggestions = getSuggestionsForVariable(rootName, options)
			const scopeName = options.scopeId || 'this scope'
			const reason = `Variable "$(${rootName})" is not available in ${scopeName}.`

			const tokenObj: TemplateToken = {
				...rawToken,
				isValid: false,
				reason,
				suggestions,
			}
			tokens.push(tokenObj)
			invalidVariables.push(tokenObj)
		}
	}

	return {
		isValid: invalidVariables.length === 0,
		tokens,
		invalidVariables,
		validVariables,
	}
}
