export type ExclusionsResponse = Awaited<ReturnType<typeof import('~~/server/api/points/exclusions/index.get').default>>
export type ExcludedUser = ExclusionsResponse['manualExclusions'][number]
export type AutoExclusion = ExclusionsResponse['autoExclusions'][number]
