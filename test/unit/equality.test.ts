import { describe, expect, it } from 'vitest'
import { reactive, ref } from 'vue'
import { useFormDraft } from '~~/app/composables/useFormDraft'
import { deepClone, isDeepEqual } from '~~/app/utils/equality'

describe('isDeepEqual Utility', () => {
	it('should correctly compare primitive values', () => {
		expect(isDeepEqual(1, 1)).toBe(true)
		expect(isDeepEqual('a', 'a')).toBe(true)
		expect(isDeepEqual(true, true)).toBe(true)
		expect(isDeepEqual(1, 2)).toBe(false)
		expect(isDeepEqual('a', 'b')).toBe(false)
		expect(isDeepEqual(null, undefined)).toBe(false)
		expect(isDeepEqual(null, null)).toBe(true)
	})

	it('should correctly compare nested objects', () => {
		const objA = { a: 1, b: { c: 'hello', d: [1, 2, 3] } }
		const objB = { a: 1, b: { c: 'hello', d: [1, 2, 3] } }
		const objC = { a: 1, b: { c: 'hello', d: [1, 2, 4] } }

		expect(isDeepEqual(objA, objB)).toBe(true)
		expect(isDeepEqual(objA, objC)).toBe(false)
	})

	it('should support ignored keys', () => {
		const objA = { a: 1, isDiscordConnected: true, updatedAt: 123 }
		const objB = { a: 1, isDiscordConnected: false, updatedAt: 456 }

		expect(isDeepEqual(objA, objB)).toBe(false)
		expect(isDeepEqual(objA, objB, ['isDiscordConnected', 'updatedAt'])).toBe(true)
	})
})

describe('deepClone Utility', () => {
	it('should clone primitive values and nulls', () => {
		expect(deepClone(123)).toBe(123)
		expect(deepClone('hello')).toBe('hello')
		expect(deepClone(null)).toBe(null)
		expect(deepClone(undefined)).toBe(undefined)
	})

	it('should safely clone Vue reactive proxy objects and arrays without error', () => {
		const reactiveObject = reactive({
			id: 'points',
			cost: 10,
			aliases: [
				{ trigger: 'pts', overrideArgs: ['all'] },
			],
		})

		const cloned = deepClone(reactiveObject)
		expect(cloned).toEqual({
			id: 'points',
			cost: 10,
			aliases: [
				{ trigger: 'pts', overrideArgs: ['all'] },
			],
		})

		// Ensure mutations to clone don't affect reactive source
		cloned.cost = 20
		cloned.aliases.push({ trigger: 'p', overrideArgs: ['all'] })
		expect(reactiveObject.cost).toBe(10)
		expect(reactiveObject.aliases).toHaveLength(1)
	})
})

describe('useFormDraft Composable', () => {
	it('should accurately track dirty modifications without mutating initial state', () => {
		const source = ref<{
			trigger: string
			cost: number
			aliases: { trigger: string }[]
		}>({
			trigger: 'points',
			cost: 10,
			aliases: [{ trigger: 'pts' }],
		})

		const { draft, isModified, reset } = useFormDraft(
			() => source.value,
			() => ({ trigger: '', cost: 0, aliases: [] }),
		)

		// Initially unmodified
		expect(isModified.value).toBe(false)

		// Mutate draft property
		draft.value.cost = 25
		expect(isModified.value).toBe(true)

		// Mutate back to original
		draft.value.cost = 10
		expect(isModified.value).toBe(false)

		// Mutate nested array
		draft.value.aliases.push({ trigger: 'p' })
		expect(isModified.value).toBe(true)

		// Reset draft
		reset()
		expect(isModified.value).toBe(false)
		expect(draft.value.aliases).toHaveLength(1)
	})
})
