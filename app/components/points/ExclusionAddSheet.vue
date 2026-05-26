<script setup lang="ts">
import { Loader2, PlusIcon } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'

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
	if (!newUsername.value.trim())
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
					<Loader2 v-if="isAdding" class="size-4 animate-spin" />
					<PlusIcon v-else class="size-4" />
					{{ isAdding ? 'Adding...' : 'Add Exclusion' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
