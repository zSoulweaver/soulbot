<script setup lang="ts">
import type { Component, HTMLAttributes } from 'vue'
import type { AlertVariants } from '.'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-vue-next'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { alertVariants } from '.'

const props = defineProps<{
	class?: HTMLAttributes['class']
	variant?: AlertVariants['variant']
	icon?: Component
}>()

const computedIcon = computed(() => {
	if (props.icon)
		return props.icon

	switch (props.variant) {
		case 'destructive':
			return AlertTriangle
		case 'warning':
			return AlertCircle
		case 'success':
			return CheckCircle2
		case 'info':
			return Info
		default:
			return null
	}
})
</script>

<template>
	<div
		data-slot="alert"
		:class="cn(alertVariants({ variant }), props.class)"
		role="alert"
	>
		<component :is="computedIcon" v-if="computedIcon" />
		<slot />
	</div>
</template>
