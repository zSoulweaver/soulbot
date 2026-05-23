import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Alert } from './Alert.vue'
export { default as AlertDescription } from './AlertDescription.vue'
export { default as AlertTitle } from './AlertTitle.vue'

export const alertVariants = cva(
	`
		relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm
		has-[>svg]:grid-cols-[--spacing(4)_1fr] has-[>svg]:gap-x-3
		[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current
	`,
	{
		variants: {
			variant: {
				default: 'bg-card text-card-foreground',
				destructive:
					`
						border-destructive/20 bg-destructive/10 text-destructive
						*:data-[slot=alert-description]:text-destructive/80
						[&>svg]:text-current
					`,
				warning:
					`
						border-amber-500/20 bg-amber-500/10 text-amber-600
						*:data-[slot=alert-description]:text-amber-600/80
						dark:text-amber-500
						dark:*:data-[slot=alert-description]:text-amber-500/80
						[&>svg]:text-current
					`,
				success:
					`
						border-emerald-500/20 bg-emerald-500/10 text-emerald-600
						*:data-[slot=alert-description]:text-emerald-600/80
						dark:text-emerald-500
						dark:*:data-[slot=alert-description]:text-emerald-500/80
						[&>svg]:text-current
					`,
				info:
					`
						border-blue-500/20 bg-blue-500/10 text-blue-600
						*:data-[slot=alert-description]:text-blue-600/80
						dark:text-blue-500
						dark:*:data-[slot=alert-description]:text-blue-500/80
						[&>svg]:text-current
					`,
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

export type AlertVariants = VariantProps<typeof alertVariants>
