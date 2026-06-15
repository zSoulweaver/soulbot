<script setup lang="ts">
import type { Timer, TimerMessage } from '~/types/timers'
import { Plus, Save, Trash2 } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

const props = defineProps<{
	timer: Timer | null
	open: boolean
}>()

const emit = defineEmits(['update:open', 'saved'])

// Local state fields
const timerName = ref('')
const isEnabled = ref(true)
const messagesList = ref<TimerMessage[]>([])
const intervalOnlineValue = ref(10)
const intervalOfflineValue = ref(30)
const minMessagesValue = ref(0)

const isSaving = ref(false)

const isEditMode = computed(() => {
	return props.timer !== null && props.timer !== undefined && props.timer.id !== undefined
})

// Populate fields on open
watch(() => props.open, (isOpen) => {
	if (isOpen) {
		if (isEditMode.value && props.timer) {
			timerName.value = props.timer.name || ''
			isEnabled.value = props.timer.enabled !== false
			messagesList.value = props.timer.messages ? JSON.parse(JSON.stringify(props.timer.messages)) : []
			intervalOnlineValue.value = props.timer.intervalOnline ?? 10
			intervalOfflineValue.value = props.timer.intervalOffline ?? 30
			minMessagesValue.value = props.timer.minMessages ?? 0
		}
		else {
			// Clear fields for Create Mode
			timerName.value = ''
			isEnabled.value = true
			messagesList.value = [{ text: '', enabled: true }]
			intervalOnlineValue.value = 10
			intervalOfflineValue.value = 30
			minMessagesValue.value = 0
		}
	}
})

function addMessage() {
	messagesList.value.push({ text: '', enabled: true })
}

function removeMessage(index: number) {
	if (messagesList.value.length <= 1)
		return
	messagesList.value.splice(index, 1)
}

async function saveConfig() {
	if (isSaving.value)
		return
	const name = timerName.value.trim()
	if (!name) {
		toast.error('Timer name is required.')
		return
	}

	// Filter and validate messages list
	const cleanMessages = messagesList.value
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
			enabled: isEnabled.value,
			messages: cleanMessages,
			intervalOnline: intervalOnlineValue.value,
			intervalOffline: intervalOfflineValue.value,
			minMessages: minMessagesValue.value,
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
		<SheetContent class="sm:max-w-2xl">
			<SheetHeader class="border-b border-border">
				<SheetTitle>
					<span v-if="isEditMode">Edit Timer - <span class="font-bold text-primary">{{ props.timer?.name }}</span></span>
					<span v-else>Create New Timer</span>
				</SheetTitle>
				<SheetDescription>
					Configure periodic chat messages, intervals for online and offline streams, and chat message volume thresholds.
				</SheetDescription>
			</SheetHeader>

			<div class="flex flex-col gap-6 overflow-y-auto px-4 py-2">
				<!-- Toggle Switch for Timer Active State (Only in Edit Mode) -->
				<Item v-if="isEditMode" variant="muted">
					<ItemContent>
						<ItemTitle>Enable Timer</ItemTitle>
						<ItemDescription>
							Toggle whether this timer runs in the background.
						</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Switch v-model:model-value="isEnabled" />
					</ItemActions>
				</Item>

				<FieldGroup>
					<!-- Timer Name field -->
					<Field>
						<FieldLabel for="timer-name">
							Timer Name
						</FieldLabel>
						<Input
							id="timer-name"
							v-model="timerName"
							placeholder="E.g. Socials Rotation or Rules Reminder"
						/>
						<FieldDescription>A descriptive name to identify this timer in the dashboard.</FieldDescription>
					</Field>

					<FieldSeparator />

					<!-- Messages List Section -->
					<Field>
						<div class="mb-2 flex items-center justify-between">
							<FieldLabel>Rotating Messages</FieldLabel>
							<Button size="sm" variant="outline" @click="addMessage">
								<Plus data-icon="inline-start" />
								Add Message
							</Button>
						</div>
						<FieldDescription class="mb-3">
							Define one or more messages. The timer will cycle through enabled messages sequentially each time the interval completes.
						</FieldDescription>

						<div v-if="messagesList.length === 0" class="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
							No messages added. Click "Add Message" to create one.
						</div>
						<div v-else class="flex flex-col gap-3">
							<div
								v-for="(msg, index) in messagesList"
								:key="index"
								class="relative flex flex-col gap-2 rounded-lg border bg-card/40 p-3"
								:class="{ 'opacity-60': !msg.enabled }"
							>
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
										:disabled="messagesList.length <= 1"
										@click="removeMessage(index)"
									>
										<Trash2 />
										Remove
									</Button>
								</div>
							</div>
						</div>
					</Field>

					<FieldSeparator />

					<!-- Intervals Segment -->
					<div
						class="
							grid grid-cols-1 gap-4
							sm:grid-cols-2
						"
					>
						<Field>
							<FieldLabel for="timer-online-int">
								Online Interval (minutes)
							</FieldLabel>
							<NumberField
								id="timer-online-int"
								v-model="intervalOnlineValue"
								:min="0"
							>
								<NumberFieldContent>
									<NumberFieldDecrement />
									<NumberFieldInput placeholder="10" />
									<NumberFieldIncrement />
								</NumberFieldContent>
							</NumberField>
							<FieldDescription>Interval while stream is live. Enter 0 to disable online.</FieldDescription>
						</Field>

						<Field>
							<FieldLabel for="timer-offline-int">
								Offline Interval (minutes)
							</FieldLabel>
							<NumberField
								id="timer-offline-int"
								v-model="intervalOfflineValue"
								:min="0"
							>
								<NumberFieldContent>
									<NumberFieldDecrement />
									<NumberFieldInput placeholder="30" />
									<NumberFieldIncrement />
								</NumberFieldContent>
							</NumberField>
							<FieldDescription>Interval while stream is offline. Enter 0 to disable offline.</FieldDescription>
						</Field>
					</div>

					<FieldSeparator />

					<!-- Chat message threshold limit -->
					<Field>
						<FieldLabel for="timer-min-msgs">
							Minimum Chat Messages
						</FieldLabel>
						<NumberField
							id="timer-min-msgs"
							v-model="minMessagesValue"
							:min="0"
						>
							<NumberFieldContent>
								<NumberFieldDecrement />
								<NumberFieldInput placeholder="5" />
								<NumberFieldIncrement />
							</NumberFieldContent>
						</NumberField>
						<FieldDescription>
							Minimum number of general chat messages required since the last message was sent before this timer can fire again. Helps prevent bot spam when chat is slow.
						</FieldDescription>
					</Field>
				</FieldGroup>
			</div>

			<!-- Pinned Bottom Footer with docked buttons -->
			<SheetFooter class="flex flex-row items-center justify-end gap-2 border-t">
				<SheetClose as-child>
					<Button variant="outline">
						Cancel
					</Button>
				</SheetClose>
				<Button :disabled="isSaving" @click="saveConfig">
					<Save data-icon="inline-start" />
					{{ isSaving ? 'Saving...' : 'Save Configuration' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
