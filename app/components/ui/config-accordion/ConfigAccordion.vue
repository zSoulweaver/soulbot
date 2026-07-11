<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { computed, ref } from 'vue'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'

const props = withDefaults(defineProps<{
	title: string
	description?: string
	modelValue?: boolean
	disabled?: boolean
}>(), {
	modelValue: undefined,
	disabled: false,
})

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
}>()

const localOpen = ref(false)

const isOpen = computed({
	get() {
		return props.modelValue !== undefined ? props.modelValue : localOpen.value
	},
	set(val) {
		if (props.modelValue !== undefined) {
			emit('update:modelValue', val)
		}
		else {
			localOpen.value = val
		}
	},
})
</script>

<template>
	<Collapsible
		v-model:open="isOpen"
		:disabled="disabled"
		class="
			flex w-full flex-col border-b border-border/30 transition-all duration-300 ease-in-out
			last:border-b-0
		"
		:class="isOpen ? 'border-l-2 border-l-primary bg-muted/10 pl-4' : 'border-l-2 border-l-transparent pl-0'"
	>
		<!-- Section Header -->
		<div class="flex items-start justify-between gap-4 py-4 pr-4">
			<CollapsibleTrigger
				class="group flex flex-1 cursor-pointer items-start gap-3 text-left outline-none select-none"
			>
				<!-- Icon slot -->
				<div
					v-if="$slots.icon"
					class="
						mt-1 shrink-0 text-muted-foreground transition-colors
						group-hover:text-primary
					"
				>
					<slot name="icon" :is-open="isOpen" />
				</div>

				<div class="flex flex-col gap-1">
					<h3
						class="
							flex items-center gap-2 text-lg font-semibold transition-colors
							group-hover:text-primary
						"
					>
						<span>{{ props.title }}</span>
						<ChevronDown
							class="
								size-4 text-muted-foreground transition-transform duration-200
								group-hover:text-primary
							"
							:class="{ 'rotate-180 text-primary': isOpen }"
						/>
					</h3>
					<p v-if="props.description" class="text-sm text-muted-foreground/90">
						{{ props.description }}
					</p>
				</div>
			</CollapsibleTrigger>

			<!-- Action slot (outside trigger) -->
			<div
				v-if="$slots['header-action']"
				class="shrink-0 pt-0.5"
				@click.stop
			>
				<slot name="header-action" :is-open="isOpen" />
			</div>
		</div>

		<!-- Options Content -->
		<CollapsibleContent
			class="
				overflow-hidden pr-4 pb-6
				data-[state=closed]:animate-collapsible-up
				data-[state=open]:animate-collapsible-down
			"
		>
			<slot />
		</CollapsibleContent>
	</Collapsible>
</template>
