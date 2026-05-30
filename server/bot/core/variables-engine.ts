import type { CommandContext } from './types'
import { getGlobalTemplateVariables } from './templates'
import { channelVariable } from './variables/channel'
import { countersVariable } from './variables/counters'
import { pointsVariable } from './variables/points'
import { queryVariable } from './variables/query'
import { senderVariable } from './variables/sender'
import { touserVariable } from './variables/touser'

export const registeredVariables = [
	channelVariable,
	countersVariable,
	pointsVariable,
	queryVariable,
	senderVariable,
	touserVariable,
]

/**
 * Main parser that parses dynamic template strings, evaluating innermost variables first.
 * Recursion guard prevents loops from nesting deeper than 10 levels.
 */
export async function renderCustomTemplate(template: string, ctx: CommandContext): Promise<string> {
	let text = template
	let depth = 0
	const maxDepth = 10

	// Dynamic values state cache per resolution run to avoid redundant queries (e.g. points check)
	const cache: Record<string, any> = {}

	// Loop to resolve innermost $(...) parenthetical variables first (which contain no other parentheses)
	while (depth < maxDepth) {
		const match = text.match(/\$\(([^()]+)\)/)
		if (!match)
			break

		const fullMatch = match[0]
		const expression = match[1]

		if (!expression)
			break

		const resolved = await resolveVariableExpression(expression, ctx, cache)
		text = text.replace(fullMatch, resolved)
		depth++
	}

	return text
}

/**
 * Resolves a single, flattened variable expression.
 */
async function resolveVariableExpression(expr: string, ctx: CommandContext, cache: Record<string, any>): Promise<string> {
	const parts = expr.trim().split(/\s+/)
	const rawName = parts[0]

	if (!rawName)
		return ''

	const args = parts.slice(1)

	// Find registered variable by exact rawName first (handles direct aliases like user.points)
	const exactMatch = registeredVariables.find(
		v => v.name === rawName.toLowerCase() || v.aliases?.map(a => a.toLowerCase()).includes(rawName.toLowerCase()),
	)

	if (exactMatch) {
		try {
			return await exactMatch.resolve(args, ctx, cache)
		}
		catch (err) {
			console.error(`Error resolving variable ${rawName}:`, err)
			return `$(${expr})`
		}
	}

	// Fallback: Support period/dot-notation (e.g. $(user.name), $(user.id)) by splitting
	const dotParts = rawName.split('.')
	const rootName = dotParts[0]?.toLowerCase() || ''
	let extendedArgs = [...args]

	if (dotParts.length > 1) {
		// Prepend subfields to the arguments array (e.g. user.name -> ['name'])
		extendedArgs = [...dotParts.slice(1), ...extendedArgs]
	}

	// Direct resolution of positional variables e.g. $(1) to $(N)
	if (/^\d+$/.test(rootName)) {
		const index = Number(rootName) - 1
		return ctx.rawArgs[index] || ''
	}

	// Find registered variable by rootName or rootName alias
	const variableDef = registeredVariables.find(
		v => v.name === rootName || v.aliases?.map(a => a.toLowerCase()).includes(rootName),
	)

	if (variableDef) {
		try {
			return await variableDef.resolve(extendedArgs, ctx, cache)
		}
		catch (err) {
			console.error(`Error resolving variable ${rootName}:`, err)
			return `$(${expr})`
		}
	}

	// Check if it's a global template variable from templates.ts (e.g. core.currency)
	const globalVars = getGlobalTemplateVariables({})
	if (expr in globalVars) {
		return String(globalVars[expr])
	}

	// Return the original tag so it's not silently swallowed if it's invalid/unrecognized
	return `$(${expr})`
}
