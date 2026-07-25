export type DeathsListResponse = Awaited<ReturnType<typeof import('~~/server/api/admin/deaths/index.get').default>>
export type GameDeathRecord = DeathsListResponse['data'][number]
