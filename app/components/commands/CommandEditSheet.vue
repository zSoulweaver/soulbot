<script setup lang="ts">
import type { Alias, Command } from '~/types/commands'
import { ArrowRight, CornerDownRight, HelpCircle, Pencil, Plus, Save, Trash } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import CommandLimitsFields from '~/components/commands/CommandLimitsFields.vue'
import CommandPermissionSelect from '~/components/commands/CommandPermissionSelect.vue'
import CommandStatusSettings from '~/components/commands/CommandStatusSettings.vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'

const props = defineProps<{
	command: Command | null
	open: boolean
}>()

const emit = defineEmits(['update:open', 'saved'])

// Local state fields
const triggerName = ref('')
const costValue = ref(0)
const globalCooldownValue = ref(0)
const userCooldownValue = ref(0)
const isEnabled = ref(true)
const isHidden = ref(false)
const permissionValue = ref('everyone')
const allowWhisperValue = ref(false)
const whisperSilentResponseValue = ref(false)

// Aliases edit states (node-scoped: only aliases targeting the open node)
const aliasesList = ref<Alias[]>([])
const showAddForm = ref(false)
const newAliasTrigger = ref('')
const newAliasOverrides = ref('')
const editingKey = ref<string | null>(null)
const editTrigger = ref('')
const editOverrides = ref('')

const isSaving = ref(false)

function cleanTriggerInput(value: string): string {
	return value.trim().toLowerCase().replace(/^!/, '')
}

function splitOverrides(value: string): string[] {
	return value
		.split(',')
		.map(segment => segment.trim())
		.filter(Boolean)
}

// Populate values on edit open
watch(() => props.open, (isOpen) => {
	if (isOpen && props.command) {
		triggerName.value = props.command.trigger || ''
		costValue.value = props.command.cost
		globalCooldownValue.value = props.command.globalCooldown
		userCooldownValue.value = props.command.userCooldown
		isEnabled.value = props.command.enabled
		isHidden.value = Boolean(props.command.hidden)
		permissionValue.value = props.command.permission || 'everyone'
		allowWhisperValue.value = Boolean(props.command.allowWhisper)
		whisperSilentResponseValue.value = Boolean(props.command.whisperSilentResponse)

		aliasesList.value = JSON.parse(JSON.stringify(props.command.aliases || []))

		showAddForm.value = false
		newAliasTrigger.value = ''
		newAliasOverrides.value = ''
		editingKey.value = null
	}
})

const isSubCommand = computed(() => {
	return props.command?.id.includes('.') ?? false
})

// Root command id and relative dotted scope path of the open node
const rootId = computed(() => props.command?.id.split('.')[0] ?? '')
const scopePath = computed(() => {
	const id = props.command?.id
	if (!id)
		return null
	const dotIndex = id.indexOf('.')
	return dotIndex === -1 ? null : id.slice(dotIndex + 1)
})

const baseCommandTrigger = computed(() => {
	if (!props.command)
		return ''
	if (!scopePath.value) {
		return cleanTriggerInput(triggerName.value) || props.command.id
	}
	return (props.command.parentTriggerPath || `!${rootId.value}`).replace(/^!/, '')
})

// Resolved execution target shared by all aliases in this scope: !<baseTrigger> [path]
const resolvedTarget = computed(() => {
	const parts = [baseCommandTrigger.value]
	if (scopePath.value) {
		parts.push(scopePath.value.replace(/\./g, ' '))
	}
	return parts.filter(Boolean).join(' ')
})

function toggleAddForm() {
	showAddForm.value = !showAddForm.value
	newAliasTrigger.value = ''
	newAliasOverrides.value = ''
}

function addAliasLocally() {
	const trigger = cleanTriggerInput(newAliasTrigger.value)
	if (!trigger) {
		toast.error('Alias trigger word is required')
		return
	}

	if (aliasesList.value.some(alias => alias.trigger === trigger)) {
		toast.error(`Alias '!${trigger}' already exists in this list`)
		return
	}

	const overrides = splitOverrides(newAliasOverrides.value)

	aliasesList.value.push({
		trigger,
		subcommand: scopePath.value,
		overrideArgs: overrides.length > 0 ? overrides : null,
	})

	newAliasTrigger.value = ''
	newAliasOverrides.value = ''
	showAddForm.value = false
}

function removeAliasLocally(trigger: string) {
	aliasesList.value = aliasesList.value.filter(alias => alias.trigger !== trigger)
	if (editingKey.value === trigger) {
		cancelEditAlias()
	}
}

function startEditAlias(alias: Alias) {
	editingKey.value = alias.trigger
	editTrigger.value = alias.trigger
	editOverrides.value = alias.overrideArgs?.join(', ') ?? ''
}

function cancelEditAlias() {
	editingKey.value = null
	editTrigger.value = ''
	editOverrides.value = ''
}

function saveEditAlias(originalTrigger: string) {
	const trigger = cleanTriggerInput(editTrigger.value)
	if (!trigger) {
		toast.error('Alias trigger word is required')
		return
	}

	if (aliasesList.value.some(alias => alias.trigger !== originalTrigger && alias.trigger === trigger)) {
		toast.error(`Alias '!${trigger}' already exists in this list`)
		return
	}

	const index = aliasesList.value.findIndex(alias => alias.trigger === originalTrigger)
	if (index === -1)
		return

	const overrides = splitOverrides(editOverrides.value)
	aliasesList.value[index] = {
		...aliasesList.value[index]!,
		trigger,
		overrideArgs: overrides.length > 0 ? overrides : null,
	}
	cancelEditAlias()
}

async function saveAllConfig() {
	if (!props.command || isSaving.value)
		return
	isSaving.value = true

	try {
		const cleanTrigger = cleanTriggerInput(triggerName.value) || null

		// Update primary command DB config
		await $fetch('/api/commands/save', {
			method: 'PUT',
			body: {
				id: props.command.id,
				trigger: cleanTrigger,
				enabled: isEnabled.value,
				cost: typeof costValue.value === 'number' && !Number.isNaN(costValue.value) ? costValue.value : 0,
				globalCooldown: typeof globalCooldownValue.value === 'number' && !Number.isNaN(globalCooldownValue.value) ? globalCooldownValue.value : 0,
				userCooldown: typeof userCooldownValue.value === 'number' && !Number.isNaN(userCooldownValue.value) ? userCooldownValue.value : 0,
				permission: permissionValue.value,
				allowWhisper: allowWhisperValue.value,
				whisperSilentResponse: whisperSilentResponseValue.value,
				hidden: isHidden.value,
			},
		})

		// Replace aliases for this node's scope only (group nodes have no handler to target)
		if (props.command.hasHandler !== false) {
			await $fetch('/api/commands/aliases', {
				method: 'PUT',
				body: {
					commandId: rootId.value,
					subcommand: scopePath.value,
					aliases: aliasesList.value.map(alias => ({
						trigger: alias.trigger,
						overrideArgs: alias.overrideArgs,
					})),
				},
			})
		}

		const displayName = isSubCommand.value
			? `!${baseCommandTrigger.value} ${scopePath.value?.replace(/\./g, ' ')}`.trim()
			: `!${cleanTrigger || props.command.id}`
		toast.success(`Saved settings for "${displayName}"!`)
		emit('saved')
		emit('update:open', false)
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to save configuration')
	}
	finally {
		isSaving.value = false
	}
}

// Route navigation helper to templates customizer
function navigateToTemplateEditor() {
	if (!props.command)
		return
	emit('update:open', false)

	if (isSubCommand.value && rootId.value) {
		const subPath = scopePath.value?.replace(/\./g, ' ')
		navigateTo(subPath ? `/admin/commands/${rootId.value}?path=${subPath}` : `/admin/commands/${rootId.value}`)
	}
	else {
		navigateTo(`/admin/commands/${rootId.value}`)
	}
}
</script>

<template>
	<Sheet :open="props.open" @update:open="emit('update:open', $event)">
		<SheetContent class="sm:max-w-3xl">
			<SheetHeader class="border-b border-border">
				<SheetTitle>
					Command Settings - <span class="font-mono font-bold text-primary">!{{ props.command?.id.replace(/\./g, ' ') }}</span>
				</SheetTitle>
				<SheetDescription>
					Adjust activation status, trigger access, point costs, execution limits, and node-scoped alias redirections.
				</SheetDescription>
			</SheetHeader>

			<div class="flex flex-col gap-6 overflow-y-auto px-4 py-2">
				<!-- Alert for Non-executable Command Groups -->
				<Alert v-if="props.command?.hasHandler === false">
					<HelpCircle />
					<AlertTitle>
						Command Group Trigger
					</AlertTitle>
					<AlertDescription>
						This command acts strictly as a structural group/namespace trigger. Point cost and cooldown settings are disabled since it contains no direct execution handler.
					</AlertDescription>
				</Alert>

				<!-- Response Templates Navigation -->
				<div v-if="props.command?.hasHandler !== false" class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Response Templates</span>
					<SettingsGroup>
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Customize Chat Responses</SettingsGroupLabel>
								<SettingsGroupDescription>
									Customize chat response messages for this command and its subcommands parameters on a dedicated full-screen page.
								</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Button size="sm" variant="outline" @click="navigateToTemplateEditor">
									Edit Templates
									<ArrowRight data-icon="inline-end" />
								</Button>
							</SettingsGroupAction>
						</SettingsGroupItem>
					</SettingsGroup>
				</div>

				<!-- Status -->
				<div class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Status</span>
					<SettingsGroup>
						<CommandStatusSettings
							v-model:enabled="isEnabled"
							v-model:allow-whisper="allowWhisperValue"
							v-model:whisper-silent-response="whisperSilentResponseValue"
							v-model:hidden="isHidden"
						/>
					</SettingsGroup>
				</div>

				<!-- Trigger & Access -->
				<div class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Trigger &amp; Access</span>
					<SettingsGroup>
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Active Trigger Word</SettingsGroupLabel>
								<SettingsGroupDescription>Keep blank to use default command value.</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<InputGroup class="w-full">
									<InputGroupAddon class="bg-muted px-3">
										{{ props?.command?.parentTriggerPath || '!' }}
									</InputGroupAddon>
									<InputGroupInput
										v-model="triggerName"
										placeholder="trigger"
									/>
								</InputGroup>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<CommandPermissionSelect v-model="permissionValue" />
					</SettingsGroup>
				</div>

				<!-- Limits -->
				<div class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Limits</span>
					<SettingsGroup>
						<CommandLimitsFields
							v-model:cost="costValue"
							v-model:global-cooldown="globalCooldownValue"
							v-model:user-cooldown="userCooldownValue"
							:disabled="props.command?.hasHandler === false"
						/>
					</SettingsGroup>
				</div>

				<!-- Node-scoped Alias Manager -->
				<div v-if="props.command?.hasHandler !== false" class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Aliases</span>
					<SettingsGroup>
						<SettingsGroupItem>
							<SettingsGroupContent>
								<SettingsGroupLabel>Alias Triggers</SettingsGroupLabel>
								<SettingsGroupDescription>
									Extra chat triggers that execute this exact node with optional argument overrides.
								</SettingsGroupDescription>
							</SettingsGroupContent>
							<SettingsGroupAction>
								<Button size="sm" variant="outline" @click="toggleAddForm">
									<Plus data-icon="inline-start" />
									Add Alias
								</Button>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<!-- Collapsed Add Form -->
						<SettingsGroupItem v-if="showAddForm" class="sm:flex-col sm:items-stretch sm:gap-3">
							<SettingsGroupContent class="sm:pr-0">
								<SettingsGroupLabel>New Alias Trigger</SettingsGroupLabel>
								<SettingsGroupDescription>
									Comma-separated overrides are appended as fixed arguments when the alias runs.
								</SettingsGroupDescription>
								<div class="flex w-full flex-col gap-2 pt-1">
									<InputGroup class="w-full">
										<InputGroupAddon class="bg-muted px-3">
											!
										</InputGroupAddon>
										<InputGroupInput
											v-model="newAliasTrigger"
											placeholder="command"
										/>
									</InputGroup>
									<Input
										v-model="newAliasOverrides"
										placeholder="Argument overrides, comma split (e.g. user, 50)"
									/>
									<div class="flex items-center gap-2">
										<Button size="sm" @click="addAliasLocally">
											<Plus data-icon="inline-start" />
											Add Alias
										</Button>
										<Button size="sm" variant="ghost" @click="showAddForm = false">
											Cancel
										</Button>
									</div>
								</div>
							</SettingsGroupContent>
						</SettingsGroupItem>

						<!-- Alias Rows -->
						<template v-for="alias in aliasesList" :key="alias.trigger">
							<SettingsGroupItem v-if="editingKey === alias.trigger" class="sm:flex-col sm:items-stretch sm:gap-3">
								<SettingsGroupContent class="sm:pr-0">
									<SettingsGroupLabel>Edit Alias Trigger</SettingsGroupLabel>
									<div class="flex w-full flex-col gap-2 pt-1">
										<InputGroup class="w-full">
											<InputGroupAddon class="bg-muted px-3">
												!
											</InputGroupAddon>
											<InputGroupInput
												v-model="editTrigger"
												placeholder="command"
											/>
										</InputGroup>
										<Input
											v-model="editOverrides"
											placeholder="Argument overrides, comma split (e.g. user, 50)"
										/>
										<div class="flex items-center gap-2">
											<Button size="sm" @click="saveEditAlias(alias.trigger)">
												Save
											</Button>
											<Button size="sm" variant="ghost" @click="cancelEditAlias">
												Cancel
											</Button>
										</div>
									</div>
								</SettingsGroupContent>
							</SettingsGroupItem>

							<SettingsGroupItem v-else>
								<SettingsGroupContent>
									<SettingsGroupLabel class="font-mono">
										!{{ alias.trigger }}
									</SettingsGroupLabel>
									<SettingsGroupDescription class="flex items-center gap-1 font-mono text-wrap">
										<CornerDownRight class="size-3 shrink-0" />
										<span>!{{ resolvedTarget }}<template v-if="alias.overrideArgs?.length">&nbsp;{{ alias.overrideArgs.join(' ') }}</template></span>
									</SettingsGroupDescription>
								</SettingsGroupContent>
								<SettingsGroupAction>
									<Button size="sm" variant="ghost" @click="startEditAlias(alias)">
										<Pencil data-icon="inline-start" />
										Edit
									</Button>
									<Button size="sm" variant="ghostDestructive" @click="removeAliasLocally(alias.trigger)">
										<Trash data-icon="inline-start" />
										Remove
									</Button>
								</SettingsGroupAction>
							</SettingsGroupItem>
						</template>
					</SettingsGroup>

					<div
						v-if="aliasesList.length === 0"
						class="rounded-lg border border-dashed py-4 text-center text-xs text-muted-foreground"
					>
						No aliases configured for this node. Click "Add Alias" to create one.
					</div>
				</div>
			</div>

			<!-- Pinned Bottom Footer with docked buttons -->
			<SheetFooter class="flex flex-row items-center justify-end gap-2 border-t">
				<SheetClose as-child>
					<Button variant="outline">
						Cancel
					</Button>
				</SheetClose>
				<Button :disabled="isSaving" @click="saveAllConfig">
					<Save data-icon="inline-start" />
					{{ isSaving ? 'Saving...' : 'Save Changes' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
