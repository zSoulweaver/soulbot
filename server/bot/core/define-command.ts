import type { CommandDefinition } from './types'

export function defineCommand<TArgs>(def: CommandDefinition<TArgs>): CommandDefinition<TArgs> {
	return def
}
