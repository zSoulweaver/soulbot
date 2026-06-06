export type TimersListResponse = Awaited<ReturnType<typeof import('~~/server/api/timers/index.get').default>>
export type Timer = TimersListResponse['data'][number]

export interface TimerMessage {
	text: string
	enabled: boolean
}
