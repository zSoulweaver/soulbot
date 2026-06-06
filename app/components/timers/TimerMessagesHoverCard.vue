<script setup lang="ts">
import type { Timer } from '~/types/timers'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '~/components/ui/hover-card'

const props = defineProps<{
	timer: Timer
}>()

const messages = computed(() => props.timer.messages || [])
const totalCount = computed(() => messages.value.length)
const enabledCount = computed(() => messages.value.filter(m => m.enabled).length)
const labelText = computed(() => `${totalCount.value} msg${totalCount.value !== 1 ? 's' : ''} (${enabledCount.value} active)`)
</script>

<template>
	<HoverCard :open-delay="100" :close-delay="100">
		<HoverCardTrigger as-child>
			<span class="cursor-help text-primary underline decoration-dotted underline-offset-4">
				{{ labelText }}
			</span>
		</HoverCardTrigger>
		<HoverCardContent class="flex w-md flex-col gap-2">
			<div class="flex max-h-56 flex-col gap-2 overflow-y-auto">
				<div
					v-for="(m, idx) in messages"
					:key="idx"
					:class="cn(
						'flex gap-2.5 rounded-md border px-3 py-2 text-sm',
						!m.enabled && 'line-through opacity-50',
					)"
				>
					<Badge variant="secondary">
						{{ idx + 1 }}
					</Badge>
					<span class="text-sm/relaxed wrap-break-word">
						{{ m.text }}
					</span>
				</div>
			</div>
		</HoverCardContent>
	</HoverCard>
</template>
