<script setup lang="ts">
import type { ButtonVariants } from '~/components/ui/button'
import { RefreshCcw } from '@lucide/vue'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

withDefaults(defineProps<{
	loading?: boolean
	disabled?: boolean
	tooltip?: string
	side?: 'top' | 'right' | 'bottom' | 'left'
	variant?: ButtonVariants['variant']
	size?: ButtonVariants['size']
}>(), {
	loading: false,
	disabled: false,
	tooltip: 'Refresh Data',
	side: 'bottom',
	variant: 'ghost',
	size: 'icon',
})

const emit = defineEmits<{
	click: [event?: any]
}>()
</script>

<template>
	<Tooltip>
		<TooltipTrigger as-child>
			<Button
				:variant="variant"
				:size="size"
				:disabled="disabled || loading"
				@click="emit('click', $event)"
			>
				<RefreshCcw :class="{ 'animate-spin': loading }" />
				<span class="sr-only">{{ tooltip }}</span>
			</Button>
		</TooltipTrigger>
		<TooltipContent :side="side">
			{{ tooltip }}
		</TooltipContent>
	</Tooltip>
</template>
