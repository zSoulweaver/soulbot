export interface PaginationParams {
	page: number
	limit: number
	search: string
}

export function parsePaginationParams(event: any): PaginationParams {
	const query = getQuery(event) || {}
	const page = Math.max(1, Number.parseInt(query.page as string) || 1)
	const limit = Math.max(1, Math.min(100, Number.parseInt(query.limit as string) || 10))
	const search = String(query.search || query.q || '').trim()
	return { page, limit, search }
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
	return {
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit),
	}
}
