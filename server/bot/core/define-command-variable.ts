import type { CommandVariableDefinition } from './variables/types'

/**
 * Type-safe identity helper to define dynamic bot command variables and their documentation metadata.
 */
export function defineCommandVariable(def: CommandVariableDefinition): CommandVariableDefinition {
	return def
}
