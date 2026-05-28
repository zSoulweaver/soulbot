import { refDebounced } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

export interface PaginationOptions {
	initialPage?: number
	initialLimit?: number
	defaultParams?: Record<string, any>
	watchParams?: any[]
	debounceMs?: number
}

export function usePagination<T>(apiRoute: string, options: PaginationOptions = {}) {
	const page = ref(options.initialPage || 1)
	const limit = ref(options.initialLimit || 10)
	const search = ref('')

	// Debounce the search input by 300ms (or customizable value)
	const debouncedSearch = refDebounced(search, options.debounceMs ?? 300)

	const queryParams = computed(() => {
		return {
			page: page.value,
			limit: limit.value,
			search: debouncedSearch.value.trim() || undefined,
			...options.defaultParams,
		}
	})

	watch(search, () => {
		page.value = 1
	})

	const { data, refresh, pending: loading } = useFetch<T>(apiRoute, {
		query: queryParams,
		watch: options.watchParams ? [queryParams, ...options.watchParams] : [queryParams],
	})

	return {
		page,
		limit,
		search,
		debouncedSearch,
		data,
		refresh,
		loading,
	}
}
