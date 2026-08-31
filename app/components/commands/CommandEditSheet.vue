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

// Aliases edit states (node-scoped: only aliases targeting the open node)
const showAddForm = ref(false)
const newAliasTrigger = ref('')
const newAliasOverrides = ref('')
const editingKey = ref<string | null>(null)
const editTrigger = ref('')
const editOverrides = ref('')
const isSaving = ref(false)

interface CommandDraft {
	trigger: string
	cost: number
	globalCooldown: number
	userCooldown: number
	enabled: boolean
	hidden: boolean
	permission: string
	allowWhisper: boolean
	whisperSilentResponse: boolean
	aliases: Alias[]
}

const {
	draft,
	isModified,
	reset: resetDraft,
} = useFormDraft<CommandDraft>(
	() => {
		if (!props.command)
			return null
		return {
			trigger: props.command.trigger || '',
			cost: props.command.cost,
			globalCooldown: props.command.globalCooldown,
			userCooldown: props.command.userCooldown,
			enabled: props.command.enabled,
			hidden: Boolean(props.command.hidden),
			permission: props.command.permission || 'everyone',
			allowWhisper: Boolean(props.command.allowWhisper),
			whisperSilentResponse: Boolean(props.command.whisperSilentResponse),
			aliases: props.command.aliases || [],
		}
	},
	() => ({
		trigger: '',
		cost: 0,
		globalCooldown: 0,
		userCooldown: 0,
		enabled: true,
		hidden: false,
		permission: 'everyone',
		allowWhisper: false,
		whisperSilentResponse: false,
		aliases: [],
	}),
)

function cleanTriggerInput(value: string): string {
	return value.trim().toLowerCase().replace(/^!/, '')
}

function splitOverrides(value: string): string[] {
	return value
		.split(',')
		.map(segment => segment.trim())
		.filter(Boolean)
}

// Reset aliases UI sub-states on edit open
watch(() => props.open, (isOpen) => {
	if (isOpen) {
		resetDraft()
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
		return cleanTriggerInput(draft.value.trigger) || props.command.id
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

	if (draft.value.aliases.some(alias => alias.trigger === trigger)) {
		toast.error(`Alias '!${trigger}' already exists in this list`)
		return
	}

	const overrides = splitOverrides(newAliasOverrides.value)

	draft.value.aliases.push({
		trigger,
		subcommand: scopePath.value,
		overrideArgs: overrides.length > 0 ? overrides : null,
	})

	newAliasTrigger.value = ''
	newAliasOverrides.value = ''
	showAddForm.value = false
}

function removeAliasLocally(trigger: string) {
	draft.value.aliases = draft.value.aliases.filter(alias => alias.trigger !== trigger)
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

	if (draft.value.aliases.some(alias => alias.trigger !== originalTrigger && alias.trigger === trigger)) {
		toast.error(`Alias '!${trigger}' already exists in this list`)
		return
	}

	const index = draft.value.aliases.findIndex(alias => alias.trigger === originalTrigger)
	if (index === -1)
		return

	const overrides = splitOverrides(editOverrides.value)
	draft.value.aliases[index] = {
		...draft.value.aliases[index]!,
		trigger,
		overrideArgs: overrides.length > 0 ? overrides : null,
	}
	cancelEditAlias()
}

async function saveAllConfig() {
	if (!props.command || isSaving.value || !isModified.value)
		return
	isSaving.value = true

	try {
		const cleanTrigger = cleanTriggerInput(draft.value.trigger) || null

		// Update primary command DB config
		await $fetch('/api/commands/save', {
			method: 'PUT',
			body: {
				id: props.command.id,
				trigger: cleanTrigger,
				enabled: draft.value.enabled,
				cost: typeof draft.value.cost === 'number' && !Number.isNaN(draft.value.cost) ? draft.value.cost : 0,
				globalCooldown: typeof draft.value.globalCooldown === 'number' && !Number.isNaN(draft.value.globalCooldown) ? draft.value.globalCooldown : 0,
				userCooldown: typeof draft.value.userCooldown === 'number' && !Number.isNaN(draft.value.userCooldown) ? draft.value.userCooldown : 0,
				permission: draft.value.permission,
				allowWhisper: draft.value.allowWhisper,
				whisperSilentResponse: draft.value.whisperSilentResponse,
				hidden: draft.value.hidden,
			},
		})

		// Replace aliases for this node's scope only (group nodes have no handler to target)
		if (props.command.hasHandler !== false) {
			await $fetch('/api/commands/aliases', {
				method: 'PUT',
				body: {
					commandId: rootId.value,
					subcommand: scopePath.value,
					aliases: draft.value.aliases.map(alias => ({
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
							v-model:enabled="draft.enabled"
							v-model:allow-whisper="draft.allowWhisper"
							v-model:whisper-silent-response="draft.whisperSilentResponse"
							v-model:hidden="draft.hidden"
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
										v-model="draft.trigger"
										placeholder="trigger"
									/>
								</InputGroup>
							</SettingsGroupAction>
						</SettingsGroupItem>

						<CommandPermissionSelect v-model="draft.permission" />
					</SettingsGroup>
				</div>

				<!-- Limits -->
				<div class="flex flex-col gap-1">
					<span class="text-xs font-bold tracking-wider text-muted-foreground select-none">Limits</span>
					<SettingsGroup>
						<CommandLimitsFields
							v-model:cost="draft.cost"
							v-model:global-cooldown="draft.globalCooldown"
							v-model:user-cooldown="draft.userCooldown"
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
						<template v-for="alias in draft.aliases" :key="alias.trigger">
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
						v-if="draft.aliases.length === 0"
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
				<Button :disabled="!isModified || isSaving" @click="saveAllConfig">
					<Save data-icon="inline-start" />
					{{ isSaving ? 'Saving...' : 'Save Changes' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
