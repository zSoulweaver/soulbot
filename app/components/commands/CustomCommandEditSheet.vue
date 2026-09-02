<script setup lang="ts">
import { Save } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import CommandLimitsFields from '~/components/commands/CommandLimitsFields.vue'
import CommandPermissionSelect from '~/components/commands/CommandPermissionSelect.vue'
import CommandStatusSettings from '~/components/commands/CommandStatusSettings.vue'
import TemplateEditor from '~/components/templates/TemplateEditor.vue'
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

const isSaving = ref(false)

const isEditMode = computed(() => {
	return props.command !== null && props.command !== undefined && props.command.id !== undefined
})

interface CustomCommandDraft {
	trigger: string
	response: string
	description: string
	cost: number
	globalCooldown: number
	userCooldown: number
	enabled: boolean
	hidden: boolean
	permission: string
}

const {
	draft,
	isModified,
	reset: resetDraft,
} = useFormDraft<CustomCommandDraft>(
	() => {
		if (!props.command || !props.command.id)
			return null
		return {
			trigger: props.command.trigger || '',
			response: props.command.response || '',
			description: props.command.description || '',
			cost: props.command.cost || 0,
			globalCooldown: props.command.globalCooldown || 0,
			userCooldown: props.command.userCooldown || 0,
			enabled: props.command.enabled !== false,
			hidden: Boolean(props.command.hidden),
			permission: props.command.permission || 'everyone',
		}
	},
	() => ({
		trigger: '',
		response: '',
		description: '',
		cost: 0,
		globalCooldown: 0,
		userCooldown: 0,
		enabled: true,
		hidden: false,
		permission: 'everyone',
	}),
)

const responseLines = computed(() => {
	if (!draft.value.response)
		return []
	return draft.value.response.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
})

const lineCount = computed(() => responseLines.value.length)
const isMultiLine = computed(() => lineCount.value > 1)

// Reset draft on open or change
watch(() => props.open, (isOpen) => {
	if (isOpen) {
		resetDraft()
	}
})

async function saveConfig() {
	if (isSaving.value || (isEditMode.value && !isModified.value))
		return
	const trigger = draft.value.trigger.trim().toLowerCase().replace(/^!/, '')
	if (!trigger) {
		toast.error('Trigger word is required.')
		return
	}

	if (!draft.value.response.trim()) {
		toast.error('Response template is required.')
		return
	}

	isSaving.value = true

	try {
		const payload = {
			id: isEditMode.value ? props.command.id : undefined,
			trigger,
			response: draft.value.response.trim(),
			description: draft.value.description.trim() || null,
			enabled: draft.value.enabled,
			cost: draft.value.cost,
			globalCooldown: draft.value.globalCooldown,
			userCooldown: draft.value.userCooldown,
			permission: draft.value.permission,
			hidden: draft.value.hidden,
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
							v-model:enabled="draft.enabled"
							v-model:hidden="draft.hidden"
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
										v-model="draft.trigger"
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
									v-model="draft.description"
									placeholder="Returns wins count"
									class="w-full"
								/>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<CommandPermissionSelect v-model="draft.permission" />
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
									<TemplateEditor
										v-model="draft.response"
										scope="commands.custom"
										:reply-to="true"
										placeholder="Hello $(sender)! You have $(count wins) wins in $(channel)."
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
							v-model:cost="draft.cost"
							v-model:global-cooldown="draft.globalCooldown"
							v-model:user-cooldown="draft.userCooldown"
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
				<Button :disabled="(isEditMode && !isModified) || isSaving" @click="saveConfig">
					<Save data-icon="inline-start" />
					{{ isSaving ? 'Saving...' : 'Save Changes' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
