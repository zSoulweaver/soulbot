import type { ChatMessage } from '@twurple/chat'
import type { CommandTemplates } from './templates'

export type TemplateName = keyof CommandTemplates
export type TemplateData<T extends TemplateName> = CommandTemplates[T]

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
	reply: ((text: string) => Promise<void>) & (<T extends TemplateName>(
		template: T,
		...args: TemplateData<T> extends undefined | Record<string, never> ? [] : [TemplateData<T>]
	) => Promise<void>)
	say: ((text: string) => Promise<void>) & (<T extends TemplateName>(
		template: T,
		...args: TemplateData<T> extends undefined | Record<string, never> ? [] : [TemplateData<T>]
	) => Promise<void>)
	raw: ChatMessage
}

export type InferArgs<T> = T extends { _output: infer Out } ? Out : T

export type CommandHandler<T = any> = (
	ctx: CommandContext,
	args: InferArgs<T>,
) => Promise<void> | void

export interface CommandDefinition<T = any> {
	id: string
	description: string
	usage?: string
	permission: CommandPermission
	cost?: number
	cooldown?: number
	args?: T
	handler: CommandHandler<T>
	subcommands?: Record<string, SubcommandDefinition<any>>
}

export interface SubcommandDefinition<T = any> {
	description: string
	usage?: string
	permission: CommandPermission
	args?: T
	handler: CommandHandler<T>
}
