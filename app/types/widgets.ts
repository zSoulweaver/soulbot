import type { WidgetStyles } from '~~/server/database/schema'

export type { WidgetStyles }

export type AdminWidgetResponse = Awaited<ReturnType<typeof import('~~/server/api/admin/widgets/[id].get').default>>
export type AdminWidgetKeyResponse = Awaited<ReturnType<typeof import('~~/server/api/admin/widgets/key.get').default>>
export type PublicDeathsWidgetResponse = Awaited<ReturnType<typeof import('~~/server/api/widgets/deaths.get').default>>
