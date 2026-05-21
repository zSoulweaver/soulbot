<script setup lang="ts">
import { BadgeDollarSign,	ChevronRight,	Clock,	MessageSquare,	Settings,	Shield,	User } from 'lucide-vue-next'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import CommandEditSheet from '~/components/commands/CommandEditSheet.vue'

interface Alias {
	id?: number
	trigger: string
	subcommand: string | null
	overrideArgs: string[] | null
}

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
	usage?: string
	permission: string
	trigger: string
	activeTrigger: string
	parentTriggerPath?: string
	enabled: boolean
	cost: number
	globalCooldown: number
	userCooldown: number
	aliases: Alias[]
	templates: Template[]
	subcommands?: Record<string, any>
	hasHandler?: boolean
}

const { data: commandsList, refresh: refreshCommands, pending: loading } = await useFetch<Command[]>('/api/commands')

// Expandable subcommands state mapping
const expandedCommands = ref<Record<string, boolean>>({})

function toggleCommandExpanded(commandId: string) {
	expandedCommands.value[commandId] = !expandedCommands.value[commandId]
}

// Edit Sheet triggers
const isSheetOpen = ref(false)
const selectedCommand = ref<Command | null>(null)

// Resolve permissions colors
function getPermissionBadgeClass(permission: string) {
	if (permission === 'caster') {
		return 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
	}
	if (permission === 'moderator') {
		return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
	}
	return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
}

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
	catch (err: any) {
		toast.error(err.data?.statusMessage || 'Failed to toggle command state')
	}
}

function getFlatSubcommands(subcommandsObj: any): Array<{ name: string, triggerPath: string, detail: any }> {
	if (!subcommandsObj || typeof subcommandsObj !== 'object' || Array.isArray(subcommandsObj))
		return []
	const flatList: Array<{ name: string, triggerPath: string, detail: any }> = []

	function traverse(obj: any, pathPrefix: string, triggerPrefix: string) {
		if (!obj || typeof obj !== 'object' || Array.isArray(obj))
			return
		for (const [name, val] of Object.entries(obj)) {
			if (!val || typeof val !== 'object')
				continue
			const detail = val as any
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

	traverse(subcommandsObj, '', '')
	return flatList
}

// Open Quick Edit Sheet
function openQuickEdit(command: Command) {
	selectedCommand.value = command
	isSheetOpen.value = true
}

// Open Sub-command Quick Edit Sheet
function openSubCommandQuickEdit(subItem: any, parentCommand: Command) {
	const sub = subItem.detail
	const triggerParts = subItem.triggerPath.split(' ')
	const activeTriggerWord = triggerParts[triggerParts.length - 1]
	const parentParts = triggerParts.slice(0, -1)
	const parentTriggerPath = [`!${parentCommand.activeTrigger}`, ...parentParts].join(' ')

	selectedCommand.value = {
		id: sub.id,
		trigger: activeTriggerWord,
		activeTrigger: activeTriggerWord,
		parentTriggerPath,
		description: sub.description,
		usage: sub.usage,
		permission: sub.permission,
		enabled: sub.enabled,
		cost: sub.cost,
		globalCooldown: sub.globalCooldown,
		userCooldown: sub.userCooldown,
		aliases: [],
		templates: sub.templates || [],
		hasHandler: sub.hasHandler,
	}
	isSheetOpen.value = true
}
</script>

<template>
	<div class="space-y-6">
		<AppPageHeader
			heading="Command Management"
			subheading="Configure point costs, dynamic execution cooldowns, trigger aliases, and chat response templates."
		>
			<Button variant="outline" :disabled="loading" @click="refreshCommands">
				Refresh Commands
			</Button>
		</AppPageHeader>

		<!-- Commands Table Card -->
		<Card>
			<CardHeader>
				<CardTitle>Active Commands</CardTitle>
				<CardDescription>Core modules registered by the bot and synced via the database.</CardDescription>
			</CardHeader>
			<CardContent class="p-0">
				<div class="relative overflow-x-auto">
					<table class="w-full text-left">
						<thead class="border-b border-border bg-muted/50 text-xs text-muted-foreground uppercase select-none">
							<tr>
								<th class="px-6 py-4">
									Command Trigger
								</th>
								<th class="px-6 py-4">
									Permission
								</th>
								<th class="px-6 py-4">
									Points Cost
								</th>
								<th class="px-6 py-4">
									Cooldowns
								</th>
								<th class="px-6 py-4 text-center">
									Status
								</th>
								<th class="px-6 py-4 text-right">
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border">
							<tr v-if="loading" class="text-center">
								<td colspan="6" class="py-10 text-muted-foreground">
									Loading bot commands...
								</td>
							</tr>
							<tr v-else-if="!commandsList || commandsList.length === 0" class="text-center">
								<td colspan="6" class="py-10 text-muted-foreground">
									No commands registered.
								</td>
							</tr>
							<template v-for="command in commandsList" v-else :key="command.id">
								<tr
									class="
										transition-colors
										hover:bg-muted/30
									"
									:class="{ 'opacity-40': !command.enabled }"
								>
									<!-- Trigger Name & Aliases -->
									<td class="px-6 py-3">
										<div class="flex flex-col gap-1.5">
											<div class="flex items-center gap-1">
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
													<span class="font-bold whitespace-nowrap">
														!{{ command.activeTrigger }}
													</span>
													<span v-if="command.activeTrigger !== command.id" class="font-mono text-xs text-muted-foreground">
														{{ command.id }}
													</span>
												</div>
											</div>
											<span class="line-clamp-1 max-w-70 text-xs text-muted-foreground">
												{{ command.description }}
											</span>
										</div>
									</td>

									<!-- Permission Badge -->
									<td class="px-6 py-4">
										<Badge :class="getPermissionBadgeClass(command.permission)" class="font-medium capitalize">
											<Shield />
											{{ command.permission }}
										</Badge>
									</td>

									<!-- Points Cost -->
									<td class="px-6 py-4">
										<Badge
											v-if="command.cost > 0"
											class="border-amber-500/20 bg-amber-500/10 text-amber-500"
										>
											<BadgeDollarSign />
											{{ command.cost }} pts
										</Badge>
										<span v-else class="text-muted-foreground">-</span>
									</td>

									<!-- Cooldowns -->
									<td class="px-6 py-4">
										<div class="flex flex-col gap-0.5 text-xs text-muted-foreground">
											<span class="flex items-center gap-1">
												<Clock class="size-3" /> Global: {{ command.globalCooldown > 0 ? `${command.globalCooldown}s` : 'None' }}
											</span>
											<span class="flex items-center gap-1">
												<User class="size-3" /> User: {{ command.userCooldown > 0 ? `${command.userCooldown}s` : 'None' }}
											</span>
										</div>
									</td>

									<!-- Active Status Toggle -->
									<td class="px-6 py-4 text-center">
										<Switch v-model:model-value="command.enabled" @update:model-value="toggleCommandActive(command)" />
									</td>

									<!-- Configure Actions -->
									<td class="px-6 py-4 text-right">
										<div class="flex items-center justify-end gap-1.5">
											<Button size="sm" variant="outline" @click="openQuickEdit(command)">
												<Settings />
												Config
											</Button>
											<Button
												variant="outline" size="sm" as-child
											>
												<NuxtLink :to="`/admin/commands/${command.id}`">
													<MessageSquare />
													Templates
												</NuxtLink>
											</Button>
										</div>
									</td>
								</tr>

								<!-- Nested Collapsible Subcommands Container Row -->
								<tr v-if="command.subcommands && Object.keys(command.subcommands).length > 0 && expandedCommands[command.id]" class="bg-background">
									<td colspan="6" class="px-6 py-4">
										<div class="space-y-2 border-l-2 py-2 pl-4">
											<div class="text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
												Registered subcommands for !{{ command.activeTrigger }}
											</div>
											<div class="grid gap-2">
												<div
													v-for="subItem in getFlatSubcommands(command.subcommands)"
													:key="subItem.detail.id"
													class="
														flex items-center justify-between rounded-lg border border-secondary bg-secondary/20 p-3 transition-colors
														hover:border-border
													"
													:class="{ 'opacity-65': !subItem.detail.enabled }"
												>
													<div class="flex flex-col gap-1">
														<div class="flex items-center gap-2">
															<Badge class="font-mono text-xs font-bold">
																!{{ command.activeTrigger }} {{ subItem.triggerPath }}
															</Badge>
															<span v-if="subItem.detail.usage" class="font-mono text-xs text-muted-foreground">{{ subItem.detail.usage }}</span>
															<Badge v-if="subItem.detail.hasHandler === false" variant="secondary" class="text-xs">
																Command Group
															</Badge>
															<Badge v-if="!subItem.detail.enabled" variant="destructive" class="text-xs">
																Disabled
															</Badge>
														</div>
														<span class="text-xs text-muted-foreground">{{ subItem.detail.description }}</span>
													</div>

													<div class="flex items-center gap-4">
														<!-- Custom Costs/Cooldowns badges -->
														<div class="flex items-center gap-2">
															<Badge
																v-if="subItem.detail.cost > 0"
																class="border-amber-500/20 bg-amber-500/10 text-xs font-semibold text-amber-500"
															>
																<BadgeDollarSign />
																{{ subItem.detail.cost }} pts
															</Badge>
															<Badge
																v-if="subItem.detail.globalCooldown > 0 || subItem.detail.userCooldown > 0"
																variant="outline"
																class="text-xs"
																:title="`Global Cooldown: ${subItem.detail.globalCooldown}s | User Cooldown: ${subItem.detail.userCooldown}s`"
															>
																<Clock />
																CD
															</Badge>
														</div>

														<div class="flex items-center gap-2">
															<!-- Subcommand Permission Badge -->
															<Badge :class="getPermissionBadgeClass(subItem.detail.permission)" class="capitalize">
																<Shield />
																{{ subItem.detail.permission }}
															</Badge>

															<!-- Subcommand Config Action -->
															<Button
																size="sm" variant="outline" @click="openSubCommandQuickEdit(subItem, command)"
															>
																<Settings />
															</Button>

															<!-- Templates Quick Link (Disabled for command groups) -->
															<Button
																size="sm"
																variant="outline"
																:class="subItem.detail.hasHandler === false ? 'cursor-not-allowed' : ''"
																:disabled="subItem.detail.hasHandler === false"
																as-child
															>
																<NuxtLink v-if="subItem.detail.hasHandler !== false" :to="`/admin/commands/${command.id}?path=${subItem.name}`">
																	<MessageSquare />
																</NuxtLink>
																<span v-else class="flex items-center text-muted-foreground">
																	<MessageSquare />

																</span>
															</Button>
														</div>
													</div>
												</div>
											</div>
										</div>
									</td>
								</tr>
							</template>
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>

		<!-- Command Edit Slide-over Sheet -->
		<CommandEditSheet
			:command="selectedCommand"
			:open="isSheetOpen"
			@update:open="isSheetOpen = $event"
			@saved="refreshCommands"
		/>
	</div>
</template>
