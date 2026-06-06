<script setup lang="ts">
import { Save } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

const props = defineProps<{
	command: any | null // CustomCommand | null
	open: boolean
}>()

const emit = defineEmits(['update:open', 'saved'])

// Local state fields
const triggerName = ref('')
const responseTemplate = ref('')
const descriptionValue = ref('')
const costValue = ref(0)
const globalCooldownValue = ref(0)
const userCooldownValue = ref(0)
const isEnabled = ref(true)
const permissionValue = ref('everyone')

const isSaving = ref(false)

const isEditMode = computed(() => {
	return props.command !== null && props.command !== undefined && props.command.id !== undefined
})

// Populate fields on open or change
watch(() => props.open, (isOpen) => {
	if (isOpen) {
		if (isEditMode.value && props.command) {
			triggerName.value = props.command.trigger || ''
			responseTemplate.value = props.command.response || ''
			descriptionValue.value = props.command.description || ''
			costValue.value = props.command.cost || 0
			globalCooldownValue.value = props.command.globalCooldown || 0
			userCooldownValue.value = props.command.userCooldown || 0
			isEnabled.value = props.command.enabled !== false
			permissionValue.value = props.command.permission || 'everyone'
		}
		else {
			// Clear fields for Create Mode
			triggerName.value = ''
			responseTemplate.value = ''
			descriptionValue.value = ''
			costValue.value = 0
			globalCooldownValue.value = 0
			userCooldownValue.value = 0
			isEnabled.value = true
			permissionValue.value = 'everyone'
		}
	}
})

async function saveConfig() {
	const trigger = triggerName.value.trim().toLowerCase().replace(/^!/, '')
	if (!trigger) {
		toast.error('Trigger word is required.')
		return
	}

	if (!responseTemplate.value.trim()) {
		toast.error('Response template is required.')
		return
	}

	isSaving.value = true

	try {
		const payload = {
			id: isEditMode.value ? props.command.id : undefined,
			trigger,
			response: responseTemplate.value.trim(),
			description: descriptionValue.value.trim() || null,
			enabled: isEnabled.value,
			cost: costValue.value,
			globalCooldown: globalCooldownValue.value,
			userCooldown: userCooldownValue.value,
			permission: permissionValue.value,
		}

		if (isEditMode.value) {
			// Update Existing Custom Command
			await $fetch('/api/commands/custom/save', {
				method: 'PUT',
				body: payload,
			})
			toast.success(`Custom command '!${trigger}' updated successfully!`)
		}
		else {
			// Create New Custom Command
			await $fetch('/api/commands/custom', {
				method: 'POST',
				body: payload,
			})
			toast.success(`Custom command '!${trigger}' created successfully!`)
		}

		emit('saved')
		emit('update:open', false)
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to save custom command configuration.')
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
					<span v-if="isEditMode">Edit Custom Command - <span class="font-mono font-bold text-primary">!{{ props.command?.trigger }}</span></span>
					<span v-else>Create Custom Command</span>
				</SheetTitle>
				<SheetDescription>
					Configure dynamic Twitch chat triggers, template responses, point costs, and cooldown limits.
				</SheetDescription>
			</SheetHeader>

			<div class="flex flex-col gap-6 overflow-y-auto px-4 py-2">
				<!-- Toggle Switch for Command Active State (Only in Edit Mode) -->
				<Item v-if="isEditMode" variant="muted">
					<ItemContent>
						<ItemTitle>Enable Custom Trigger</ItemTitle>
						<ItemDescription>
							Toggle this custom command's active state in Twitch chat.
						</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Switch v-model:model-value="isEnabled" />
					</ItemActions>
				</Item>

				<FieldGroup>
					<!-- Trigger Word Segment -->
					<Field>
						<FieldLabel for="custom-trigger">
							Trigger Word
						</FieldLabel>
						<InputGroup>
							<InputGroupAddon class="bg-muted px-3">
								!
							</InputGroupAddon>
							<InputGroupInput
								id="custom-trigger"
								v-model="triggerName"
								placeholder="hello"
							/>
						</InputGroup>
						<FieldDescription>Alphanumeric trigger word typed by users (e.g. <code>!wins</code>).</FieldDescription>
					</Field>

					<FieldSeparator />

					<!-- Response Template Field -->
					<Field>
						<FieldLabel for="custom-response">
							Response Template Message
						</FieldLabel>
						<Textarea
							id="custom-response"
							v-model="responseTemplate"
							placeholder="Hello $(sender)! You have $(count wins) wins in $(channel)."
							rows="4"
						/>
						<FieldDescription>The message output to chat. Dynamic template variables will resolve dynamically.</FieldDescription>
					</Field>

					<!-- Dynamic Variable Templates Guide -->
					<Alert variant="info">
						<AlertTitle>Dynamic Templates Supported</AlertTitle>
						<AlertDescription>
							You can use dynamic placeholders like <code>$(sender)</code>, <code>$(touser)</code>, and persistent counters <code>$(count)</code>. See the full syntax list in our
							<NuxtLink
								to="/admin/commands/variables"
								class="hyperlink"
								@click="emit('update:open', false)"
							>
								Variable Reference Guide
							</NuxtLink>.
						</AlertDescription>
					</Alert>

					<FieldSeparator />

					<!-- Custom Command Description -->
					<Field>
						<FieldLabel for="custom-desc">
							Command Description
						</FieldLabel>
						<Input
							id="custom-desc"
							v-model="descriptionValue"
							placeholder="Returns wins count"
						/>
						<FieldDescription>Optional summary description shown on dashboard lists.</FieldDescription>
					</Field>

					<FieldSeparator />

					<!-- Custom Permission Level Segment -->
					<CommandPermissionSelect v-model="permissionValue" />

					<FieldSeparator />

					<!-- Config Stepper Fields (Points, Global Cooldown, User Cooldown) -->
					<CommandLimitsFields
						v-model:cost="costValue"
						v-model:global-cooldown="globalCooldownValue"
						v-model:user-cooldown="userCooldownValue"
					/>
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
