<script setup lang="ts">
import {
	ChevronRight,
	CornerDownRight,
	HelpCircle,
	RefreshCw,
	Save,
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
	activeTrigger: string
	enabled: boolean
	cost: number
	globalCooldown: number
	userCooldown: number
	templates: Template[]
	subcommands?: Record<string, {
		id: string
		trigger: string | null
		activeTrigger: string
		description: string
		usage?: string
		permission: string
		templates: Template[]
		hasHandler?: boolean
		subcommands?: any
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

// Flattened subcommands computed property
const flatSubcommands = computed(() => {
	if (!command.value || !command.value.subcommands)
		return []

	const list: Array<{
		key: string
		triggerPath: string
		description: string
		templates: Template[]
		hasHandler: boolean
	}> = []

	function traverse(obj: any, pathPrefix: string, triggerPrefix: string) {
		for (const [name, val] of Object.entries(obj)) {
			if (!val || typeof val !== 'object')
				continue
			const detail = val as any
			const currentKey = pathPrefix ? `${pathPrefix} ${name}` : name
			const currentTriggerPath = triggerPrefix ? `${triggerPrefix} ${detail.activeTrigger}` : detail.activeTrigger

			list.push({
				key: currentKey,
				triggerPath: currentTriggerPath,
				description: detail.description,
				templates: detail.templates || [],
				hasHandler: detail.hasHandler !== false,
			})

			if (detail.subcommands) {
				traverse(detail.subcommands, currentKey, currentTriggerPath)
			}
		}
	}

	traverse(command.value.subcommands, '', '')
	return list
})

// Populate templates map on load or command change
watch(command, (newCmd) => {
	if (newCmd) {
		const temp: Record<string, string> = {}

		// Map root templates
		for (const t of newCmd.templates || []) {
			temp[t.id] = t.custom !== null ? t.custom : t.default
		}

		// Map subcommand templates recursively
		function mapSubTemplates(subMap: any) {
			if (!subMap)
				return
			for (const sub of Object.values(subMap) as any[]) {
				for (const t of sub.templates || []) {
					temp[t.id] = t.custom !== null ? t.custom : t.default
				}
				if (sub.subcommands) {
					mapSubTemplates(sub.subcommands)
				}
			}
		}
		mapSubTemplates(newCmd.subcommands)

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

	const sub = flatSubcommands.value.find(s => s.key === activePathFilter.value)
	return sub ? sub.templates || [] : []
})

const activeSubcommandDetail = computed(() => {
	if (!command.value || activePathFilter.value === 'root')
		return null
	return flatSubcommands.value.find(s => s.key === activePathFilter.value) || null
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

// Watch query param path to select the correct subcommand initially
watch(() => route.query.path, (newPath) => {
	if (newPath && typeof newPath === 'string') {
		activePathFilter.value = newPath
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
	for (const sub of flatSubcommands.value) {
		for (const t of sub.templates || []) {
			const original = t.custom !== null ? t.custom : t.default
			if (editableTemplates.value[t.id] !== original)
				return true
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
		for (const sub of flatSubcommands.value) {
			for (const t of sub.templates || []) {
				const current = editableTemplates.value[t.id] ?? t.default
				const original = t.custom !== null ? t.custom : t.default
				if (current !== original) {
					payload.push({ id: t.id, template: current })
				}
			}
		}

		if (payload.length > 0) {
			await $fetch('/api/commands/templates', {
				method: 'PUT',
				body: { templates: payload },
			})
			toast.success(`Successfully saved response templates for !${command.value.activeTrigger}!`)
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
	<div class="flex flex-1 flex-col gap-6">
		<!-- Main Workspace Loader -->
		<div v-if="loading" class="py-12 text-center text-muted-foreground">
			Loading command customizer...
		</div>

		<div v-else-if="!command" class="py-12 text-center text-muted-foreground">
			Command not found in registry.
		</div>

		<div v-else class="flex flex-1 flex-col gap-6">
			<!-- Header Block -->
			<AppPageHeader
				:heading="`Response Customizer - !${command.activeTrigger}`"
				subheading="Customize exact text responses post by the bot in chat. Reset any response template back to default parameters instantly."
			>
				<Button variant="outline" size="sm" :disabled="loading" @click="refreshCommands">
					Refresh Details
				</Button>
			</AppPageHeader>

			<!-- Dynamic Left-Right Sidebar Workspace -->
			<div
				class="
					grid flex-1 grid-cols-1 items-start gap-6
					xl:grid-cols-4
				"
			>
				<!-- Sidebar: Execution Path Selectors -->
				<div
					class="
						space-y-3
						xl:col-span-1
					"
				>
					<h2 class="px-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
						Command Execution Pathways
					</h2>
					<div
						class="
							flex flex-col gap-1 overflow-x-auto
							xl:overflow-x-visible
						"
					>
						<!-- Root Option -->
						<Button
							class="w-full justify-between gap-2"
							:variant="activePathFilter === 'root' ? 'secondary' : 'ghost'"
							@click="activePathFilter = 'root'"
						>
							<div class="flex min-w-0 items-center gap-2">
								<Terminal class="size-4 shrink-0" />
								<span class="truncate text-left">Root Command (!{{ command.activeTrigger }})</span>
							</div>
							<Badge :variant="activePathFilter === 'root' ? 'default' : 'outline'" class="shrink-0">
								{{ command.templates?.length || 0 }}
							</Badge>
						</Button>

						<!-- Subcommands options -->
						<template v-if="flatSubcommands.length > 0">
							<Button
								v-for="sub in flatSubcommands"
								:key="sub.key"
								class="w-full justify-between gap-2"
								:variant="activePathFilter === sub.key ? 'secondary' : 'ghost'"
								@click="activePathFilter = sub.key"
							>
								<div class="flex min-w-0 items-center gap-2">
									<CornerDownRight class="size-4 shrink-0" />
									<span class="truncate text-left">Subcommand: {{ sub.triggerPath }}</span>
								</div>
								<Badge :variant="activePathFilter === sub.key ? 'default' : 'outline'" class="shrink-0">
									{{ sub.templates?.length || 0 }}
								</Badge>
							</Button>
						</template>
					</div>
				</div>

				<!-- Workspace: Active Path Templates Editors -->
				<div
					class="
						space-y-4
						xl:col-span-3
					"
				>
					<!-- Path Header details -->
					<div>
						<p class="text-sm font-bold tracking-wider uppercase">
							Active Path - {{ activePathFilter === 'root' ? `!${command.activeTrigger}` : `!${command.activeTrigger} ${activeSubcommandDetail?.triggerPath}` }}
						</p>
						<p class="text-xs text-muted-foreground">
							{{ activePathFilter === 'root' ? command.description : activeSubcommandDetail?.description }}
						</p>
					</div>

					<div class="space-y-4">
						<!-- Individual Template Card Accordion using Card & Collapsible -->
						<Collapsible
							v-for="template in activeTemplatesToDisplay"
							:key="template.id"
							:open="expandedTemplates[template.id]"
							@update:open="toggleTemplateExpanded(template.id)"
						>
							<Card class="gap-0 overflow-hidden p-0">
								<CollapsibleTrigger as-child>
									<div
										class="
											flex cursor-pointer items-center justify-between p-4 transition-colors
											hover:bg-accent
											dark:hover:bg-accent/50
										"
									>
										<div class="flex items-center gap-3">
											<!-- Chevron Icon -->
											<ChevronRight class="size-4 text-primary transition-transform" :class="{ 'rotate-90': expandedTemplates[template.id] }" />

											<div class="flex flex-col gap-0.5">
												<span class="font-mono text-xs font-bold">
													{{ template.id }}
												</span>
												<!-- Inline summary preview of template message -->
												<span
													v-if="!expandedTemplates[template.id]" class="
														max-w-70 truncate text-xs text-muted-foreground
														sm:max-w-112.5
													"
												>
													"{{ getTemplateSummary(template) }}"
												</span>
											</div>
										</div>

										<div class="flex items-center gap-2">
											<!-- Modified/Saved Badges -->
											<Badge
												v-if="editableTemplates[template.id] !== (template.custom !== null ? template.custom : template.default)"
												variant="outline"
												class="border-amber-500/20 bg-amber-500/10 text-amber-500"
											>
												Modified
											</Badge>
											<Badge
												v-else-if="template.custom !== null"
												variant="outline"
												class="border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
											>
												Custom
											</Badge>
											<Badge
												v-else
												variant="secondary"
											>
												Default
											</Badge>

											<!-- Revert to Default Action (when collapsed) -->
											<Button
												v-if="!expandedTemplates[template.id] && editableTemplates[template.id] !== template.default"
												variant="destructive"
												size="sm"
												@click.stop="resetTemplateToDefault(template)"
											>
												<RefreshCw class="size-2.5" />
												Reset
											</Button>
										</div>
									</div>
								</CollapsibleTrigger>

								<CollapsibleContent>
									<CardContent
										class="flex flex-col gap-4 border-t border-border/60 p-4"
									>
										<!-- Textarea Input Editor -->
										<Textarea
											v-model="editableTemplates[template.id]"
											rows="3"
										/>

										<!-- Action and Helper variables grid -->
										<div
											class="
												flex flex-col gap-4
												sm:flex-row sm:items-center sm:justify-between
											"
										>
											<!-- Variables Helper Badges -->
											<div class="flex flex-1 flex-col gap-1.5 rounded-lg bg-muted p-3">
												<div class="flex items-center gap-1 text-xs font-semibold text-muted-foreground select-none">
													<HelpCircle class="size-3.5" />
													Available Parameters (Click to Copy):
												</div>
												<div class="mt-0.5 flex flex-wrap gap-1.5">
													<span v-if="template.params.length === 0" class="text-xs text-muted-foreground italic select-none">None defined (Static text output)</span>
													<Badge
														v-for="param in template.params"
														:key="param"
														class="
															cursor-pointer transition-colors
															hover:bg-primary/85
														"
														title="Click to copy variable trigger format"
														@click="copyToClipboard(param)"
													>
														{{ `\${${param}\}` }}
													</Badge>
												</div>
											</div>

											<!-- Pinned Revert Action inside Card -->
											<div class="flex items-center justify-end">
												<Button
													variant="destructive"
													:disabled="editableTemplates[template.id] === template.default"
													@click="resetTemplateToDefault(template)"
												>
													<RefreshCw />
													Reset to Default Value
												</Button>
											</div>
										</div>
									</CardContent>
								</CollapsibleContent>
							</Card>
						</Collapsible>
					</div>
				</div>
			</div>

			<!-- Workspace Floating Action save card using shadcn Item (shown conditionally) -->
			<Item
				v-if="isAnyTemplateModified"
				variant="outline"
				class="sticky bottom-4 z-40 mt-auto w-full animate-in bg-card/70 shadow-lg backdrop-blur-md transition-all duration-200 fade-in slide-in-from-bottom-2"
			>
				<ItemContent>
					<ItemTitle>
						Unsaved Template Overrides
					</ItemTitle>
					<ItemDescription>
						You have modified message templates. Save to instantly update Twitch chat triggers.
					</ItemDescription>
				</ItemContent>
				<ItemActions>
					<Button variant="outline" :disabled="isSaving" @click="refreshCommands">
						Discard Changes
					</Button>
					<Button :disabled="isSaving" @click="saveTemplates">
						<Save />
						{{ isSaving ? 'Saving Overrides...' : 'Save Templates' }}
					</Button>
				</ItemActions>
			</Item>
		</div>
	</div>
</template>
