<script setup lang="ts">
import { Save } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import CommandLimitsFields from '~/components/commands/CommandLimitsFields.vue'
import CommandPermissionSelect from '~/components/commands/CommandPermissionSelect.vue'
import CommandStatusSettings from '~/components/commands/CommandStatusSettings.vue'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'

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
const isHidden = ref(false)
const permissionValue = ref('everyone')

const isSaving = ref(false)

const isEditMode = computed(() => {
	return props.command !== null && props.command !== undefined && props.command.id !== undefined
})

const responseLines = computed(() => {
	if (!responseTemplate.value)
		return []
	return responseTemplate.value.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
})

const lineCount = computed(() => responseLines.value.length)

const isMultiLine = computed(() => lineCount.value > 1)

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
			isHidden.value = Boolean(props.command.hidden)
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
			isHidden.value = false
			permissionValue.value = 'everyone'
		}
	}
})

async function saveConfig() {
	if (isSaving.value)
		return
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
			hidden: isHidden.value,
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
		<SheetContent class="sm:max-w-3xl">
			<SheetHeader class="border-b border-border">
				<SheetTitle>
					<span v-if="isEditMode">Edit Custom Command - <span class="font-mono font-bold text-primary">!{{ props.command?.trigger }}</span></span>
					<span v-else>Create Custom Command</span>
				</SheetTitle>
				<SheetDescription>
					Configure activation status, dynamic Twitch chat triggers, template responses, point costs, and cooldown limits.
				</SheetDescription>
			</SheetHeader>

			<div class="flex flex-col gap-6 overflow-y-auto px-4 py-2">
				<!-- Status -->
				<div class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Status</span>
					<SettingsGroup>
						<CommandStatusSettings
							v-model:enabled="isEnabled"
							v-model:hidden="isHidden"
							enable-label="Enable Custom Trigger"
							:show-whispers="false"
						/>
					</SettingsGroup>
				</div>

				<!-- Trigger & Access -->
				<div class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Trigger &amp; Access</span>
					<SettingsGroup>
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Trigger Word</SettingsGroupLabel>
								<SettingsGroupDescription>Alphanumeric trigger word typed by users (e.g. <code>!wins</code>).</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<InputGroup class="w-full">
									<InputGroupAddon class="bg-muted px-3">
										!
									</InputGroupAddon>
									<InputGroupInput
										v-model="triggerName"
										placeholder="hello"
									/>
								</InputGroup>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Command Description</SettingsGroupLabel>
								<SettingsGroupDescription>Optional summary description shown on dashboard lists.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Input
									v-model="descriptionValue"
									placeholder="Returns wins count"
									class="w-full"
								/>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<CommandPermissionSelect v-model="permissionValue" />
					</SettingsGroup>
				</div>

				<!-- Response Template -->
				<div class="flex flex-col gap-2">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Response Template</span>
					<SettingsGroup>
						<SettingsGroupItem class="sm:flex-col sm:items-stretch sm:gap-3">
							<SettingsGroupContent>
								<SettingsGroupLabel>Response Template Message</SettingsGroupLabel>
								<SettingsGroupDescription>The message output to chat. Dynamic template variables will resolve dynamically.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction
								class="
									w-full max-w-full
									md:w-full md:max-w-full
								"
							>
								<div class="flex w-full flex-col gap-2">
									<Textarea
										v-model="responseTemplate"
										placeholder="Hello $(sender)! You have $(count wins) wins in $(channel)."
										rows="4"
									/>
									<Alert v-if="isMultiLine" variant="warning">
										<AlertTitle>Multi-Line Template Detected</AlertTitle>
										<AlertDescription>
											We've detected a multi-line template. This will be sent as {{ lineCount }} separate messages.
										</AlertDescription>
									</Alert>
								</div>
							</SettingsGroupAction>
						</SettingsGroupItem>
					</SettingsGroup>

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
				</div>

				<!-- Limits -->
				<div class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Limits</span>
					<SettingsGroup>
						<CommandLimitsFields
							v-model:cost="costValue"
							v-model:global-cooldown="globalCooldownValue"
							v-model:user-cooldown="userCooldownValue"
						/>
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
				<Button :disabled="isSaving" @click="saveConfig">
					<Save data-icon="inline-start" />
					{{ isSaving ? 'Saving...' : 'Save Changes' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
