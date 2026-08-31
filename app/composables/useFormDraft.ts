import { computed, ref, watch } from 'vue'
import { deepClone, isDeepEqual } from '~/utils/equality'

export interface UseFormDraftOptions<T> {
	ignoreKeys?: (keyof T | string)[]
	transform?: (data: T) => T
}

export function useFormDraft<T extends Record<string, any>>(
	source: () => T | null | undefined,
	defaultFactory: () => T,
	options: UseFormDraftOptions<T> = {},
) {
	const draft = ref<T>(defaultFactory())
	const initial = ref<T | null>(null)

	function reset() {
		const raw = source()
		if (raw) {
			initial.value = deepClone(raw) as T
			const draftVal = deepClone(raw) as T
			draft.value = options.transform ? options.transform(draftVal) : draftVal
		}
		else {
			initial.value = null
			draft.value = defaultFactory()
		}
	}

	watch(source, () => {
		reset()
	}, { immediate: true })

	const isModified = computed(() => {
		if (!initial.value)
			return true
		return !isDeepEqual(draft.value, initial.value, options.ignoreKeys)
	})

	return {
		draft,
		initial,
		isModified,
		reset,
	}
}
