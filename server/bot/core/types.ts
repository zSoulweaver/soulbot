import type { ChatMessage } from '@twurple/chat'
import type { TemplateData, TemplateName } from './templates'

export type CommandPermission
	= | 'broadcaster'
		| 'moderator'
		| 'vip'
		| 'subscriber'
		| 'everyone'

export interface CommandContext {
	user: {
		id: string
		name: string
		displayName: string
	}
	channel: string
	reply: ((text: string) => Promise<void>) & (<T extends TemplateName>(template: T, data: TemplateData<T>) => Promise<void>)
	say: ((text: string) => Promise<void>) & (<T extends TemplateName>(template: T, data: TemplateData<T>) => Promise<void>)
	raw: ChatMessage
}

export type InferArgs<T> = T extends { infer: infer Out } ? Out : T

export type CommandHandler<T = any> = (
	ctx: CommandContext,
	args: InferArgs<T>,
) => Promise<void> | void

export interface CommandDefinition<T = any> {
	id: string
	description: string
	permission: CommandPermission
	cost?: number
	cooldown?: number
	args?: T
	handler: CommandHandler<T>
	subcommands?: Record<string, SubcommandDefinition<any>>
}

export interface SubcommandDefinition<T = any> {
	description: string
	permission: CommandPermission
	args?: T
	handler: CommandHandler<T>
}
