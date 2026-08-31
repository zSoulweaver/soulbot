import type { CommandContext } from './types'
import { getGlobalTemplateVariables } from './templates'
import { channelVariable } from './variables/channel'
import { countersVariable } from './variables/counters'
import { followageVariable } from './variables/followage'
import { pointsVariable } from './variables/points'
import { queryVariable } from './variables/query'
import { randintVariable } from './variables/randint'
import { senderVariable } from './variables/sender'
import { touserVariable } from './variables/touser'
import { uptimeVariable } from './variables/uptime'

export const registeredVariables = [
	channelVariable,
	countersVariable,
	pointsVariable,
	queryVariable,
	senderVariable,
	touserVariable,
	randintVariable,
	uptimeVariable,
	followageVariable,
]

/**
 * Main parser that parses dynamic template strings, evaluating innermost variables first.
 * Recursion guard prevents loops from nesting deeper than 10 levels.
 */
export async function renderCustomTemplate(
	template: string,
	ctx: CommandContext,
	extraVars?: Record<string, string | number>,
): Promise<string> {
	// Pre-process legacy Phantombot syntax: (#) -> $(randint), (followage) -> $(followage), (uptime) -> $(uptime)
	let text = template
		.replace(/(?<!\$)\(#\)/g, '$(randint)')
		.replace(/(?<!\$)\(followage\)/gi, '$(followage)')
		.replace(/(?<!\$)\(uptime\)/gi, '$(uptime)')

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

		const resolved = await resolveVariableExpression(expression, ctx, cache, extraVars)
		text = text.replace(fullMatch, resolved)
		depth++
	}

	return text
}

/**
 * Resolves a single, flattened variable expression.
 */
async function resolveVariableExpression(
	expr: string,
	ctx: CommandContext,
	cache: Record<string, any>,
	extraVars?: Record<string, string | number>,
): Promise<string> {
	const trimmedExpr = expr.trim()
	const parts = trimmedExpr.split(/\s+/)
	const rawName = parts[0]

	if (!rawName)
		return ''

	const args = parts.slice(1)

	// 1. Check if the exact expression is explicitly defined in extraVars (caller-passed parameters)
	if (extraVars && (trimmedExpr in extraVars || rawName in extraVars)) {
		const val = extraVars[trimmedExpr] ?? extraVars[rawName]
		if (val !== undefined) {
			return String(val)
		}
	}

	// 2. Check registered variables by exact rawName (e.g. user.points, sender, uptime)
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

	// 3. Fallback: Support period/dot-notation (e.g. $(user.name), $(user.id)) by splitting
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

	// 4. Check global template variables (e.g. core.currency, core.currency_singular, core.currency_plural)
	const globalVars = getGlobalTemplateVariables(extraVars || {})
	if (trimmedExpr in globalVars) {
		return String(globalVars[trimmedExpr])
	}

	// Return the original tag so it's not silently swallowed if it's invalid/unrecognized
	return `$(${expr})`
}

/**
 * Builds a lightweight mock CommandContext for parsing variables inside templates
 */
export function createTemplateContext(
	channel: string,
	user?: { id: string, name: string, displayName: string },
	rawArgs: string[] = [],
): CommandContext {
	const mockSay = async (_msg: string) => {}
	return {
		user: user || { id: '', name: '', displayName: '' },
		channel,
		rawArgs,
		args: undefined,
		say: mockSay as any,
		reply: mockSay as any,
		raw: {} as any, // Mock ChatMessage
		state: {},
	}
}
