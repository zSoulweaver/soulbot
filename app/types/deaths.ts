export type DeathsListResponse = Awaited<ReturnType<typeof import('~~/server/api/admin/deaths/index.get').default>>
export type GameDeathRecord = DeathsListResponse['data'][number]

export type PublicDeathsResponse = Awaited<ReturnType<typeof import('~~/server/api/deaths/index.get').default>>
export type PublicGameDeathRecord = PublicDeathsResponse['data'][number]
