<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { NumberFieldInput } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<NumberFieldInput
		data-slot="input"
		:class="cn(`
			flex h-9 w-full rounded-md border border-input bg-transparent py-1 text-center text-base shadow-xs transition-[color,box-shadow] outline-none
			selection:bg-primary selection:text-primary-foreground
			placeholder:text-muted-foreground
			focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none
			disabled:cursor-not-allowed disabled:opacity-50
			md:text-sm
			dark:bg-input/30
		`, props.class)"
	/>
</template>
