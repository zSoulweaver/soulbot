import { registeredVariables } from '~~/server/bot/core/variables-engine'
import { requireUserRole } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
	await requireUserRole(event, 'moderator')

	const list = registeredVariables.map(v => ({
		name: v.name,
		description: v.description,
		examples: v.examples,
	}))

	// Append global template variables
	list.push({
		name: 'core.currency',
		description: 'Dynamic currency name. Automatically switches between singular and plural names based on point/amount context (defaults to plural).',
		examples: [
			{ syntax: '$(core.currency)', description: 'Resolves to either the singular or plural currency name.' },
		],
	}, {
		name: 'core.currency_singular',
		description: 'The singular name of the stream currency.',
		examples: [
			{ syntax: '$(core.currency_singular)', description: 'Resolves to the singular currency name (e.g. "Point").' },
		],
	}, {
		name: 'core.currency_plural',
		description: 'The plural name of the stream currency.',
		examples: [
			{ syntax: '$(core.currency_plural)', description: 'Resolves to the plural currency name (e.g. "Points").' },
		],
	})

	// Append positional command parameters
	list.push({
		name: '1, 2, ... N',
		description: 'Positional arguments passed to the command in Twitch chat.',
		examples: [
			{ syntax: '$(1)', description: 'Resolves to the first argument passed (e.g., in "!points gift @user 100", $(1) is "@user").' },
			{ syntax: '$(2)', description: 'Resolves to the second argument (e.g., "100").' },
		],
	})

	return list
})
