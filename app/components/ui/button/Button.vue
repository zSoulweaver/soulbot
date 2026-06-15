<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from '.'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'
import { buttonVariants } from '.'

interface Props extends PrimitiveProps {
	variant?: ButtonVariants['variant']
	size?: ButtonVariants['size']
	class?: HTMLAttributes['class']
	disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	as: 'button',
})

const emit = defineEmits<{
	disabledClick: [event: MouseEvent]
}>()

function handleClick(event: MouseEvent) {
	if (props.disabled) {
		event.preventDefault()
		event.stopImmediatePropagation()
		emit('disabledClick', event)
	}
}
</script>

<template>
	<Primitive
		data-slot="button"
		:data-variant="variant"
		:data-size="size"
		:as="as"
		:as-child="asChild"
		:class="cn(buttonVariants({ variant, size }), props.class)"
		:disabled="disabled"
		@click.capture="handleClick"
	>
		<slot />
	</Primitive>
</template>
