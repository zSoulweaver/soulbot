export interface MigratedUser {
	id: string
	username: string
	displayName: string
	points: number
	watchTime: number // in minutes
}

export interface MigratedCommand {
	trigger: string
	response: string
}

export interface MigratedTimer {
	name: string
	enabled: boolean
	messages: { text: string, enabled: boolean }[]
	intervalOnline: number
	minMessages: number
}

export interface MigrationResult {
	currencyName?: string
	currencyNamePlural?: string
	users: MigratedUser[]
	commands: MigratedCommand[]
	timers: MigratedTimer[]
}
