<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<div
		:class="cn(`
			flex w-full shrink-0 items-center justify-end gap-2
			sm:w-auto
			md:w-72
		`, props.class)"
	>
		<slot />
	</div>
</template>
