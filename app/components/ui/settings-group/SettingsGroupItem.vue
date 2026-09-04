<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
	defineProps<{
		class?: HTMLAttributes['class']
		stacked?: boolean
	}>(),
	{
		stacked: false,
	},
)
</script>

<template>
	<div
		:class="cn(
			`
				flex min-h-20 flex-col border-b border-border/20 px-0 py-4
				last:border-b-0
			`,
			props.stacked
				? 'items-stretch gap-3'
				: `
					items-start gap-4
					sm:flex-row sm:items-center
				`,
			props.class,
		)"
	>
		<slot />
	</div>
</template>
