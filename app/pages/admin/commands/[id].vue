<script setup lang="ts">
import type { Command, Template } from '~/types/commands'
import {
	CornerDownRight,
	Folder,
	RefreshCcw,
	Search,
	Terminal,
} from '@lucide/vue'
import { useClipboard } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import TemplateEditorCard from '~/components/commands/TemplateEditorCard.vue'
import { Spinner } from '~/components/ui/spinner'

const route = useRoute()
const { data: commands, refresh: refreshCommands, pending: loading } = useFetch<Command[]>('/api/commands')
const { data: globalVariables } = useFetch<any[]>('/api/commands/variables')

const command = computed(() => {
	if (!commands.value)
		return null
	return commands.value.find(cmd => cmd.id === route.params.id) || null
})

useHead({
	title: () => command.value ? `Response Customizer - !${command.value.activeTrigger}` : 'Response Customizer',
})

// Sub-navigation filter selection ('root' or subcommand name)
const activePathFilter = ref('root')

// Local editable templates map (templateId -> currentTextValue)
const editableTemplates = ref<Record<string, string>>({})
const isSaving = ref(false)

// Global variables search & copy setup
const varSearch = ref('')
const { copy } = useClipboard()

const filteredVariables = computed(() => {
	if (!globalVariables.value)
		return []
	const search = varSearch.value.trim().toLowerCase()
	if (!search)
		return globalVariables.value

	return globalVariables.value.filter(v =>
		v.name.toLowerCase().includes(search)
		|| v.description.toLowerCase().includes(search)
		|| v.aliases?.some((a: string) => a.toLowerCase().includes(search)),
	)
})

function copyVariable(variableSyntax: string) {
	copy(variableSyntax)
	toast.success(`Copied '${variableSyntax}' to clipboard!`)
}

// Flattened subcommands computed property
const flatSubcommands = computed(() => {
	if (!command.value || !command.value.subcommands)
		return []

	const list: Array<{
		key: string
		triggerPath: string
		name: string
		depth: number
		description: string
		templates: Template[]
		hasHandler: boolean
	}> = []

	function traverse(subcommandsMap: any, pathPrefix: string, triggerPrefix: string, depth: number) {
		for (const [name, subcommandRecord] of Object.entries(subcommandsMap)) {
			if (!subcommandRecord || typeof subcommandRecord !== 'object')
				continue
			const detail = subcommandRecord as any
			const currentKey = pathPrefix ? `${pathPrefix} ${name}` : name
			const currentTriggerPath = triggerPrefix ? `${triggerPrefix} ${detail.activeTrigger}` : detail.activeTrigger

			list.push({
				key: currentKey,
				triggerPath: currentTriggerPath,
				name: detail.activeTrigger || name,
				depth,
				description: detail.description,
				templates: detail.templates || [],
				hasHandler: detail.hasHandler !== false,
			})

			if (detail.subcommands) {
				traverse(detail.subcommands, currentKey, currentTriggerPath, depth + 1)
			}
		}
	}

	traverse(command.value.subcommands, '', '', 1)
	return list
})

// Populate templates map on load or command change
watch(command, (newCommand) => {
	if (newCommand) {
		const initialTemplates: Record<string, string> = {}

		// Map root templates
		for (const template of newCommand.templates || []) {
			initialTemplates[template.id] = template.custom !== null ? template.custom : template.default
		}

		// Map subcommand templates recursively
		function mapSubcommandTemplates(subcommandsMap: any) {
			if (!subcommandsMap)
				return
			for (const subcommand of Object.values(subcommandsMap) as any[]) {
				for (const template of subcommand.templates || []) {
					initialTemplates[template.id] = template.custom !== null ? template.custom : template.default
				}
				if (subcommand.subcommands) {
					mapSubcommandTemplates(subcommand.subcommands)
				}
			}
		}
		mapSubcommandTemplates(newCommand.subcommands)

		editableTemplates.value = initialTemplates
	}
}, { immediate: true })

// Reset a template to its default value
function resetTemplateToDefault(template: Template) {
	editableTemplates.value[template.id] = template.default
	toast.info(`Reset template "${template.id}" to default value locally. Save to apply changes.`)
}

// Compute active templates to display based on selected path filter
const activeTemplatesToDisplay = computed(() => {
	if (!command.value)
		return []

	if (activePathFilter.value === 'root') {
		return command.value.templates || []
	}

	const subcommand = flatSubcommands.value.find(sub => sub.key === activePathFilter.value)
	return subcommand ? subcommand.templates || [] : []
})

const activeSubcommandDetail = computed(() => {
	if (!command.value || activePathFilter.value === 'root')
		return null
	return flatSubcommands.value.find(sub => sub.key === activePathFilter.value) || null
})

// Collapsible templates UI state
const expandedTemplates = ref<Record<string, boolean>>({})

// Watch active path changes to pre-expand the first template automatically
watch(activeTemplatesToDisplay, (newTemplates) => {
	if (newTemplates && newTemplates.length > 0 && newTemplates[0]) {
		const firstTemplateId = newTemplates[0].id
		// Clear other expansions and only expand the first one by default if none are explicitly expanded
		if (Object.keys(expandedTemplates.value).length === 0) {
			expandedTemplates.value[firstTemplateId] = true
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
	for (const template of command.value.templates || []) {
		const originalContent = template.custom !== null ? template.custom : template.default
		if (editableTemplates.value[template.id] !== originalContent)
			return true
	}

	// Check subcommands
	for (const subcommand of flatSubcommands.value) {
		for (const template of subcommand.templates || []) {
			const originalContent = template.custom !== null ? template.custom : template.default
			if (editableTemplates.value[template.id] !== originalContent)
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
		for (const template of command.value.templates || []) {
			const currentContent = editableTemplates.value[template.id] ?? template.default
			const originalContent = template.custom !== null ? template.custom : template.default
			if (currentContent !== originalContent) {
				payload.push({ id: template.id, template: currentContent })
			}
		}

		// Gather modified subcommand templates
		for (const subcommand of flatSubcommands.value) {
			for (const template of subcommand.templates || []) {
				const currentContent = editableTemplates.value[template.id] ?? template.default
				const originalContent = template.custom !== null ? template.custom : template.default
				if (currentContent !== originalContent) {
					payload.push({ id: template.id, template: currentContent })
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
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to save response templates')
	}
	finally {
		isSaving.value = false
	}
}
</script>

<template>
	<AppPageContainer>
		<!-- Main Workspace Loader -->
		<div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
			<Spinner class="size-8" />
			<span>Loading command customizer...</span>
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
				<Button variant="ghost" :disabled="loading" @click="refreshCommands">
					<RefreshCcw :class="{ 'animate-spin': loading }" />
				</Button>
			</AppPageHeader>

			<ClientOnly>
				<!-- Dynamic Left-Right Sidebar Workspace -->
				<div
					class="
						grid flex-1 grid-cols-1 items-start gap-6
						xl:grid-cols-4
					"
				>
					<!-- Left Sidebar: Triggers & Global Variables -->
					<div
						class="
							flex flex-col gap-6
							xl:col-span-1
						"
					>
						<!-- Sidebar: Execution Path Selectors -->
						<div class="flex flex-col gap-3">
							<h2 class="px-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
								Command & Subcommand Triggers
							</h2>
							<div
								class="
									flex flex-col gap-1 overflow-x-auto
									xl:overflow-x-visible
								"
							>
								<!-- Root Option -->
								<Button
									class="w-full justify-between gap-2 transition-all duration-200"
									:variant="activePathFilter === 'root' ? 'secondary' : 'ghost'"
									:class="{ 'bg-secondary/80 font-bold': activePathFilter === 'root' }"
									style="padding-left: 12px;"
									@click="activePathFilter = 'root'"
								>
									<div class="flex min-w-0 items-center gap-2">
										<Terminal class="size-3.5 shrink-0 text-muted-foreground/60" />
										<span class="truncate text-left font-mono text-xs">Root (!{{ command.activeTrigger }})</span>
									</div>
									<Badge :variant="activePathFilter === 'root' ? 'default' : 'outline'" class="h-4 shrink-0 px-1 text-xs">
										{{ command.templates?.length || 0 }}
									</Badge>
								</Button>

								<!-- Subcommands options -->
								<template v-if="flatSubcommands.length > 0">
									<template v-for="sub in flatSubcommands" :key="sub.key">
										<!-- Route group header (no handler) -->
										<div
											v-if="!sub.hasHandler"
											class="flex w-full items-center justify-between gap-2 py-1.5 pr-4 text-muted-foreground/80 select-none"
											:style="{ paddingLeft: `${(sub.depth * 12) + 12}px` }"
										>
											<div class="flex min-w-0 items-center gap-2">
												<Folder class="size-3.5 shrink-0 text-muted-foreground/60" />
												<span class="truncate text-left font-mono text-xs font-semibold">{{ sub.name }}</span>
											</div>
											<span class="shrink-0 text-[9px] font-bold tracking-wider text-muted-foreground/40 uppercase">Group</span>
										</div>

										<!-- Actual command option (has handler) -->
										<Button
											v-else
											class="w-full justify-between gap-2 transition-all duration-200"
											:variant="activePathFilter === sub.key ? 'secondary' : 'ghost'"
											:class="{ 'bg-secondary/80 font-bold': activePathFilter === sub.key }"
											:style="{ paddingLeft: `${(sub.depth * 12) + 12}px` }"
											@click="activePathFilter = sub.key"
										>
											<div class="flex min-w-0 items-center gap-2">
												<CornerDownRight class="size-3.5 shrink-0 text-muted-foreground/60" />
												<span class="truncate text-left font-mono text-xs">{{ sub.name }}</span>
											</div>
											<Badge :variant="activePathFilter === sub.key ? 'default' : 'outline'" class="h-4 shrink-0 px-1 text-xs">
												{{ sub.templates?.length || 0 }}
											</Badge>
										</Button>
									</template>
								</template>
							</div>
						</div>

						<!-- Left Sidebar: Global & Custom Variables -->
						<Card class="flex flex-col">
							<CardHeader>
								<CardTitle class="text-sm font-bold">
									Global Variables
								</CardTitle>
								<CardDescription class="text-xs">
									Global and utility variables that can be resolved in any command response. Click to copy.
								</CardDescription>
							</CardHeader>
							<CardContent class="flex flex-col gap-3">
								<!-- Search Input -->
								<div class="relative w-full items-center">
									<Input
										v-model="varSearch"
										placeholder="Search variables..."
										class="h-9 pl-9 text-xs"
									/>
									<span class="absolute inset-y-0 inset-s-0 flex items-center justify-center px-3">
										<Search class="size-3.5 text-muted-foreground" />
									</span>
								</div>

								<!-- Scrollable List -->
								<ScrollArea class="max-h-125 overflow-y-auto">
									<div class="flex flex-col gap-2.5">
										<div v-if="filteredVariables.length === 0" class="py-6 text-center text-muted-foreground italic select-none">
											No matching variables found
										</div>
										<div
											v-for="v in filteredVariables"
											:key="v.name"
											class="
												flex flex-col gap-1.5 rounded-md border p-2 transition-colors
												hover:bg-accent/40
											"
										>
											<div class="flex flex-wrap items-center justify-between gap-2">
												<Badge
													variant="secondary"
													class="
														cursor-pointer font-mono text-xs font-bold transition-colors select-none
														hover:bg-primary hover:text-primary-foreground
													"
													title="Click to copy variable"
													@click="copyVariable(`$(${v.name})`)"
												>
													{{ `$(${v.name})` }}
												</Badge>
												<span v-if="v.aliases?.length" class="font-mono text-xs text-muted-foreground">
													Alias: {{ v.aliases.map((a: string) => `$(${a})`).join(', ') }}
												</span>
											</div>
											<p class="text-xs text-muted-foreground">
												{{ v.description }}
											</p>
										</div>
									</div>
								</ScrollArea>
							</CardContent>
						</Card>
					</div>

					<!-- Workspace: Active Path Templates Editors -->
					<div
						class="
							flex flex-col gap-4
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

						<div class="flex flex-col gap-4">
							<!-- Individual Template Card Editors -->
							<TemplateEditorCard
								v-for="template in activeTemplatesToDisplay"
								:key="template.id"
								v-model="editableTemplates[template.id]"
								v-model:is-expanded="expandedTemplates[template.id]"
								:template="template"
								@reset="resetTemplateToDefault(template)"
							/>
						</div>
					</div>
				</div>
				<template #fallback>
					<!-- Skeleton loaders matching page layout -->
					<div
						class="
							grid flex-1 grid-cols-1 items-start gap-6
							xl:grid-cols-4
						"
					>
						<!-- Left Sidebar Skeletons -->
						<div
							class="
								flex flex-col gap-6
								xl:col-span-1
							"
						>
							<!-- Triggers List Skeleton -->
							<div class="flex flex-col gap-3">
								<Skeleton class="h-4 w-36 px-2" />
								<div class="flex flex-col gap-1.5">
									<Skeleton v-for="i in 5" :key="i" class="h-9 w-full" />
								</div>
							</div>

							<!-- Global Variables Skeleton -->
							<Card class="flex flex-col">
								<CardHeader>
									<Skeleton class="mb-1 h-5 w-28" />
									<Skeleton class="h-3 w-full" />
								</CardHeader>
								<CardContent class="flex flex-col gap-3">
									<Skeleton class="h-9 w-full" />
									<div class="flex flex-col gap-2.5">
										<Skeleton v-for="i in 3" :key="i" class="h-14 w-full" />
									</div>
								</CardContent>
							</Card>
						</div>

						<!-- Workspace Skeletons -->
						<div
							class="
								flex flex-col gap-4
								xl:col-span-3
							"
						>
							<div class="flex flex-col gap-2">
								<Skeleton class="h-5 w-48" />
								<Skeleton class="h-3 w-80" />
							</div>
							<div class="flex flex-col gap-4">
								<Card v-for="i in 2" :key="i" class="flex flex-col gap-4 p-6">
									<div class="flex items-center justify-between">
										<Skeleton class="h-5 w-40" />
										<Skeleton class="h-5 w-16 rounded-full" />
									</div>
									<Skeleton class="h-10 w-full" />
								</Card>
							</div>
						</div>
					</div>
				</template>
			</ClientOnly>

			<!-- Workspace Floating Action save bar (shown conditionally) -->
			<AppFloatingSaveBar
				:show="isAnyTemplateModified"
				:is-saving="isSaving"
				title="Unsaved Template Overrides"
				description="You have modified message templates. Save to instantly update Twitch chat triggers."
				save-text="Save Templates"
				saving-text="Saving Overrides..."
				discard-text="Discard Changes"
				@save="saveTemplates"
				@discard="refreshCommands"
			/>
		</div>
	</AppPageContainer>
</template>
