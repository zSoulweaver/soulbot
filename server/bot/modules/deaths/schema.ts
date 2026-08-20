import { z } from 'zod'

// Parses optional amount (default 1) and optional trailing counter name
// Supports: "!deaths add", "!deaths add 5", "!deaths add 5 DLC", "!deaths add DLC"
export const DeathsAmountArgs = z.array(z.string()).transform((args) => {
	if (args.length === 0) {
		return { amount: 1, counter: undefined as string | undefined }
	}
	const firstNum = Number(args[0])
	if (!Number.isNaN(firstNum) && Number.isInteger(firstNum) && firstNum > 0) {
		const counter = args.slice(1).join(' ').trim() || undefined
		return { amount: firstNum, counter }
	}
	// First arg is text/counter name (amount defaults to 1)
	const counter = args.join(' ').trim() || undefined
	return { amount: 1, counter }
})

// Parses non-negative count and optional trailing counter name
// Supports: "!deaths set 10", "!deaths set 10 DLC"
export const DeathsSetArgs = z.array(z.string()).refine(args => args.length > 0, {
	message: 'must specify a death count',
}).transform((args, ctx) => {
	const count = Number(args[0])
	if (Number.isNaN(count) || !Number.isInteger(count) || count < 0) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'count must be a non-negative integer',
		})
		return z.NEVER
	}
	const counter = args.slice(1).join(' ').trim() || undefined
	return { count, counter }
})

// Parses counter name for selecting / switching active counter
// Supports: "!deaths select DLC", "!deaths switch Shadow of the Erdtree"
export const DeathsSelectArgs = z.array(z.string()).refine(args => args.length > 0, {
	message: 'must specify a counter name',
}).transform(args => args.join(' ').trim())

// Parses old name and new name for renaming
// Supports: "!deaths rename DLC to DLC Run", "!deaths rename DLC -> DLC Run", "!deaths rename DLC, DLC Run"
export const DeathsRenameArgs = z.array(z.string()).transform((args, ctx): { oldName: string, newName: string } => {
	const text = args.join(' ')
	const separatorMatch = text.match(/\s+(?:to|->|,)\s+/)
	if (separatorMatch && separatorMatch.index !== undefined) {
		const oldName = text.slice(0, separatorMatch.index).trim()
		const newName = text.slice(separatorMatch.index + separatorMatch[0].length).trim()
		if (oldName && newName) {
			return { oldName, newName }
		}
	}
	if (args.length >= 2 && args[0]) {
		return { oldName: args[0], newName: args.slice(1).join(' ') }
	}
	ctx.addIssue({
		code: z.ZodIssueCode.custom,
		message: 'usage: !deaths rename <old name> to <new name>',
	})
	return z.NEVER
})

// Parses optional counter name for reset
// Supports: "!deaths reset", "!deaths reset DLC"
export const DeathsResetArgs = z.array(z.string()).transform(args => args.join(' ').trim() || undefined)
