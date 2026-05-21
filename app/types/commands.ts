// Types extracted directly from the Nitro server event handler return type
export type CommandsResponse = Awaited<ReturnType<typeof import('~~/server/api/commands/index.get').default>>

export type CoreCommand = CommandsResponse[number]
export type Template = CoreCommand['templates'][number]

export interface Alias extends Omit<CoreCommand['aliases'][number], 'id'> {
	id?: number
}

export interface Command extends Omit<CoreCommand, 'aliases' | 'subcommands'> {
	parentTriggerPath?: string
	aliases: Alias[]
	hasHandler?: boolean
	subcommands?: CoreCommand['subcommands']
}
