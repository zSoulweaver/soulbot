import { z } from 'zod'
import { defineSettingsDomain } from '../registry'

export const AdsSettingsSchema = z.object({
	adsAlertsEnabled: z.boolean().default(false),
	adsAlert5mEnabled: z.boolean().default(false),
	adsAlert3mEnabled: z.boolean().default(false),
	adsAlert1mEnabled: z.boolean().default(false),
	adsAlertTemplate: z.string().max(500, 'Warning alert template is too long').default('Ad break of $(duration) seconds is starting in $(time)!'),
})

export type AdsSettings = z.infer<typeof AdsSettingsSchema>

export const adsSettings = defineSettingsDomain({
	namespace: 'ads',
	schema: AdsSettingsSchema,
	customKeys: {
		adsAlertsEnabled: 'ads.alerts.enabled',
		adsAlert5mEnabled: 'ads.alerts.5m.enabled',
		adsAlert3mEnabled: 'ads.alerts.3m.enabled',
		adsAlert1mEnabled: 'ads.alerts.1m.enabled',
		adsAlertTemplate: 'ads.alerts.template',
	},
})
