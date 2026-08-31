import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { deepClone, isDeepEqual } from '~/utils/equality'

export interface UseSettingsFormOptions<T> {
	/** Custom save endpoint if different from GET endpoint */
	saveEndpoint?: string
	/** HTTP method for saving (defaults to 'PUT') */
	saveMethod?: 'PUT' | 'POST'
	/** Custom success toast message */
	successMessage?: string
	/** Custom error toast message fallback */
	errorMessage?: string
	/** Field keys to ignore during isModified deep comparison (e.g. read-only metadata like isDiscordConnected) */
	ignoreKeys?: (keyof T | string)[]
	/** Optional callback to transform initial data before populating form */
	transform?: (data: T) => T
	/** Optional callback executed after successful save and refresh */
	onSuccess?: (savedData: T) => void | Promise<void>
}

export function useSettingsForm<T extends Record<string, any>>(
	endpoint: string,
	options: UseSettingsFormOptions<T> = {},
) {
	// 1. Non-blocking Fetch
	const { data: initialData, refresh, pending: loading } = useFetch<T>(endpoint)

	// 2. Reactive Cloned Form State
	const form = ref<T>({} as T)
	const isSaving = ref(false)

	// 3. Auto-sync on fetch/refresh
	watch(initialData, (newData) => {
		if (newData) {
			const cloned = deepClone(newData) as T
			form.value = options.transform ? options.transform(cloned) : cloned
		}
	}, { immediate: true })

	// 4. Fast, Robust Deep-Equality Dirty Tracking
	const isModified = computed(() => {
		if (!initialData.value)
			return false
		return !isDeepEqual(form.value, initialData.value, options.ignoreKeys)
	})

	// 5. Standardized Discard Handler
	function discard() {
		if (initialData.value) {
			const cloned = deepClone(initialData.value) as T
			form.value = options.transform ? options.transform(cloned) : cloned
			toast.info('Discarded unsaved changes')
		}
	}

	// 6. Standardized Save Handler
	async function save() {
		if (isSaving.value || !isModified.value)
			return

		isSaving.value = true
		try {
			await $fetch(options.saveEndpoint || endpoint, {
				method: options.saveMethod || 'PUT',
				body: form.value,
			})
			toast.success(options.successMessage || 'Settings saved successfully.')
			await refresh()
			if (options.onSuccess && initialData.value) {
				await options.onSuccess(form.value)
			}
		}
		catch (err: any) {
			toast.error(err.data?.statusMessage || options.errorMessage || 'Failed to save settings.')
		}
		finally {
			isSaving.value = false
		}
	}

	return {
		form,
		initialData,
		isModified,
		isSaving,
		loading,
		refresh,
		discard,
		save,
	}
}
