import { describe, expect, it } from 'vitest'
import { initRegistry } from '~~/server/bot'
import { templateRegistry } from '~~/server/bot/core/templates'
import {
	getAllowedVariables,
	getSuggestionsForVariable,
	tokenizeTemplate,
	validateTemplate,
} from '~~/shared/utils/template-validator'

describe('Template Variable Tokenizer & Validator Engine', () => {
	describe('tokenizeTemplate', () => {
		it('should extract standard $(var) tokens', () => {
			const tokens = tokenizeTemplate('Hello $(follower), you have $(points) $(core.currency)!')
			expect(tokens).toHaveLength(3)
			expect(tokens[0]).toMatchObject({ raw: '$(follower)', name: 'follower', type: 'standard' })
			expect(tokens[1]).toMatchObject({ raw: '$(points)', name: 'points', type: 'standard' })
			expect(tokens[2]).toMatchObject({ raw: '$(core.currency)', name: 'core.currency', type: 'standard' })
		})

		it('should extract legacy curly {var} tokens', () => {
			const tokens = tokenizeTemplate('Welcome {user} to $(server)!')
			expect(tokens).toHaveLength(2)
			expect(tokens[0]).toMatchObject({ raw: '{user}', name: 'user', type: 'legacy_brace' })
			expect(tokens[1]).toMatchObject({ raw: '$(server)', name: 'server', type: 'standard' })
		})

		it('should extract legacy unescaped parentheses tokens like (#) and (uptime)', () => {
			const tokens = tokenizeTemplate('Stream uptime is (uptime) and roll is (#)!')
			expect(tokens).toHaveLength(2)
			expect(tokens[0]).toMatchObject({ raw: '(uptime)', name: 'uptime', type: 'legacy_paren' })
			expect(tokens[1]).toMatchObject({ raw: '(#)', name: '#', type: 'legacy_paren' })
		})

		it('should ignore regular non-variable parentheses in text', () => {
			const tokens = tokenizeTemplate('Betting closes in $(duration) seconds! (Multiplier: $(multiplier)x)')
			expect(tokens).toHaveLength(2)
			expect(tokens[0]?.name).toBe('duration')
			expect(tokens[1]?.name).toBe('multiplier')
		})

		it('should handle empty or null template input safely', () => {
			expect(tokenizeTemplate('')).toEqual([])
			expect(tokenizeTemplate(null as any)).toEqual([])
		})
	})

	describe('getAllowedVariables', () => {
		it('should include global variables by default', () => {
			const { allowedNames } = getAllowedVariables()
			expect(allowedNames.has('core.currency')).toBe(true)
			expect(allowedNames.has('uptime')).toBe(true)
			expect(allowedNames.has('points')).toBe(true)
			expect(allowedNames.has('channel')).toBe(true)
		})

		it('should include scope-specific variables for follow alert', () => {
			const { allowedNames } = getAllowedVariables({ scopeId: 'eventsub.alert.follow' })
			expect(allowedNames.has('follower')).toBe(true)
			expect(allowedNames.has('follower.name')).toBe(true)
			expect(allowedNames.has('follower.id')).toBe(true)
			expect(allowedNames.has('subscriber')).toBe(false)
		})

		it('should include command parameters if passed in customVariables', () => {
			const { allowedNames } = getAllowedVariables({
				customVariables: [
					{ name: 'amount', label: 'Amount', description: '', example: 100 },
					{ name: 'target', label: 'Target', description: '', example: 'user' },
				],
			})
			expect(allowedNames.has('amount')).toBe(true)
			expect(allowedNames.has('target')).toBe(true)
		})
	})

	describe('getSuggestionsForVariable', () => {
		it('should suggest follower for $(user) in follow alert scope', () => {
			const suggestions = getSuggestionsForVariable('user', { scopeId: 'eventsub.alert.follow' })
			expect(suggestions).toContain('follower')
		})

		it('should suggest subscriber for $(user) in sub alert scope', () => {
			const suggestions = getSuggestionsForVariable('user', { scopeId: 'eventsub.alert.sub' })
			expect(suggestions).toContain('subscriber')
		})

		it('should suggest gifter for $(gift) or $(user) in gift alert scope', () => {
			const suggestions = getSuggestionsForVariable('gift', { scopeId: 'eventsub.alert.gift' })
			expect(suggestions).toContain('gifter')
		})

		it('should suggest core.currency for $(currency) or $(curr)', () => {
			const suggestions = getSuggestionsForVariable('currency', { scopeId: 'commands.custom' })
			expect(suggestions).toContain('core.currency')
		})

		it('should suggest close typo matches via Levenshtein distance', () => {
			const suggestions = getSuggestionsForVariable('followr', { scopeId: 'eventsub.alert.follow' })
			expect(suggestions).toContain('follower')
		})
	})

	describe('validateTemplate', () => {
		it('should mark a valid follow alert template as valid', () => {
			const result = validateTemplate('Thank you for the follow, $(follower)!', {
				scopeId: 'eventsub.alert.follow',
			})
			expect(result.isValid).toBe(true)
			expect(result.invalidVariables).toHaveLength(0)
			expect(result.validVariables).toHaveLength(1)
		})

		it('should detect $(user) as invalid in follow alert scope and suggest $(follower)', () => {
			const result = validateTemplate('Thank you for the follow, $(user)!', {
				scopeId: 'eventsub.alert.follow',
			})
			expect(result.isValid).toBe(false)
			expect(result.invalidVariables).toHaveLength(1)
			expect(result.invalidVariables[0]?.name).toBe('user')
			expect(result.invalidVariables[0]?.suggestions).toContain('follower')
		})

		it('should flag legacy {follower} curly syntax as invalid with suggestion', () => {
			const result = validateTemplate('Thank you for the follow, {follower}!', {
				scopeId: 'eventsub.alert.follow',
			})
			expect(result.isValid).toBe(false)
			expect(result.invalidVariables).toHaveLength(1)
			expect(result.invalidVariables[0]?.type).toBe('legacy_brace')
			expect(result.invalidVariables[0]?.suggestions).toContain('follower')
		})

		it('should flag legacy (#) unescaped paren syntax as invalid with suggestion $(randint)', () => {
			const result = validateTemplate('Your lucky number is (#)!', {
				scopeId: 'commands.custom',
			})
			expect(result.isValid).toBe(false)
			expect(result.invalidVariables).toHaveLength(1)
			expect(result.invalidVariables[0]?.type).toBe('legacy_paren')
			expect(result.invalidVariables[0]?.suggestions).toContain('randint')
		})

		it('should validate custom command templates with positional args and sender/touser', () => {
			const result = validateTemplate('$(sender), you gave $(1) points to $(touser)! Balance: $(points)', {
				scopeId: 'commands.custom',
			})
			expect(result.isValid).toBe(true)
			expect(result.invalidVariables).toHaveLength(0)
			expect(result.validVariables).toHaveLength(4)
		})

		it('should validate command templates with custom parameter definitions', () => {
			const result = validateTemplate('Added $(amount) $(core.currency) to $(target).', {
				customVariables: [
					{ name: 'amount', label: 'Amount', description: '', example: 100 },
					{ name: 'target', label: 'Target', description: '', example: 'user' },
				],
			})
			expect(result.isValid).toBe(true)
			expect(result.invalidVariables).toHaveLength(0)
			expect(result.validVariables).toHaveLength(3)
		})

		it('should detect invalid parameter typos in command templates', () => {
			const result = validateTemplate('Added $(amont) $(core.currency) to $(target).', {
				customVariables: [
					{ name: 'amount', label: 'Amount', description: '', example: 100 },
					{ name: 'target', label: 'Target', description: '', example: 'user' },
				],
			})
			expect(result.isValid).toBe(false)
			expect(result.invalidVariables).toHaveLength(1)
			expect(result.invalidVariables[0]?.name).toBe('amont')
			expect(result.invalidVariables[0]?.suggestions).toContain('amount')
		})

		it('should strictly reject unknown dot properties on valid variable prefixes', () => {
			const result = validateTemplate('Follower: $(follower.unknown_property)', {
				scopeId: 'eventsub.alert.follow',
			})
			expect(result.isValid).toBe(false)
			expect(result.invalidVariables).toHaveLength(1)
			expect(result.invalidVariables[0]?.name).toBe('follower.unknown_property')
			expect(result.invalidVariables[0]?.suggestions).toContain('follower.name')
			expect(result.invalidVariables[0]?.suggestions).toContain('follower.id')
		})

		it('should tokenize and validate nested variable expressions', () => {
			// Valid nested expression
			const validResult = validateTemplate('User $(points $(sender.name)) points', {
				scopeId: 'commands.custom',
			})
			expect(validResult.isValid).toBe(true)
			expect(validResult.tokens).toHaveLength(2)

			// Invalid outer variable with valid inner variable
			const invalidResult = validateTemplate('User $(unknown_func $(sender.name)) points', {
				scopeId: 'commands.custom',
			})
			expect(invalidResult.isValid).toBe(false)
			expect(invalidResult.invalidVariables).toHaveLength(1)
			expect(invalidResult.invalidVariables[0]?.name).toBe('unknown_func')
		})

		it('should allow positional query numbers in custom commands', () => {
			const result = validateTemplate('First: $(query.1) and Fifth: $(query.5)', {
				scopeId: 'commands.custom',
			})
			expect(result.isValid).toBe(true)
			expect(result.invalidVariables).toHaveLength(0)
		})

		it('should extract and suggest valid replacements for legacy paren keywords like (streamer)', () => {
			const result = validateTemplate('Welcome to (streamer)\'s stream! Duration: (duration)', {
				scopeId: 'eventsub.alert.live',
			})
			expect(result.isValid).toBe(false)
			expect(result.invalidVariables).toHaveLength(2)
			expect(result.invalidVariables[0]?.raw).toBe('(streamer)')
			expect(result.invalidVariables[0]?.suggestions).toContain('broadcaster')
		})

		it('should suggest duration for $(time) in eventsub.alert.adbreak scope', () => {
			const suggestions = getSuggestionsForVariable('time', { scopeId: 'eventsub.alert.adbreak' })
			expect(suggestions).toContain('duration')
		})

		it('should handle whitespace inside token tags gracefully', () => {
			const result = validateTemplate('Hello $(   follower.name   ) and $( randint  10  50 )!', {
				scopeId: 'eventsub.alert.follow',
			})
			expect(result.isValid).toBe(true)
			expect(result.tokens).toHaveLength(2)
		})

		it('should reject positional digits $(1) outside custom commands', () => {
			const result = validateTemplate('Hello $(1)!', {
				scopeId: 'eventsub.alert.follow',
			})
			expect(result.isValid).toBe(false)
			expect(result.invalidVariables).toHaveLength(1)
			expect(result.invalidVariables[0]?.name).toBe('1')
		})

		it('should validate all registered templates in templateRegistry as 100% valid', () => {
			initRegistry()
			for (const def of templateRegistry.all()) {
				const result = validateTemplate(def.default, { scopeId: def.id })
				expect(result.isValid, `Scope ${def.id} default template should be valid: "${def.default}"`).toBe(true)
				expect(result.invalidVariables).toHaveLength(0)
			}
		})

		it('should not treat arbitrary english words in parens as variable tokens', () => {
			const tokens = tokenizeTemplate('Please note (needed) and (optional) parameters.')
			expect(tokens).toHaveLength(0)
		})
	})
})
