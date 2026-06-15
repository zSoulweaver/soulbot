<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Spinner } from '~/components/ui/spinner'

const props = defineProps<{
	open: boolean
	defaultUsername?: string
}>()

const emit = defineEmits(['update:open', 'added'])

const newUsername = ref('')
const newReason = ref('')
const isAdding = ref(false)

watch(() => props.open, (isOpen) => {
	if (isOpen) {
		newUsername.value = props.defaultUsername || ''
		newReason.value = ''
	}
})

async function addExclusion() {
	if (!newUsername.value.trim() || isAdding.value)
		return
	isAdding.value = true
	try {
		await $fetch('/api/points/exclusions', {
			method: 'POST',
			body: {
				username: newUsername.value,
				reason: newReason.value || undefined,
			},
		})
		toast.success(`Successfully excluded ${newUsername.value}`)
		newUsername.value = ''
		newReason.value = ''
		emit('added')
		emit('update:open', false)
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to add exclusion')
	}
	finally {
		isAdding.value = false
	}
}
</script>

<template>
	<Sheet :open="props.open" @update:open="emit('update:open', $event)">
		<SheetContent>
			<SheetHeader class="border-b border-border">
				<SheetTitle>Add Payout Exclusion</SheetTitle>
				<SheetDescription>
					Exclude a Twitch account from earning watch-time point payouts.
				</SheetDescription>
			</SheetHeader>

			<div class="flex flex-col gap-6 overflow-y-auto px-4">
				<FieldGroup>
					<Field>
						<FieldLabel for="username">
							Twitch Username
						</FieldLabel>
						<Input
							id="username"
							v-model="newUsername"
							placeholder="e.g. streamelements"
							required
							:disabled="isAdding"
						/>
					</Field>
					<Field>
						<FieldLabel for="reason">
							Reason (Optional)
						</FieldLabel>
						<Input
							id="reason"
							v-model="newReason"
							placeholder="e.g. System Bot"
							:disabled="isAdding"
						/>
					</Field>
				</FieldGroup>
			</div>

			<SheetFooter class="flex flex-row items-center justify-end gap-2 border-t">
				<SheetClose as-child>
					<Button variant="outline" :disabled="isAdding">
						Cancel
					</Button>
				</SheetClose>

				<Button :disabled="isAdding || !newUsername.trim()" @click="addExclusion">
					<Spinner v-if="isAdding" data-icon="inline-start" />
					<PlusIcon v-else data-icon="inline-start" />
					{{ isAdding ? 'Adding...' : 'Add Exclusion' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
