import { eq } from 'drizzle-orm'
import { db } from '~~/server/database'
import { counters } from '~~/server/database/schema'
import { defineCommandVariable } from '../define-command-variable'

/**
 * Counters variable resolver: $(count), $(count name), $(count name modifier)
 */
export const countersVariable = defineCommandVariable({
	name: 'count',
	description: 'Evaluates persistent, database-backed chat counters that can increment, decrement, set, or reset.',
	examples: [
		{ syntax: '$(count)', description: 'Increments and returns a persistent counter named after the current command trigger.' },
		{ syntax: '$(count [name])', description: 'Increments and returns a custom persistent counter (e.g. $(count bossfails) increments a counter named "bossfails").' },
		{ syntax: '$(count [name] +N)', description: 'Increments the custom named counter by N (e.g. $(count wins +5)).' },
		{ syntax: '$(count [name] -N)', description: 'Decrements the custom named counter by N (e.g. $(count wins -2)).' },
		{ syntax: '$(count [name] N)', description: 'Explicitly sets the custom named counter to the absolute value N (e.g. $(count wins 50)).' },
		{ syntax: '$(count [name] reset)', description: 'Resets the custom named counter to 0, returning 0.' },
	],
	resolve: async (args, ctx) => {
		// If no custom counter name is provided, default to the current active trigger name
		let counterName = args[0] || ctx.state.trigger
		if (!counterName) {
			return '0'
		}

		counterName = counterName.toLowerCase()

		// Default modifier is +1 (increment by 1)
		let modifier = args[1] || '+1'

		// If there's only one argument, check if it's actually a modifier instead of a name.
		const firstArg = args[0]
		if (args.length === 1 && firstArg && (/^[+-]\d+$/.test(firstArg) || firstArg.toLowerCase() === 'reset' || /^\d+$/.test(firstArg))) {
			counterName = ctx.state.trigger || 'default'
			modifier = firstArg
		}

		// Fetch current value from SQLite
		let currentVal = 0
		const [dbCounter] = await db.select().from(counters).where(eq(counters.name, counterName))
		if (dbCounter) {
			currentVal = dbCounter.value
		}

		let newVal = currentVal

		if (modifier.toLowerCase() === 'reset') {
			newVal = 0
		}
		else if (/^[+-]\d+$/.test(modifier)) {
			const change = Number(modifier)
			newVal = currentVal + change
		}
		else if (/^\d+$/.test(modifier)) {
			newVal = Number(modifier)
		}
		else {
			// Invalid modifier, default to increment by 1
			newVal = currentVal + 1
		}

		// Persist the new counter value in the database
		await db.insert(counters)
			.values({ name: counterName, value: newVal })
			.onConflictDoUpdate({
				target: counters.name,
				set: { value: newVal },
			})

		return String(newVal)
	},
})
