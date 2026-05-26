<script setup lang="ts">
import type { Command, Template } from '~/types/commands'
import {
	CornerDownRight,
	Terminal,
} from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import TemplateEditorCard from '~/components/commands/TemplateEditorCard.vue'

const route = useRoute()
const { data: commands, refresh: refreshCommands, pending: loading } = await useFetch<Command[]>('/api/commands')

const command = computed(() => {
	if (!commands.value)
		return null
	return commands.value.find(cmd => cmd.id === route.params.id) || null
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

	function traverse(subcommandsMap: any, pathPrefix: string, triggerPrefix: string) {
		for (const [name, subcommandRecord] of Object.entries(subcommandsMap)) {
			if (!subcommandRecord || typeof subcommandRecord !== 'object')
				continue
			const detail = subcommandRecord as any
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
						flex flex-col gap-3
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
								<Terminal data-icon="inline-start" />
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
									<CornerDownRight data-icon="inline-start" />
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
