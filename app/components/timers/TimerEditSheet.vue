<script setup lang="ts">
import type { Timer, TimerMessage } from '~/types/timers'
import { Plus, Save, Trash2 } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'

const props = defineProps<{
	timer: Timer | null
	open: boolean
}>()

const emit = defineEmits(['update:open', 'saved'])

interface TimerDraft {
	name: string
	enabled: boolean
	messages: TimerMessage[]
	intervalOnline: number
	intervalOffline: number
	minMessages: number
}

const isSaving = ref(false)

const isEditMode = computed(() => {
	return props.timer !== null && props.timer !== undefined && props.timer.id !== undefined
})

const {
	draft,
	isModified,
	reset: resetDraft,
} = useFormDraft<TimerDraft>(
	() => {
		if (!props.timer || !props.timer.id)
			return null
		return {
			name: props.timer.name || '',
			enabled: props.timer.enabled !== false,
			messages: props.timer.messages?.length ? props.timer.messages : [{ text: '', enabled: true }],
			intervalOnline: props.timer.intervalOnline ?? 10,
			intervalOffline: props.timer.intervalOffline ?? 30,
			minMessages: props.timer.minMessages ?? 0,
		}
	},
	() => ({
		name: '',
		enabled: true,
		messages: [{ text: '', enabled: true }],
		intervalOnline: 10,
		intervalOffline: 30,
		minMessages: 0,
	}),
)

// Reset draft on open
watch(() => props.open, (isOpen) => {
	if (isOpen) {
		resetDraft()
	}
})

function addMessage() {
	draft.value.messages.push({ text: '', enabled: true })
}

function removeMessage(index: number) {
	if (draft.value.messages.length <= 1)
		return
	draft.value.messages.splice(index, 1)
}

async function saveConfig() {
	if (isSaving.value || (isEditMode.value && !isModified.value))
		return
	const name = draft.value.name.trim()
	if (!name) {
		toast.error('Timer name is required.')
		return
	}

	// Filter and validate messages list
	const cleanMessages = draft.value.messages
		.map(m => ({ text: m.text.trim(), enabled: m.enabled }))
		.filter(m => m.text !== '')

	if (cleanMessages.length === 0) {
		toast.error('At least one non-empty message is required.')
		return
	}

	isSaving.value = true

	try {
		const payload = {
			id: isEditMode.value ? props.timer!.id : undefined,
			name,
			enabled: draft.value.enabled,
			messages: cleanMessages,
			intervalOnline: draft.value.intervalOnline,
			intervalOffline: draft.value.intervalOffline,
			minMessages: draft.value.minMessages,
		}

		if (isEditMode.value) {
			// Update Existing Timer
			await $fetch('/api/timers', {
				method: 'PUT',
				body: payload,
			})
			toast.success(`Timer '${name}' updated successfully!`)
		}
		else {
			// Create New Timer
			await $fetch('/api/timers', {
				method: 'POST',
				body: payload,
			})
			toast.success(`Timer '${name}' created successfully!`)
		}

		emit('saved')
		emit('update:open', false)
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to save timer configuration.')
	}
	finally {
		isSaving.value = false
	}
}
</script>

<template>
	<Sheet :open="props.open" @update:open="emit('update:open', $event)">
		<SheetContent class="sm:max-w-3xl">
			<SheetHeader class="border-b border-border">
				<SheetTitle>
					<span v-if="isEditMode">Edit Timer - <span class="font-mono font-bold text-primary">{{ props.timer?.name }}</span></span>
					<span v-else>Create New Timer</span>
				</SheetTitle>
				<SheetDescription>
					Configure periodic chat messages, intervals for online and offline streams, and chat message volume thresholds.
				</SheetDescription>
			</SheetHeader>

			<div class="flex flex-col gap-6 overflow-y-auto px-4 py-2">
				<!-- Status (Only in Edit Mode) -->
				<div v-if="isEditMode" class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Status</span>
					<SettingsGroup>
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Enable Timer</SettingsGroupLabel>
								<SettingsGroupDescription>Toggle whether this timer runs in the background.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Switch v-model:model-value="draft.enabled" />
							</SettingsGroupAction>
						</SettingsGroupItem>
					</SettingsGroup>
				</div>

				<!-- Details -->
				<div class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Details</span>
					<SettingsGroup>
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Timer Name</SettingsGroupLabel>
								<SettingsGroupDescription>A descriptive name to identify this timer in the dashboard.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Input
									id="timer-name"
									v-model="draft.name"
									placeholder="E.g. Socials Rotation or Rules Reminder"
									class="w-full"
								/>
							</SettingsGroupAction>
						</SettingsGroupItem>
					</SettingsGroup>
				</div>

				<!-- Rotating Messages -->
				<div class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Rotating Messages</span>
					<SettingsGroup>
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Message Rotation List</SettingsGroupLabel>
								<SettingsGroupDescription>The timer cycles through enabled messages sequentially each time the interval completes.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Button size="sm" variant="outline" @click="addMessage">
									<Plus data-icon="inline-start" />
									Add Message
								</Button>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<SettingsGroupItem
							v-for="(msg, index) in draft.messages"
							:key="index"
							class="sm:flex-col sm:items-stretch sm:gap-3"
						>
							<SettingsGroupContent class="sm:pr-0">
								<SettingsGroupLabel :class="{ 'opacity-60': !msg.enabled }">
									Message {{ index + 1 }}
								</SettingsGroupLabel>
								<div class="flex w-full flex-col gap-2 pt-1">
									<Textarea
										v-model="msg.text"
										placeholder="Enter chat message..."
										rows="2"
										class="text-sm"
									/>
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<Switch
												:id="`msg-switch-${index}`"
												v-model:model-value="msg.enabled"
											/>
											<Label :for="`msg-switch-${index}`" class="cursor-pointer text-xs text-muted-foreground select-none">
												{{ msg.enabled ? 'Message Enabled' : 'Message Disabled' }}
											</Label>
										</div>
										<Button
											size="sm"
											variant="ghostDestructive"
											:disabled="draft.messages.length <= 1"
											@click="removeMessage(index)"
										>
											<Trash2 data-icon="inline-start" />
											Remove
										</Button>
									</div>
								</div>
							</SettingsGroupContent>
						</SettingsGroupItem>
					</SettingsGroup>
				</div>

				<!-- Intervals & Thresholds -->
				<div class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Intervals &amp; Thresholds</span>
					<SettingsGroup>
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Online Interval (Minutes)</SettingsGroupLabel>
								<SettingsGroupDescription>Interval while the stream is live. Enter 0 to disable online.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<NumberField
									id="timer-online-int"
									v-model="draft.intervalOnline"
									:min="0"
									class="w-full"
								>
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput placeholder="10" />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Offline Interval (Minutes)</SettingsGroupLabel>
								<SettingsGroupDescription>Interval while the stream is offline. Enter 0 to disable offline.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<NumberField
									id="timer-offline-int"
									v-model="draft.intervalOffline"
									:min="0"
									class="w-full"
								>
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput placeholder="30" />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Minimum Chat Messages</SettingsGroupLabel>
								<SettingsGroupDescription>Minimum number of general chat messages required since the last message was sent before this timer can fire again. Helps prevent bot spam when chat is slow.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<NumberField
									id="timer-min-msgs"
									v-model="draft.minMessages"
									:min="0"
									class="w-full"
								>
									<NumberFieldContent>
										<NumberFieldDecrement />
										<NumberFieldInput placeholder="5" />
										<NumberFieldIncrement />
									</NumberFieldContent>
								</NumberField>
							</SettingsGroupAction>
						</SettingsGroupItem>
					</SettingsGroup>
				</div>
			</div>

			<!-- Pinned Bottom Footer with docked buttons -->
			<SheetFooter class="flex flex-row items-center justify-end gap-2 border-t">
				<SheetClose as-child>
					<Button variant="outline">
						Cancel
					</Button>
				</SheetClose>
				<Button :disabled="(isEditMode && !isModified) || isSaving" @click="saveConfig">
					<Save data-icon="inline-start" />
					{{ isSaving ? 'Saving...' : 'Save Changes' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
