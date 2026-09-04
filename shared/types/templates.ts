export type TemplateCategory = 'command' | 'general'
export type TemplateDomain = 'commands' | 'alerts' | 'discord' | 'vault' | 'gambling' | 'ads' | 'widgets' | 'timers' | 'custom_commands' | (string & {})

export interface TemplateParamDefinition {
	name: string
	label: string
	description: string
	example: string | number | boolean
	category?: 'event' | 'global' | 'custom'
}

export type TemplateVariableMeta = TemplateParamDefinition

export interface TemplateToken {
	raw: string
	name: string
	type: 'standard' | 'legacy_brace' | 'legacy_paren'
	startIndex: number
	endIndex: number
	isValid: boolean
	reason?: string
	suggestions: string[]
}

export interface TemplateValidationOptions {
	scopeId?: string
	allowedVariables?: TemplateVariableMeta[]
	customVariables?: TemplateVariableMeta[]
	includeGlobal?: boolean
}

export interface TemplateValidationResult {
	isValid: boolean
	tokens: TemplateToken[]
	invalidVariables: TemplateToken[]
	validVariables: TemplateToken[]
}

export const GLOBAL_TEMPLATE_VARIABLES: TemplateVariableMeta[] = [
	{
		name: 'core.currency',
		label: 'Dynamic Currency Name',
		description: 'Automatically switches between singular and plural currency name based on amount.',
		example: 'Points',
		category: 'global',
	},
	{
		name: 'core.currency_singular',
		label: 'Singular Currency Name',
		description: 'The singular name configured for stream currency (e.g. "Point").',
		example: 'Point',
		category: 'global',
	},
	{
		name: 'core.currency_plural',
		label: 'Plural Currency Name',
		description: 'The plural name configured for stream currency (e.g. "Points").',
		example: 'Points',
		category: 'global',
	},
	{
		name: 'channel',
		label: 'Channel Name',
		description: 'The current Twitch broadcaster channel login name.',
		example: 'streamer',
		category: 'global',
	},
	{
		name: 'uptime',
		label: 'Stream Uptime',
		description: 'Formatted duration the stream has been live.',
		example: '2 hours 15 minutes',
		category: 'global',
	},
	{
		name: 'followage',
		label: 'Follow Age',
		description: 'How long the user has been following the channel.',
		example: '1 year 4 months',
		category: 'global',
	},
	{
		name: 'randint',
		label: 'Random Number',
		description: 'Generates a random integer (1-100 by default, or $(randint min max)).',
		example: '42',
		category: 'global',
	},
	{
		name: 'points',
		label: 'User Points Balance',
		description: 'The current points balance of the user.',
		example: '1500',
		category: 'global',
	},
]
