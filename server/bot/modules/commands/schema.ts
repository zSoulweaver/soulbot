import { z } from 'zod'

export const RenameArgs = z.tuple([
	z.string().describe('old trigger'),
	z.string().describe('new trigger'),
])

export const AliasArgs = z.tuple([
	z.string().describe('alias name'),
	z.string().describe('target command'),
]).rest(z.string())

export const UnaliasArgs = z.tuple([
	z.string().describe('alias name'),
])
