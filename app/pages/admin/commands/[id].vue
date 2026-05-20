<script setup lang="ts">
import {
	ChevronDown,
	ChevronRight,
	HelpCircle,
	RefreshCw,
	Save,
	Settings,
	Terminal,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'

interface Template {
	id: string
	default: string
	custom: string | null
	params: string[]
	description: string
}

interface Command {
	id: string
	description: string
	permission: string
	trigger: string
	enabled: boolean
	cost: number
	globalCooldown: number
	userCooldown: number
	templates: Template[]
	subcommands?: Record<string, {
		description: string
		usage?: string
		permission: string
		templates: Template[]
	}>
}

const route = useRoute()
const { data: commands, refresh: refreshCommands, pending: loading } = await useFetch<Command[]>('/api/commands')

const command = computed(() => {
	if (!commands.value)
		return null
	return commands.value.find(c => c.id === route.params.id) || null
})

// Sub-navigation filter selection ('root' or subcommand name)
const activePathFilter = ref('root')

// Local editable templates map (templateId -> currentTextValue)
const editableTemplates = ref<Record<string, string>>({})
const isSaving = ref(false)

// Populate templates map on load or command change
watch(command, (newCmd) => {
	if (newCmd) {
		const temp: Record<string, string> = {}

		// Map root templates
		for (const t of newCmd.templates || []) {
			temp[t.id] = t.custom !== null ? t.custom : t.default
		}

		// Map subcommand templates
		if (newCmd.subcommands) {
			for (const sub of Object.values(newCmd.subcommands)) {
				for (const t of sub.templates || []) {
					temp[t.id] = t.custom !== null ? t.custom : t.default
				}
			}
		}

		editableTemplates.value = temp
	}
}, { immediate: true })

// Reset a template to its default value
function resetTemplateToDefault(tpl: Template) {
	editableTemplates.value[tpl.id] = tpl.default
	toast.info(`Reset template "${tpl.id}" to default value locally. Save to apply changes.`)
}

// Copy template parameter helper
function copyToClipboard(param: string) {
	if (process.client) {
		navigator.clipboard.writeText(`\${${param}}`)
		toast.success(`Copied '\${${param}}' to clipboard!`)
	}
}

// Compute active templates to display based on selected path filter
const activeTemplatesToDisplay = computed(() => {
	if (!command.value)
		return []

	if (activePathFilter.value === 'root') {
		return command.value.templates || []
	}

	const sub = command.value.subcommands?.[activePathFilter.value]
	return sub ? sub.templates || [] : []
})

// Collapsible templates UI state
const expandedTemplates = ref<Record<string, boolean>>({})

function toggleTemplateExpanded(tplId: string) {
	expandedTemplates.value[tplId] = !expandedTemplates.value[tplId]
}

function getTemplateSummary(tpl: Template) {
	const text = editableTemplates.value[tpl.id] ?? tpl.default
	if (!text)
		return 'Empty template'
	return text.length > 55 ? `${text.substring(0, 55)}...` : text
}

// Watch active path changes to pre-expand the first template automatically
watch(activeTemplatesToDisplay, (newTpls) => {
	if (newTpls && newTpls.length > 0 && newTpls[0]) {
		const firstId = newTpls[0].id
		// Clear other expansions and only expand the first one by default if none are explicitly expanded
		if (Object.keys(expandedTemplates.value).length === 0) {
			expandedTemplates.value[firstId] = true
		}
	}
}, { immediate: true })

// Check if any template in the active set is modified
const isAnyTemplateModified = computed(() => {
	if (!command.value)
		return false

	// Check root
	for (const t of command.value.templates || []) {
		const original = t.custom !== null ? t.custom : t.default
		if (editableTemplates.value[t.id] !== original)
			return true
	}

	// Check subcommands
	if (command.value.subcommands) {
		for (const sub of Object.values(command.value.subcommands)) {
			for (const t of sub.templates || []) {
				const original = t.custom !== null ? t.custom : t.default
				if (editableTemplates.value[t.id] !== original)
					return true
			}
		}
	}

	return false
})

async function saveTemplates() {
	if (!command.value)
		return
	isSaving.value = true

	try {
		const payload: Array<{ id: string, template: string }> = []

		// Gather modified root templates
		for (const t of command.value.templates || []) {
			const current = editableTemplates.value[t.id] ?? t.default
			const original = t.custom !== null ? t.custom : t.default
			if (current !== original) {
				payload.push({ id: t.id, template: current })
			}
		}

		// Gather modified subcommand templates
		if (command.value.subcommands) {
			for (const sub of Object.values(command.value.subcommands)) {
				for (const t of sub.templates || []) {
					const current = editableTemplates.value[t.id] ?? t.default
					const original = t.custom !== null ? t.custom : t.default
					if (current !== original) {
						payload.push({ id: t.id, template: current })
					}
				}
			}
		}

		if (payload.length > 0) {
			await $fetch('/api/commands/templates', {
				method: 'PUT',
				body: { templates: payload },
			})
			toast.success(`Successfully saved response templates for !${command.value.trigger}!`)
			await refreshCommands()
		}
		else {
			toast.info('No changes detected in templates.')
		}
	}
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to save response templates')
	}
	finally {
		isSaving.value = false
	}
}
</script>

<template>
	<div class="flex flex-col gap-6">
		<!-- Main Workspace Loader -->
		<div v-if="loading" class="py-12 text-center text-sm text-muted-foreground">
			Loading command customizer...
		</div>

		<div v-else-if="!command" class="py-12 text-center text-sm text-muted-foreground">
			Command not found in registry.
		</div>

		<div v-else class="space-y-6">
			<!-- Header Block -->
			<div
				class="
					flex flex-col gap-4 border-b border-border pb-6
					md:flex-row md:items-center md:justify-between
				"
			>
				<div class="flex flex-col gap-1.5">
					<h1 class="flex items-center gap-2 text-3xl font-bold tracking-tight">
						Response Customizer: <span class="font-mono font-bold text-primary">!{{ command.trigger }}</span>
					</h1>
					<p class="max-w-2xl text-sm text-muted-foreground">
						Customize exact text responses post by the bot in chat. Reset any response template back to default parameters instantly.
					</p>
				</div>
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" :disabled="loading" @click="refreshCommands">
						Refresh Details
					</Button>
				</div>
			</div>

			<!-- Dynamic Left-Right Sidebar Workspace -->
			<div
				class="
					grid grid-cols-1 items-start gap-6
					lg:grid-cols-4
				"
			>
				<!-- Sidebar: Execution Path Selectors -->
				<div
					class="
						space-y-3
						lg:col-span-1
					"
				>
					<h2 class="px-2 text-xs font-bold tracking-wider text-muted-foreground uppercase select-none">
						Execution Paths
					</h2>
					<div
						class="
							flex flex-row gap-1 overflow-x-auto pb-2
							lg:flex-col lg:overflow-x-visible lg:pb-0
						"
					>
						<!-- Root Option -->
						<button
							type="button"
							class="flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-semibold transition-all"
							:class="activePathFilter === 'root'
								? 'border-primary/20 bg-primary/10 text-primary'
								: `
									border-border bg-card/50 text-muted-foreground
									hover:bg-muted/50 hover:text-foreground
								`"
							@click="activePathFilter = 'root'"
						>
							<Terminal class="size-4 shrink-0" />
							<span>Root Trigger (!{{ command.trigger }})</span>
						</button>

						<!-- Subcommands options -->
						<template v-if="command.subcommands">
							<button
								v-for="(sub, key) in command.subcommands"
								:key="key"
								type="button"
								class="flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-semibold transition-all"
								:class="activePathFilter === key
									? 'border-primary/20 bg-primary/10 text-primary'
									: `
										border-border bg-card/50 text-muted-foreground
										hover:bg-muted/50 hover:text-foreground
									`"
								@click="activePathFilter = String(key)"
							>
								<Settings class="size-4 shrink-0" />
								<span class="capitalize">Subcommand: {{ key }}</span>
							</button>
						</template>
					</div>
				</div>

				<!-- Workspace: Active Path Templates Editors -->
				<div
					class="
						space-y-4
						lg:col-span-3
					"
				>
					<!-- Path Header details -->
					<div class="flex flex-col gap-1 rounded-lg border border-border bg-muted/20 p-4 select-none">
						<span class="text-xs font-bold tracking-wider text-primary uppercase">
							Active Path: {{ activePathFilter === 'root' ? `!${command.trigger}` : `!${command.trigger} ${activePathFilter}` }}
						</span>
						<span class="text-[11px] text-muted-foreground">
							{{ activePathFilter === 'root' ? command.description : command.subcommands?.[activePathFilter]?.description }}
						</span>
					</div>

					<div class="space-y-4">
						<!-- Individual Template Card Accordion -->
						<div
							v-for="tpl in activeTemplatesToDisplay"
							:key="tpl.id"
							class="overflow-hidden rounded-lg border border-border bg-card/45 backdrop-blur-sm transition-all"
						>
							<!-- Clickable Accordion Header -->
							<div
								class="
									flex cursor-pointer items-center justify-between bg-muted/20 p-4 transition-colors select-none
									hover:bg-muted/40
								"
								@click="toggleTemplateExpanded(tpl.id)"
							>
								<div class="flex min-w-0 items-center gap-3">
									<!-- Chevron Icon -->
									<ChevronDown v-if="expandedTemplates[tpl.id]" class="size-4 shrink-0 text-primary" />
									<ChevronRight v-else class="size-4 shrink-0 text-muted-foreground" />

									<div class="flex min-w-0 flex-col gap-0.5">
										<span class="font-mono text-xs font-bold text-foreground">
											{{ tpl.id }}
										</span>
										<!-- Inline summary preview of template message -->
										<span
											v-if="!expandedTemplates[tpl.id]" class="
												max-w-[280px] truncate text-[10px] text-muted-foreground
												sm:max-w-[450px]
											"
										>
											"{{ getTemplateSummary(tpl) }}"
										</span>
									</div>
								</div>

								<div class="flex shrink-0 items-center gap-2">
									<!-- Revert to Default Action (when collapsed) -->
									<Button
										v-if="!expandedTemplates[tpl.id] && editableTemplates[tpl.id] !== tpl.default"
										variant="outline"
										size="sm"
										class="
											h-6 shrink-0 gap-1 text-[9px]
											hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive
										"
										@click.stop="resetTemplateToDefault(tpl)"
									>
										<RefreshCw class="size-2.5" />
										Reset
									</Button>

									<!-- Modified/Saved Badges -->
									<Badge
										v-if="editableTemplates[tpl.id] !== (tpl.custom !== null ? tpl.custom : tpl.default)"
										variant="outline"
										class="border-amber-500/20 bg-amber-500/10 px-1.5 py-0 text-[9px] text-amber-500"
									>
										Modified
									</Badge>
									<Badge
										v-else-if="tpl.custom !== null"
										variant="outline"
										class="border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0 text-[9px] text-emerald-500"
									>
										Custom
									</Badge>
									<Badge
										v-else
										variant="outline"
										class="border-border/40 bg-muted px-1.5 py-0 text-[9px] text-muted-foreground"
									>
										Default
									</Badge>
								</div>
							</div>

							<!-- Collapsible Card Content Body -->
							<div
								v-if="expandedTemplates[tpl.id]"
								class="flex animate-in flex-col gap-4 border-t border-border/60 bg-card/25 p-5 duration-150 fade-in slide-in-from-top-1"
							>
								<!-- Description if exists -->
								<div v-if="tpl.description" class="rounded-md border border-border/30 bg-muted/10 p-2.5 text-[11px] text-muted-foreground">
									<span class="mr-1 font-bold text-foreground">Description:</span>
									{{ tpl.description }}
								</div>

								<!-- Textarea Input Editor -->
								<div class="grid w-full gap-2">
									<textarea
										v-model="editableTemplates[tpl.id]"
										rows="3"
										class="
											flex w-full rounded-md border border-input bg-card/60 px-3 py-2 font-sans text-xs/relaxed font-medium shadow-sm
											placeholder:text-muted-foreground
											focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none
										"
									/>
								</div>

								<!-- Action and Helper variables grid -->
								<div
									class="
										flex flex-col gap-4
										sm:flex-row sm:items-center sm:justify-between
									"
								>
									<!-- Variables Helper Badges -->
									<div class="flex flex-1 flex-col gap-1.5 rounded-lg border border-border/30 bg-muted/65 p-3">
										<div class="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground select-none">
											<HelpCircle class="size-3.5 text-primary/70" />
											Available Parameters (Click to Copy):
										</div>
										<div class="mt-0.5 flex flex-wrap gap-1.5">
											<span v-if="tpl.params.length === 0" class="text-[10px] text-muted-foreground italic select-none">None defined (Static text output)</span>
											<Badge
												v-for="param in tpl.params"
												:key="param"
												variant="outline"
												class="
													cursor-pointer border-border bg-muted px-2 py-0.5 font-mono text-[9px] font-bold text-muted-foreground select-all
													hover:bg-muted
												"
												title="Click to copy variable trigger format"
												@click="copyToClipboard(param)"
											>
												{{ `\${${param}\}` }}
											</Badge>
										</div>
									</div>

									<!-- Pinned Revert Action inside Card -->
									<div class="flex shrink-0 items-center justify-end">
										<Button
											variant="outline"
											size="sm"
											class="
												h-9 gap-1.5 text-xs
												hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive
											"
											:disabled="editableTemplates[tpl.id] === tpl.default"
											@click="resetTemplateToDefault(tpl)"
										>
											<RefreshCw class="size-3.5" />
											Reset to Default Value
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Workspace Floating Action save card at bottom of screen (shown conditionally) -->
			<div
				v-if="isAnyTemplateModified"
				class="sticky bottom-4 z-40 flex translate-y-0 scale-100 animate-in items-center justify-between rounded-lg border border-border bg-card/90 px-6 py-4 opacity-100 shadow-lg backdrop-blur-md transition-all duration-200 fade-in slide-in-from-bottom-2"
			>
				<div class="flex flex-col gap-0.5 select-none">
					<span class="text-xs font-bold text-foreground">Unsaved Template Overrides</span>
					<span class="text-[11px] text-muted-foreground">You have modified message templates. Save to instantly update Twitch chat triggers.</span>
				</div>
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" :disabled="isSaving" @click="refreshCommands">
						Discard Changes
					</Button>
					<Button size="sm" :disabled="isSaving" @click="saveTemplates">
						<Save class="mr-1.5 size-4" />
						{{ isSaving ? 'Saving Overrides...' : 'Save Templates' }}
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>
