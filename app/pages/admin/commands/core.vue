<script setup lang="ts">
import type { Command } from '~/types/commands'
import { ChevronRight, Clock, CornerDownRight, MessageSquare, RefreshCcw, SearchIcon, Settings } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import CommandEditSheet from '~/components/commands/CommandEditSheet.vue'

const { data: commandsList, refresh: refreshCommands, pending: loading } = useFetch<Command[]>('/api/commands')

useHead({
	title: 'Command Management',
})

// Expandable subcommands state mapping
const expandedCommands = ref<Record<string, boolean>>({})

function toggleCommandExpanded(commandId: string) {
	expandedCommands.value[commandId] = !expandedCommands.value[commandId]
}

// Search & Filter state
const searchQuery = ref('')

const filteredCommands = computed(() => {
	if (!commandsList.value)
		return []
	const filter = searchQuery.value.trim().toLowerCase()
	if (!filter)
		return commandsList.value

	return commandsList.value.filter(cmd =>
		cmd.activeTrigger.toLowerCase().includes(filter)
		|| cmd.id.toLowerCase().includes(filter)
		|| (cmd.description && cmd.description.toLowerCase().includes(filter)),
	)
})

// Edit Sheet triggers
const isSheetOpen = ref(false)
const selectedCommand = ref<Command | null>(null)

// Inline toggle switch active state instantly
async function toggleCommandActive(command: Command) {
	try {
		const nextState = command.enabled
		await $fetch('/api/commands/save', {
			method: 'PUT',
			body: {
				id: command.id,
				trigger: command.trigger,
				enabled: nextState,
				cost: command.cost,
				globalCooldown: command.globalCooldown,
				userCooldown: command.userCooldown,
				permission: command.permission,
			},
		})
		toast.success(`Command '!${command.activeTrigger}' has been ${nextState ? 'enabled' : 'disabled'}!`)
		await refreshCommands()
	}
	catch (error: any) {
		toast.error(error.data?.statusMessage || 'Failed to toggle command state')
	}
}

function getFlatSubcommands(subcommandsObject: any): Array<{ name: string, triggerPath: string, detail: any }> {
	if (!subcommandsObject || typeof subcommandsObject !== 'object' || Array.isArray(subcommandsObject))
		return []
	const flatList: Array<{ name: string, triggerPath: string, detail: any }> = []

	function traverse(objectRecord: any, pathPrefix: string, triggerPrefix: string) {
		if (!objectRecord || typeof objectRecord !== 'object' || Array.isArray(objectRecord))
			return
		for (const [name, value] of Object.entries(objectRecord)) {
			if (!value || typeof value !== 'object')
				continue
			const detail = value as any
			const currentPath = pathPrefix ? `${pathPrefix} ${name}` : name
			const currentTriggerPath = triggerPrefix ? `${triggerPrefix} ${detail.activeTrigger}` : detail.activeTrigger
			flatList.push({
				name: currentPath,
				triggerPath: currentTriggerPath,
				detail,
			})
			if (detail.subcommands) {
				traverse(detail.subcommands, currentPath, currentTriggerPath)
			}
		}
	}

	traverse(subcommandsObject, '', '')
	return flatList
}

// Open Quick Edit Sheet
function openQuickEdit(command: Command) {
	selectedCommand.value = command
	isSheetOpen.value = true
}

// Open Sub-command Quick Edit Sheet
function openSubCommandQuickEdit(subcommandItem: any, parentCommand: Command) {
	const subcommand = subcommandItem.detail
	const triggerParts = subcommandItem.triggerPath.split(' ')
	const activeTriggerWord = triggerParts[triggerParts.length - 1]
	const parentParts = triggerParts.slice(0, -1)
	const parentTriggerPath = [`!${parentCommand.activeTrigger}`, ...parentParts].join(' ')

	selectedCommand.value = {
		id: subcommand.id,
		trigger: activeTriggerWord,
		activeTrigger: activeTriggerWord,
		parentTriggerPath,
		description: subcommand.description,
		usage: subcommand.usage,
		permission: subcommand.permission,
		enabled: subcommand.enabled,
		cost: subcommand.cost,
		globalCooldown: subcommand.globalCooldown,
		userCooldown: subcommand.userCooldown,
		allowWhisper: Boolean(subcommand.allowWhisper),
		whisperSilentResponse: Boolean(subcommand.whisperSilentResponse),
		aliases: [],
		templates: subcommand.templates || [],
		hasHandler: subcommand.hasHandler,
	}
	isSheetOpen.value = true
}
</script>

<template>
	<AppSettingsPage
		heading="Command Management"
		subheading="Configure point costs, dynamic execution cooldowns, trigger aliases, and chat response templates."
	>
		<template #header-actions>
			<Button variant="ghost" :disabled="loading" @click="refreshCommands">
				<RefreshCcw :class="{ 'animate-spin': loading }" />
			</Button>
		</template>
		<!-- Command Controls and Dashboard Table (Card-Free Design) -->
		<div class="flex flex-col gap-4">
			<!-- Search & Count Control Row -->
			<div
				class="
					flex flex-col gap-4
					sm:flex-row sm:items-center sm:justify-between
				"
			>
				<InputGroup class="w-full max-w-sm">
					<InputGroupAddon>
						<SearchIcon class="text-muted-foreground" />
					</InputGroupAddon>
					<InputGroupInput
						v-model="searchQuery"
						type="search"
						placeholder="Search trigger or description..."
					/>
				</InputGroup>

				<div class="text-xs text-muted-foreground select-none">
					Showing {{ filteredCommands.length }} of {{ commandsList?.length || 0 }} core commands
				</div>
			</div>

			<!-- Table container -->
			<div class="relative overflow-hidden rounded-lg border bg-card/25 backdrop-blur-xs">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>
								Command Trigger
							</TableHead>
							<TableHead>
								Permission
							</TableHead>
							<TableHead>
								Points Cost
							</TableHead>
							<TableHead>
								Cooldowns
							</TableHead>
							<TableHead class="text-center">
								Status
							</TableHead>
							<TableHead class="text-right">
								Actions
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody class="divide-y divide-border/60">
						<TableRow v-if="loading" class="text-center">
							<TableCell colspan="6" class="py-12 text-muted-foreground">
								Loading bot commands...
							</TableCell>
						</TableRow>
						<TableRow v-else-if="filteredCommands.length === 0" class="text-center">
							<TableCell colspan="6" class="py-12 text-muted-foreground">
								No commands found matching your search.
							</TableCell>
						</TableRow>
						<template v-for="command in filteredCommands" v-else :key="command.id">
							<TableRow
								class="
									transition-colors
									hover:bg-muted/40
								"
								:class="{ 'opacity-55': !command.enabled }"
							>
								<!-- Trigger Name & Aliases -->
								<TableCell class="py-3.5">
									<div class="flex flex-col gap-1.5">
										<div class="flex items-center gap-1.5">
											<!-- Collapsible Subcommands Trigger Chevron -->
											<button
												v-if="command.subcommands && Object.keys(command.subcommands).length > 0"
												class="
													rounded-sm p-1 text-muted-foreground transition-colors
													hover:bg-muted hover:text-foreground
												"
												title="Toggle nested subcommands"
												@click="toggleCommandExpanded(command.id)"
											>
												<ChevronRight class="size-4 text-primary transition-transform" :class="{ 'rotate-90': expandedCommands[command.id] }" />
											</button>

											<!-- Command Name & ID - Clickable accordion triggers -->
											<div
												class="flex items-baseline gap-2"
												:class="{ 'cursor-pointer': command.subcommands && Object.keys(command.subcommands).length > 0 }"
												@click="command.subcommands && Object.keys(command.subcommands).length > 0 ? toggleCommandExpanded(command.id) : null"
											>
												<span class="font-bold whitespace-nowrap text-foreground">
													!{{ command.activeTrigger }}
												</span>
												<span v-if="command.activeTrigger !== command.id" class="rounded-sm bg-muted/65 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
													{{ command.id }}
												</span>
											</div>
										</div>
										<span class="line-clamp-1 max-w-70 pl-1 text-xs text-muted-foreground">
											{{ command.description }}
										</span>
									</div>
								</TableCell>

								<!-- Permission Badge -->
								<TableCell>
									<CommandPermissionBadge :permission="command.permission" />
								</TableCell>

								<!-- Points Cost -->
								<TableCell>
									<CommandPointsBadge :cost="command.cost" />
								</TableCell>

								<!-- Cooldowns -->
								<TableCell>
									<CommandCooldownsDisplay :global="command.globalCooldown" :user="command.userCooldown" />
								</TableCell>

								<!-- Active Status Toggle -->
								<TableCell class="text-center">
									<Switch v-model:model-value="command.enabled" @update:model-value="toggleCommandActive(command)" />
								</TableCell>

								<!-- Configure Actions -->
								<TableCell class="text-right">
									<div class="flex items-center justify-end gap-1.5">
										<Button size="sm" variant="outline" @click="openQuickEdit(command)">
											<Settings data-icon="inline-start" />
											Config
										</Button>
										<Button
											variant="outline" size="sm" as-child
										>
											<NuxtLink :to="`/admin/commands/${command.id}`">
												<MessageSquare data-icon="inline-start" />
												Templates
											</NuxtLink>
										</Button>
									</div>
								</TableCell>
							</TableRow>

							<!-- Nested Collapsible Subcommands Container Row (Premium Tree Layout) -->
							<TableRow v-if="command.subcommands && Object.keys(command.subcommands).length > 0 && expandedCommands[command.id]" class="bg-muted/10">
								<TableCell colspan="6" class="px-6 py-4">
									<div class="ml-5 flex flex-col gap-4 border-l border-border/80 py-2 pr-2 pl-4">
										<!-- Expanded Subheader -->
										<div class="flex items-center justify-between select-none">
											<div class="flex flex-col">
												<span class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
													Subcommands & Routing Pathways
												</span>
												<span class="mt-0.5 text-xs text-muted-foreground">
													Hierarchical subcommands mapped to visual execution layers.
												</span>
											</div>
											<Badge variant="outline" class="uppercase">
												{{ getFlatSubcommands(command.subcommands).length }} Paths
											</Badge>
										</div>

										<!-- Subcommand Tree Grid -->
										<div class="grid gap-2">
											<div
												v-for="subcommandItem in getFlatSubcommands(command.subcommands)"
												:key="subcommandItem.detail.id"
												class="
													flex flex-col justify-between rounded-lg border p-3 transition-all
													sm:flex-row sm:items-center
												"
												:class="[
													subcommandItem.detail.enabled
														? `
															border-border/60 bg-card
															hover:bg-muted/40
														`
														: `
															border-dashed border-border/40 bg-muted/5 opacity-55
															hover:opacity-80
														`,
													subcommandItem.detail.hasHandler === false
														? `
															border-dashed border-amber-500/25
															dark:border-amber-500/15
														`
														: 'border-border/60',
												]"
												:style="{
													marginLeft: `${(subcommandItem.name.trim().split(/\s+/).length - 1) * 1.5}rem`,
												}"
											>
												<div class="flex min-w-0 items-center gap-3">
													<!-- Visual tree line connectors -->
													<CornerDownRight
														v-if="subcommandItem.name.trim().split(/\s+/).length - 1 > 0"
														class="size-3.5 shrink-0 text-muted-foreground/50"
													/>

													<div class="flex min-w-0 flex-col gap-1">
														<div class="flex flex-wrap items-center gap-1.5">
															<span class="font-mono text-xs font-bold text-foreground">
																!{{ command.activeTrigger }} {{ subcommandItem.triggerPath }}
															</span>
															<Badge
																v-if="subcommandItem.detail.hasHandler === false" variant="outline" class="
																	border-amber-500/20 bg-amber-500/5 px-1 py-0 text-[9px] font-medium text-amber-600
																	dark:text-amber-400
																"
															>
																Route Group
															</Badge>
														</div>
														<span class="line-clamp-2 text-xs text-muted-foreground">
															{{ subcommandItem.detail.description || 'No description provided.' }}
														</span>
													</div>
												</div>

												<div
													class="
														mt-3 flex shrink-0 items-center justify-between gap-4 select-none
														sm:mt-0 sm:justify-end
													"
												>
													<!-- Custom Costs/Cooldowns badges -->
													<div class="flex items-center gap-2">
														<CommandPointsBadge v-if="subcommandItem.detail.cost > 0" :cost="subcommandItem.detail.cost" />
														<Badge
															v-if="subcommandItem.detail.globalCooldown > 0 || subcommandItem.detail.userCooldown > 0"
															variant="outline"
															class="h-5 py-0 text-[10px]"
															:title="`Global Cooldown: ${subcommandItem.detail.globalCooldown}s | User Cooldown: ${subcommandItem.detail.userCooldown}s`"
														>
															<Clock class="size-2.5" />
															{{ Math.max(subcommandItem.detail.globalCooldown, subcommandItem.detail.userCooldown) }}s
														</Badge>
														<CommandPermissionBadge :permission="subcommandItem.detail.permission" />
													</div>

													<div class="flex items-center gap-1.5">
														<!-- Subcommand Config Action -->
														<Button
															size="sm" variant="outline" class="size-8 p-0" @click="openSubCommandQuickEdit(subcommandItem, command)"
														>
															<Settings class="size-3.5" />
														</Button>

														<!-- Templates Quick Link (Disabled for command groups) -->
														<Button
															size="sm"
															variant="outline"
															class="size-8 p-0"
															:class="subcommandItem.detail.hasHandler === false ? 'cursor-not-allowed' : ''"
															:disabled="subcommandItem.detail.hasHandler === false"
															as-child
														>
															<NuxtLink v-if="subcommandItem.detail.hasHandler !== false" :to="`/admin/commands/${command.id}?path=${subcommandItem.name}`">
																<MessageSquare class="size-3.5" />
															</NuxtLink>
															<span v-else class="flex items-center justify-center text-muted-foreground/30">
																<MessageSquare class="size-3.5 text-muted-foreground/20" />
															</span>
														</Button>
													</div>
												</div>
											</div>
										</div>
									</div>
								</TableCell>
							</TableRow>
						</template>
					</TableBody>
				</Table>
			</div>

			<!-- Command Edit Slide-over Sheet -->
			<CommandEditSheet
				:command="selectedCommand"
				:open="isSheetOpen"
				@update:open="isSheetOpen = $event"
				@saved="refreshCommands"
			/>
		</div>
	</AppSettingsPage>
</template>
