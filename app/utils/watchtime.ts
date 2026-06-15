export function formatWatchTime(minutes: number): string {
	if (minutes <= 0)
		return '0 minutes'

	const years = Math.floor(minutes / 525600)
	let remaining = minutes % 525600
	const days = Math.floor(remaining / 1440)
	remaining = remaining % 1440
	const hours = Math.floor(remaining / 60)
	const mins = remaining % 60

	const parts: string[] = []
	if (years > 0)
		parts.push(years === 1 ? '1 year' : `${years} years`)
	if (days > 0)
		parts.push(days === 1 ? '1 day' : `${days} days`)
	if (hours > 0)
		parts.push(hours === 1 ? '1 hour' : `${hours} hours`)
	if (mins > 0)
		parts.push(mins === 1 ? '1 minute' : `${mins} minutes`)

	return parts.join(' ')
}
