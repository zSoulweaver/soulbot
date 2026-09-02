import type { CommandContext } from '../types'

export interface VariableExample {
	syntax: string
	description: string
	output?: string
}

export interface CommandVariableDefinition {
	name: string
	description: string
	examples: VariableExample[]
	resolve: (args: string[], ctx: CommandContext, cache: Record<string, any>) => string | Promise<string>
}
