<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
	class?: HTMLAttributes['class']
}>()
</script>

<template>
	<thead
		data-slot="table-header"
		:class="cn('border-b border-border bg-muted/60', props.class)"
	>
		<slot />
	</thead>
</template>
