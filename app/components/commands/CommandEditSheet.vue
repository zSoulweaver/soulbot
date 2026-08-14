<script setup lang="ts">
import type { Alias, Command } from '~/types/commands'
import { ArrowRight, CornerDownRight, HelpCircle, Plus, Save, Trash } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'

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
const permissionValue = ref('everyone')
const allowWhisperValue = ref(false)
const whisperSilentResponseValue = ref(false)

// Aliases edit states
const aliasesList = ref<Alias[]>([])
const newAliasTrigger = ref('')
const newAliasSubcommand = ref('__root__')
const newAliasOverrides = ref('')

const isSaving = ref(false)

// Populate values on edit open
watch(() => props.open, (isOpen) => {
	if (isOpen && props.command) {
		triggerName.value = props.command.trigger || ''
		costValue.value = props.command.cost
		globalCooldownValue.value = props.command.globalCooldown
		userCooldownValue.value = props.command.userCooldown
		isEnabled.value = props.command.enabled
		permissionValue.value = props.command.permission || 'everyone'
		allowWhisperValue.value = Boolean(props.command.allowWhisper)
		whisperSilentResponseValue.value = Boolean(props.command.whisperSilentResponse)

		// Clone aliases and normalize null target subcommands to '__root__'
		aliasesList.value = JSON.parse(JSON.stringify(props.command.aliases || [])).map((alias: any) => ({
			...alias,
			subcommand: alias.subcommand || '__root__',
		}))

		// Clear inputs
		newAliasTrigger.value = ''
		newAliasSubcommand.value = '__root__'
		newAliasOverrides.value = ''
	}
})

const isSubCommand = computed(() => {
	return props.command?.id.includes('.') ?? false
})

const baseCommandTrigger = computed(() => {
	if (!props.command)
		return ''
	return triggerName.value.trim().toLowerCase().replace(/^!/, '') || props.command.id
})

const executableSubcommandPaths = computed(() => {
	if (!props.command || !props.command.subcommands)
		return []
	const paths: string[] = []

	function traverse(subcommandsMap: any, currentPath: string) {
		for (const [name, subcommandRecord] of Object.entries(subcommandsMap)) {
			if (!subcommandRecord || typeof subcommandRecord !== 'object')
				continue
			const detail = subcommandRecord as any
			const path = currentPath ? `${currentPath}.${name}` : name
			if (detail.hasHandler !== false) {
				paths.push(path)
			}
			if (detail.subcommands) {
				traverse(detail.subcommands, path)
			}
		}
	}

	traverse(props.command.subcommands, '')
	return paths
})

function addAliasLocally() {
	const trigger = newAliasTrigger.value.trim().toLowerCase().replace(/^!/, '')
	if (!trigger) {
		toast.error('Alias trigger word is required')
		return
	}

	if (aliasesList.value.some(alias => alias.trigger === trigger)) {
		toast.error(`Alias '!${trigger}' already exists in this list`)
		return
	}

	const overrides = newAliasOverrides.value
		.split(',')
		.map(segment => segment.trim())
		.filter(Boolean)

	aliasesList.value.push({
		trigger,
		subcommand: newAliasSubcommand.value === '__root__' ? null : newAliasSubcommand.value || null,
		overrideArgs: overrides.length > 0 ? overrides : null,
	})

	newAliasTrigger.value = ''
	newAliasSubcommand.value = '__root__'
	newAliasOverrides.value = ''
}

function removeAliasLocally(index: number) {
	aliasesList.value.splice(index, 1)
}

async function saveAllConfig() {
	if (!props.command || isSaving.value)
		return
	isSaving.value = true

	try {
		const cleanTrigger = triggerName.value.trim().toLowerCase().replace(/^!/, '') || null

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
			},
		})

		// Overwrite aliases list (only for root commands)
		if (!isSubCommand.value) {
			await $fetch('/api/commands/aliases', {
				method: 'PUT',
				body: {
					commandId: props.command.id,
					aliases: aliasesList.value.map(alias => ({
						trigger: alias.trigger,
						subcommand: alias.subcommand === '__root__' ? null : alias.subcommand,
						overrideArgs: alias.overrideArgs,
					})),
				},
			})
		}

		const displayName = isSubCommand.value
			? (props.command.trigger || props.command.id.split('.').pop())
			: `!${cleanTrigger || props.command.id}`
		toast.success(`Saved Quick Config for "${displayName}"!`)
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

	const rootId = props.command.id.split('.')[0]
	if (isSubCommand.value && rootId) {
		const subPath = props.command.id.slice(rootId.length + 1).replace(/\./g, ' ')
		navigateTo(`/admin/commands/${rootId}?path=${subPath}`)
	}
	else {
		navigateTo(`/admin/commands/${rootId}`)
	}
}
</script>

<template>
	<Sheet :open="props.open" @update:open="emit('update:open', $event)">
		<SheetContent class="sm:max-w-2xl">
			<SheetHeader class="border-b border-border">
				<SheetTitle>
					Quick Settings - <span class="font-mono font-bold text-primary">!{{ props.command?.id.replace(/\./g, ' ') }}</span>
				</SheetTitle>
				<SheetDescription>
					Adjust point costs, dynamic execution limits, and trigger alias redirections.
				</SheetDescription>
			</SheetHeader>

			<div class="flex flex-col gap-6 overflow-y-auto px-4">
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

				<!-- Link to Template Customizer Card (Dual-mode Navigation) -->
				<Item v-if="props.command?.hasHandler !== false" variant="outline">
					<ItemContent>
						<ItemTitle>Command Response Templates</ItemTitle>
						<ItemDescription>
							Customize chat response messages for this command and it's subcommands parameters on a dedicated full-screen page.
						</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Button
							size="sm" variant="outline" @click="navigateToTemplateEditor"
						>
							Edit Templates
							<ArrowRight data-icon="inline-end" />
						</Button>
					</ItemActions>
				</Item>

				<!-- Toggle Switch for Command Active State -->
				<Item variant="muted">
					<ItemContent>
						<ItemTitle>Enable Trigger</ItemTitle>
						<ItemDescription>
							Toggle command activation state in chat.
						</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Switch v-model:model-value="isEnabled" />
					</ItemActions>
				</Item>

				<!-- Toggle Switch for Whisper Execution Support & Settings -->
				<div class="rounded-md bg-muted/50 transition-colors">
					<Item variant="default" class="rounded-none">
						<ItemContent>
							<ItemTitle>Allow in Whispers</ItemTitle>
							<ItemDescription class="line-clamp-none text-wrap">
								Allow this command to be triggered via private whisper to the bot.
							</ItemDescription>
						</ItemContent>
						<ItemActions>
							<Switch v-model:model-value="allowWhisperValue" />
						</ItemActions>
					</Item>

					<template v-if="allowWhisperValue">
						<div class="border-t border-border/40" />
						<Item variant="default" class="rounded-none">
							<ItemContent>
								<ItemTitle>Suppress Response When Whispered</ItemTitle>
								<ItemDescription class="line-clamp-none text-wrap">
									Execute whispered commands silently without sending any confirmation response to chat.
									<span
										class="
											mt-1 block text-xs font-medium text-amber-500
											dark:text-amber-400
										"
									>
										Warning: With this enabled, there will be no chat output or confirmation when the command runs.
									</span>
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<Switch v-model:model-value="whisperSilentResponseValue" />
							</ItemActions>
						</Item>
					</template>
				</div>

				<FieldGroup>
					<!-- Active Trigger Word Segment -->
					<Field>
						<FieldLabel for="active-trigger">
							Active Trigger Word
						</FieldLabel>
						<InputGroup>
							<InputGroupAddon class="bg-muted px-3">
								{{ props?.command?.parentTriggerPath || '!' }}
							</InputGroupAddon>
							<InputGroupInput
								id="active-trigger"
								v-model="triggerName"
								placeholder="trigger"
							/>
						</InputGroup>
						<FieldDescription>Keep blank to use default command value.</FieldDescription>
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
						:disabled="props.command?.hasHandler === false"
					/>

					<FieldSeparator />

					<!-- Command Aliases Segment -->
					<FieldSet v-if="!isSubCommand">
						<FieldLegend class="text-sm font-semibold">
							Command Aliases
						</FieldLegend>
						<FieldDescription>Map dynamic chat triggers directly to subcommands with optional parameter overrides.</FieldDescription>

						<Item variant="outline" class="w-full">
							<ItemContent>
								<FieldGroup>
									<Field orientation="horizontal">
										<FieldLabel for="alias-trigger" class="w-52 shrink-0">
											Trigger Word
										</FieldLabel>
										<InputGroup>
											<InputGroupAddon class="bg-muted px-3">
												!
											</InputGroupAddon>
											<InputGroupInput
												id="alias-trigger"
												v-model="newAliasTrigger"
												placeholder="command"
												class="w-full"
											/>
										</InputGroup>
									</Field>

									<Field orientation="horizontal">
										<FieldLabel for="alias-subcommand" class="w-52 shrink-0">
											Target Subcommand
										</FieldLabel>
										<Select v-model="newAliasSubcommand">
											<SelectTrigger id="alias-subcommand" class="w-full">
												<SelectValue placeholder="subcommand" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="__root__">
													-- None (runs root/base command) --
												</SelectItem>
												<SelectItem v-for="path in executableSubcommandPaths" :key="path" :value="path">
													{{ path.replace(/\./g, ' ') }}
												</SelectItem>
											</SelectContent>
										</Select>
									</Field>

									<Field orientation="horizontal">
										<FieldLabel for="alias-overrides" class="w-52 shrink-0">
											Argument Overrides (Comma split)
										</FieldLabel>
										<Input
											id="alias-overrides"
											v-model="newAliasOverrides"
											placeholder="user, 50"
										/>
									</Field>

									<Button size="sm" @click="addAliasLocally">
										<Plus data-icon="inline-start" />
										Add Alias
									</Button>
								</FieldGroup>
							</ItemContent>
						</Item>

						<!-- Active Alias Items -->
						<div class="flex w-full flex-col gap-2">
							<Item
								v-for="(alias, index) in aliasesList"
								:key="alias.trigger" variant="muted"
								size="sm"
								class="w-full"
							>
								<ItemContent>
									<ItemTitle class="font-mono">
										!{{ alias.trigger }}
									</ItemTitle>
									<ItemDescription>
										<div class="ml-1 flex items-center gap-1 font-mono">
											<CornerDownRight class="size-5" />
											<p class="mt-1">
												!{{ baseCommandTrigger }}
												<span v-if="alias.subcommand && alias.subcommand !== '__root__'"> {{ alias.subcommand.replace(/\./g, ' ') }}</span>
												<span v-if="alias.overrideArgs && alias.overrideArgs.length"> {{ alias.overrideArgs.join(' ') }}</span>
											</p>
										</div>
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Button
										size="sm" variant="ghostDestructive" @click="removeAliasLocally(index)"
									>
										<Trash data-icon="inline-start" />
										Remove
									</Button>
								</ItemActions>
							</Item>
						</div>
					</FieldSet>
				</FieldGroup>
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
					{{ isSaving ? 'Saving...' : 'Save Quick Config' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
