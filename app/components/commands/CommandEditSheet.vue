<script setup lang="ts">
import { ArrowRight, BadgeDollarSign, Clock, CornerDownRight, HelpCircle, Plus, Save, Trash } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '~/components/ui/sheet'

interface Alias {
	id?: number
	trigger: string
	subcommand: string | null
	overrideArgs: string[] | null
}

interface Command {
	id: string
	description: string
	permission: string
	trigger: string
	parentTriggerPath?: string
	enabled: boolean
	cost: number
	globalCooldown: number
	userCooldown: number
	aliases: Alias[]
	subcommands?: Record<string, any>
	hasHandler?: boolean
}

const props = defineProps<{
	command: Command | null
	open: boolean
}>()

const emit = defineEmits(['update:open', 'saved'])

// Local state fields
const triggerName = ref('')
const costVal = ref(0)
const globalCooldownVal = ref(0)
const userCooldownVal = ref(0)
const isEnabled = ref(true)
const permissionVal = ref('everyone')

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
		costVal.value = props.command.cost
		globalCooldownVal.value = props.command.globalCooldown
		userCooldownVal.value = props.command.userCooldown
		isEnabled.value = props.command.enabled
		permissionVal.value = props.command.permission || 'everyone'

		// Clone aliases and normalize null target subcommands to '__root__'
		aliasesList.value = JSON.parse(JSON.stringify(props.command.aliases || [])).map((a: any) => ({
			...a,
			subcommand: a.subcommand || '__root__',
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

	function traverse(obj: any, currentPath: string) {
		for (const [name, val] of Object.entries(obj)) {
			if (!val || typeof val !== 'object')
				continue
			const detail = val as any
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

	if (aliasesList.value.some(a => a.trigger === trigger)) {
		toast.error(`Alias '!${trigger}' already exists in this list`)
		return
	}

	const overrides = newAliasOverrides.value
		.split(',')
		.map(s => s.trim())
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
	if (!props.command)
		return
	isSaving.value = true

	try {
		const cleanTrigger = triggerName.value.trim().toLowerCase().replace(/^!/, '') || null

		// 1. Update primary command DB config
		await $fetch('/api/commands/save', {
			method: 'PUT',
			body: {
				id: props.command.id,
				trigger: cleanTrigger,
				enabled: isEnabled.value,
				cost: costVal.value,
				globalCooldown: globalCooldownVal.value,
				userCooldown: userCooldownVal.value,
				permission: permissionVal.value,
			},
		})

		// 2. Overwrite aliases list (only for root commands)
		if (!isSubCommand.value) {
			await $fetch('/api/commands/aliases', {
				method: 'PUT',
				body: {
					commandId: props.command.id,
					aliases: aliasesList.value.map(a => ({
						trigger: a.trigger,
						subcommand: a.subcommand === '__root__' ? null : a.subcommand,
						overrideArgs: a.overrideArgs,
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
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save configuration')
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

			<div class="space-y-6 overflow-y-auto px-4">
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
							<ArrowRight class="size-3.5" />
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

				<FieldGroup>
					<!-- Active Trigger Word Segment -->
					<Field>
						<FieldLabel for="active-trigger">
							Active Trigger Word
						</FieldLabel>
						<InputGroup>
							<InputGroupInput
								id="active-trigger"
								v-model="triggerName"
								placeholder="trigger"
							/>
							<InputGroupAddon class="bg-muted px-3">
								{{ props?.command?.parentTriggerPath || '!' }}
							</InputGroupAddon>
						</InputGroup>
						<FieldDescription>Keep blank to use default command value.</FieldDescription>
					</Field>

					<FieldSeparator />

					<!-- Custom Permission Level Segment -->
					<Field>
						<FieldLabel for="permission-level">
							Required Permission Level
						</FieldLabel>
						<Select v-model="permissionVal">
							<SelectTrigger id="permission-level" class="w-full">
								<SelectValue placeholder="Select Permission Level" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="everyone">
									Everyone
								</SelectItem>
								<SelectItem value="subscriber">
									Subscriber
								</SelectItem>
								<SelectItem value="vip">
									VIP
								</SelectItem>
								<SelectItem value="moderator">
									Moderator
								</SelectItem>
								<SelectItem value="broadcaster">
									Broadcaster
								</SelectItem>
							</SelectContent>
						</Select>
						<FieldDescription>Select the minimum chat badge role required to execute this trigger.</FieldDescription>
					</Field>

					<FieldSeparator />

					<!-- Config Stepper Fields (Points, Global Cooldown, User Cooldown) -->
					<div class="grid grid-cols-3 gap-4">
						<Field>
							<FieldLabel for="editCost" class="flex items-center gap-1">
								<BadgeDollarSign class="size-4" />
								Point Cost
							</FieldLabel>
							<NumberField id="editCost" v-model="costVal" :min="0" :disabled="props.command?.hasHandler === false" class="w-full">
								<NumberFieldContent>
									<NumberFieldDecrement />
									<NumberFieldInput />
									<NumberFieldIncrement />
								</NumberFieldContent>
							</NumberField>
						</Field>

						<Field>
							<FieldLabel for="editGlobalCooldown" class="flex items-center gap-1">
								<Clock class="size-4" />
								Global CD (Sec)
							</FieldLabel>
							<NumberField id="editGlobalCooldown" v-model="globalCooldownVal" :min="0" :disabled="props.command?.hasHandler === false" class="w-full">
								<NumberFieldContent>
									<NumberFieldDecrement />
									<NumberFieldInput />
									<NumberFieldIncrement />
								</NumberFieldContent>
							</NumberField>
						</Field>

						<Field>
							<FieldLabel for="editUserCooldown" class="flex items-center gap-1">
								<Clock class="size-4" />
								User CD (Sec)
							</FieldLabel>
							<NumberField id="editUserCooldown" v-model="userCooldownVal" :min="0" :disabled="props.command?.hasHandler === false" class="w-full">
								<NumberFieldContent>
									<NumberFieldDecrement />
									<NumberFieldInput />
									<NumberFieldIncrement />
								</NumberFieldContent>
							</NumberField>
						</Field>
					</div>

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
											<InputGroupInput
												id="alias-trigger"
												v-model="newAliasTrigger"
												placeholder="command"
												class="w-full"
											/>
											<InputGroupAddon class="bg-muted px-3">
												!
											</InputGroupAddon>
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
										<Plus />
										Add Alias
									</Button>
								</FieldGroup>
							</ItemContent>
						</Item>

						<!-- Active Alias Items -->
						<div class="w-full space-y-2">
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
										size="sm" variant="destructive" @click="removeAliasLocally(index)"
									>
										<Trash />
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
				<Button variant="outline" @click="emit('update:open', false)">
					Cancel
				</Button>
				<Button :disabled="isSaving" @click="saveAllConfig">
					<Save />
					{{ isSaving ? 'Saving...' : 'Save Quick Config' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
