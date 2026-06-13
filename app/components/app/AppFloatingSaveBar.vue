<script setup lang="ts">
import { Save } from 'lucide-vue-next'
import { Spinner } from '~/components/ui/spinner'

defineProps<{
	show: boolean
	isSaving?: boolean
	title?: string
	description?: string
	saveText?: string
	savingText?: string
	discardText?: string
}>()

defineEmits<{
	(e: 'save'): void
	(e: 'discard'): void
}>()
</script>

<template>
	<Transition
		enter-active-class="transition duration-300 ease-out"
		enter-from-class="transform translate-y-8 opacity-0 scale-95"
		enter-to-class="transform translate-y-0 opacity-100 scale-100"
		leave-active-class="transition duration-200 ease-in"
		leave-from-class="transform translate-y-0 opacity-100 scale-100"
		leave-to-class="transform translate-y-8 opacity-0 scale-95"
	>
		<Item
			v-if="show"
			variant="outline"
			class="sticky bottom-4 z-40 mt-auto w-full border-border/60 bg-card/80 shadow-lg backdrop-blur-md transition-all duration-200"
		>
			<ItemContent>
				<slot name="content">
					<ItemTitle v-if="title">
						{{ title }}
					</ItemTitle>
					<ItemDescription v-if="description">
						{{ description }}
					</ItemDescription>
				</slot>
			</ItemContent>
			<ItemActions>
				<slot name="actions">
					<Button variant="outline" :disabled="isSaving" @click="$emit('discard')">
						{{ discardText || 'Discard Changes' }}
					</Button>
					<Button :disabled="isSaving" @click="$emit('save')">
						<Spinner v-if="isSaving" data-icon="inline-start" />
						<Save v-else data-icon="inline-start" />
						{{ isSaving ? (savingText || 'Saving...') : (saveText || 'Save Changes') }}
					</Button>
				</slot>
			</ItemActions>
		</Item>
	</Transition>
</template>
