<script setup lang="ts">
import type { SwitchRootEmits, SwitchRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
	SwitchRoot,
	SwitchThumb,
	useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
	defineProps<
		SwitchRootProps & {
			class?: HTMLAttributes['class']
			size?: 'default' | 'lg'
		}
	>(),
	{
		size: 'default',
	},
)

const emits = defineEmits<SwitchRootEmits>()

const delegatedProps = reactiveOmit(props, 'class', 'size')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
	<SwitchRoot
		v-slot="slotProps"
		data-slot="switch"
		v-bind="forwarded"
		:class="cn(
			`
				peer inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none
				focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
				disabled:cursor-not-allowed disabled:opacity-50
				data-[state=checked]:bg-primary
				data-[state=unchecked]:bg-input
				dark:data-[state=unchecked]:bg-input/80
			`,
			props.size === 'lg' ? 'h-6 w-11' : 'h-[1.15rem] w-8',
			props.class,
		)"
	>
		<SwitchThumb
			data-slot="switch-thumb"
			:class="cn(
				`
					pointer-events-none block rounded-full bg-background ring-0 transition-transform
					dark:data-[state=checked]:bg-primary-foreground
					dark:data-[state=unchecked]:bg-foreground
				`,
				props.size === 'lg'
					? `
						size-5
						data-[state=checked]:translate-x-5
						data-[state=unchecked]:translate-x-[2px]
					`
					: `
						size-4
						data-[state=checked]:translate-x-[calc(100%-2px)]
						data-[state=unchecked]:translate-x-0
					`,
			)"
		>
			<slot name="thumb" v-bind="slotProps" />
		</SwitchThumb>
	</SwitchRoot>
</template>
