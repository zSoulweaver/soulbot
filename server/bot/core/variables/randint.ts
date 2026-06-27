import { defineCommandVariable } from '../define-command-variable'

/**
 * Random integer variable resolver: $(randint), $(randint start end)
 */
export const randintVariable = defineCommandVariable({
	name: 'randint',
	description: 'Generates a random integer. Defaults to 1-100 or uses the specified range.',
	examples: [
		{ syntax: '$(randint)', description: 'Random integer from 1 to 100.' },
		{ syntax: '$(randint 10 50)', description: 'Random integer from 10 to 50.' },
	],
	resolve: (args) => {
		let min = 1
		let max = 100

		if (args.length === 1) {
			const val = Number.parseInt(args[0] ?? '', 10)
			if (!Number.isNaN(val)) {
				max = val
			}
		}
		else if (args.length >= 2) {
			const val1 = Number.parseInt(args[0] ?? '', 10)
			const val2 = Number.parseInt(args[1] ?? '', 10)
			if (!Number.isNaN(val1) && !Number.isNaN(val2)) {
				min = Math.min(val1, val2)
				max = Math.max(val1, val2)
			}
		}

		const rand = Math.floor(Math.random() * (max - min + 1)) + min
		return String(rand)
	},
})
