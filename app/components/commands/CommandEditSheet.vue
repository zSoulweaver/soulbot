<script setup lang="ts">
import {
	ArrowRight,
	Clock,
	Coins,
	HelpCircle,
	Plus,
	Save,
	Sliders,
	X,
} from 'lucide-vue-next'
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
		triggerName.value = props.command.trigger
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
		if (!isSubCommand.value && !cleanTrigger) {
			toast.error('Trigger word is required')
			isSaving.value = false
			return
		}

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

		const displayName = isSubCommand.value ? props.command.trigger : `!${cleanTrigger}`
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
	} else {
		navigateTo(`/admin/commands/${rootId}`)
	}
}
</script>

<template>
	<Sheet :open="props.open" @update:open="emit('update:open', $event)">
		<!-- Setting p-0 to allow absolute control over flex boundaries -->
		<SheetContent
			class="
				flex size-full flex-col border-l border-border bg-card/95 p-0 text-foreground
				sm:max-w-2xl
			"
		>
			<!-- Pinned Header Container (with px-6 py-4 padding) -->
			<SheetHeader class="border-b border-border px-6 py-4 select-none">
				<SheetTitle class="flex items-center gap-2 text-xl font-bold">
					Quick Settings - <span class="font-mono font-bold text-primary">!{{ props.command?.id.replace(/\./g, ' ') }}</span>
				</SheetTitle>
				<SheetDescription>
					Adjust point costs, dynamic execution limits, and trigger alias redirections.
				</SheetDescription>
			</SheetHeader>

			<!-- Scrollable Content Body with px-6 Padding -->
			<div class="flex-1 space-y-6 overflow-y-auto px-6 py-5">
				<!-- Alert for Non-executable Command Groups -->
				<Alert v-if="props.command?.hasHandler === false" variant="default" class="border-border bg-muted/30 select-none">
					<HelpCircle class="size-4 text-muted-foreground" />
					<AlertTitle class="text-xs font-semibold text-foreground">
						Command Group Trigger
					</AlertTitle>
					<AlertDescription class="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
						This command acts strictly as a structural group/namespace trigger. Point cost and cooldown settings are disabled since it contains no direct execution handler.
					</AlertDescription>
				</Alert>

				<!-- Link to Template Customizer Card (Dual-mode Navigation) -->
				<Card v-if="props.command?.hasHandler !== false" class="flex flex-col gap-3 border-primary/20 bg-primary/5 p-4">
					<div class="flex flex-col gap-0.5">
						<span class="flex items-center gap-1.5 text-xs font-bold text-primary">
							Response Templates & Subcommands
						</span>
						<span class="text-[11px] text-muted-foreground">
							Customize chat response messages and subcommand-specific parameters on a dedicated full-screen page.
						</span>
					</div>
					<Button
						size="sm" variant="outline" class="
							w-full justify-between border-primary/30
							hover:bg-primary/10
						" @click="navigateToTemplateEditor"
					>
						Open Full Response Template Customizer
						<ArrowRight class="size-3.5" />
					</Button>
				</Card>

				<!-- Toggle Switch for Command Active State -->
				<div class="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4 select-none">
					<div class="flex flex-col gap-0.5">
						<span class="text-sm font-semibold">Enable Trigger</span>
						<span class="text-xs text-muted-foreground">Toggle command activation state in chat.</span>
					</div>
					<label class="relative inline-flex cursor-pointer items-center">
						<input v-model="isEnabled" type="checkbox" class="peer sr-only">
						<div
							class="
								peer h-6 w-11 rounded-full border border-border bg-muted transition-all
								peer-checked:bg-primary
								after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-muted-foreground after:transition-all
								peer-checked:after:translate-x-full peer-checked:after:bg-background
							"
						/>
					</label>
				</div>

				<!-- Active Trigger Word Segment -->
				<div class="grid grid-cols-1 gap-4">
					<div class="grid w-full items-center gap-1.5">
						<Label for="editTrigger" class="text-xs font-semibold">Active Trigger Word</Label>
						<InputGroup v-if="isSubCommand && props.command?.parentTriggerPath" class="h-9 border-border bg-card">
							<InputGroupAddon class="h-full border-r border-border bg-muted/50 px-3 font-mono text-xs font-semibold">
								{{ props.command.parentTriggerPath }}
							</InputGroupAddon>
							<InputGroupInput
								id="editTrigger"
								v-model="triggerName"
								placeholder="trigger"
								class="
									h-full border-0 px-3 text-xs font-semibold
									focus-visible:ring-0 focus-visible:ring-offset-0
								"
							/>
						</InputGroup>
						<div v-else class="relative">
							<span class="absolute top-2 left-3 text-sm font-bold text-muted-foreground">!</span>
							<Input
								id="editTrigger"
								v-model="triggerName"
								placeholder="points"
								class="
									h-9 border-border pl-6 text-xs font-semibold
									focus-visible:ring-primary
								"
							/>
						</div>
						<span v-if="isSubCommand" class="text-[10px] leading-normal text-muted-foreground italic select-none">
							Customizing trigger word for this subcommand path. Keep blank to use default.
						</span>
					</div>
				</div>

				<!-- Custom Permission Level Segment -->
				<div class="grid grid-cols-1 gap-4 border-t border-border/80 pt-4">
					<div class="grid w-full items-center gap-1.5">
						<Label class="text-xs font-semibold">Required Permission Level</Label>
						<Select v-model="permissionVal">
							<SelectTrigger class="h-9 border-border bg-card text-xs">
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
						<span class="text-[10px] leading-normal text-muted-foreground italic select-none">
							Select the minimum chat badge role required to execute this trigger.
						</span>
					</div>
				</div>

				<!-- Single-Row Config Stepper Fields (Points, Global Cooldown, User Cooldown) -->
				<div
					class="
						grid grid-cols-1 gap-4 border-t border-border/80 pt-4
						sm:grid-cols-3
					"
				>
					<!-- Point Cost -->
					<div class="grid w-full items-center gap-1.5">
						<Label for="editCost" class="flex items-center gap-1 text-xs font-semibold">
							<Coins class="size-3.5 text-amber-500" /> Point Cost
						</Label>
						<NumberField id="editCost" v-model="costVal" :min="0" :disabled="props.command?.hasHandler === false" class="h-9">
							<NumberFieldContent class="h-9 border-border">
								<NumberFieldDecrement />
								<NumberFieldInput class="h-9 border-border text-xs" />
								<NumberFieldIncrement />
							</NumberFieldContent>
						</NumberField>
					</div>

					<!-- Global Cooldown -->
					<div class="grid w-full items-center gap-1.5">
						<Label for="editGlobalCooldown" class="flex items-center gap-1 text-xs font-semibold">
							<Clock class="size-3.5 text-muted-foreground" /> Global CD (Sec)
						</Label>
						<NumberField id="editGlobalCooldown" v-model="globalCooldownVal" :min="0" :disabled="props.command?.hasHandler === false" class="h-9">
							<NumberFieldContent class="h-9 border-border">
								<NumberFieldDecrement />
								<NumberFieldInput class="h-9 border-border text-xs" />
								<NumberFieldIncrement />
							</NumberFieldContent>
						</NumberField>
					</div>

					<!-- User Cooldown -->
					<div class="grid w-full items-center gap-1.5">
						<Label for="editUserCooldown" class="flex items-center gap-1 text-xs font-semibold">
							<Sliders class="size-3.5 text-muted-foreground" /> User CD (Sec)
						</Label>
						<NumberField id="editUserCooldown" v-model="userCooldownVal" :min="0" :disabled="props.command?.hasHandler === false" class="h-9">
							<NumberFieldContent class="h-9 border-border">
								<NumberFieldDecrement />
								<NumberFieldInput class="h-9 border-border text-xs" />
								<NumberFieldIncrement />
							</NumberFieldContent>
						</NumberField>
					</div>
				</div>

				<!-- Command Aliases Segment -->
				<div v-if="!isSubCommand" class="space-y-3 border-t border-border/80 pt-4">
					<div class="flex flex-col gap-0.5 select-none">
						<span class="text-sm font-semibold">Command Aliases & Redirection</span>
						<span class="text-xs text-muted-foreground">Map dynamic chat triggers directly to subcommands with optional parameter overrides.</span>
					</div>

					<!-- Alias Adder Widget -->
					<div
						class="
							grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/20 p-3
							sm:grid-cols-3
						"
					>
						<div class="flex flex-col gap-1">
							<Label class="text-[10px] font-medium text-muted-foreground">Trigger Word</Label>
							<div class="relative">
								<span class="absolute top-1.5 left-2.5 text-xs font-bold text-muted-foreground">!</span>
								<Input
									v-model="newAliasTrigger"
									placeholder="pts"
									class="h-7 border-border pl-4 text-xs"
								/>
							</div>
						</div>

						<div v-if="executableSubcommandPaths.length > 0" class="flex flex-col gap-1">
							<Label class="text-[10px] font-medium text-muted-foreground">Target Subcommand</Label>
							<Select v-model="newAliasSubcommand">
								<SelectTrigger class="h-7 border-border bg-card text-xs">
									<SelectValue placeholder="(None - Runs Root)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="__root__">
										(None - Runs Root)
									</SelectItem>
									<SelectItem v-for="path in executableSubcommandPaths" :key="path" :value="path">
										{{ path.replace(/\./g, ' ') }}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div class="flex flex-col gap-1">
							<Label class="text-[10px] font-medium text-muted-foreground">Arg Overrides (Comma split)</Label>
							<Input
								v-model="newAliasOverrides"
								placeholder="user, 50"
								class="h-7 border-border text-xs"
							/>
						</div>

						<div
							class="
								mt-1 flex justify-end
								sm:col-span-3
							"
						>
							<Button size="sm" class="h-6.5 text-[10px]" @click="addAliasLocally">
								<Plus class="mr-1 size-3" /> Add Alias
							</Button>
						</div>
					</div>

					<!-- Active Alias Badges -->
					<div class="flex flex-wrap gap-1.5 pt-1">
						<span v-if="aliasesList.length === 0" class="text-xs text-muted-foreground italic select-none">No aliases mapped.</span>
						<Badge
							v-for="(alias, index) in aliasesList"
							:key="alias.trigger"
							variant="secondary"
							class="gap-1 border border-border px-2 py-0.5 text-xs"
						>
							<span class="font-bold text-foreground">!{{ alias.trigger }}</span>
							<span v-if="alias.subcommand && alias.subcommand !== '__root__'" class="font-mono text-[9px] text-primary/80">
								-> {{ alias.subcommand.replace(/\./g, ' ') }}
							</span>
							<span v-if="alias.overrideArgs" class="font-mono text-[8px] text-muted-foreground">
								[{{ alias.overrideArgs.join(', ') }}]
							</span>
							<button
								type="button"
								class="
									rounded-full p-0.5
									hover:bg-muted-foreground/20
								"
								@click="removeAliasLocally(index)"
							>
								<X class="size-3" />
							</button>
						</Badge>
					</div>
				</div>
			</div>

			<!-- Pinned Bottom Footer with docked buttons -->
			<SheetFooter class="flex shrink-0 flex-row items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
				<Button variant="outline" size="sm" @click="emit('update:open', false)">
					Cancel
				</Button>
				<Button :disabled="isSaving" size="sm" @click="saveAllConfig">
					<Save class="mr-1.5 size-3.5" />
					{{ isSaving ? 'Saving...' : 'Save Quick Config' }}
				</Button>
			</SheetFooter>
		</SheetContent>
	</Sheet>
</template>
