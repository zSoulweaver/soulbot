export type ExclusionsResponse = Awaited<ReturnType<typeof import('~~/server/api/loyalty/exclusions/index.get').default>>
export type ExcludedUser = ExclusionsResponse['manualExclusions']['data'][number]
export type AutoExclusion = ExclusionsResponse['autoExclusions'][number]
