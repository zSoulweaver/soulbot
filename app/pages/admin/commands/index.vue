<script setup lang="ts">
import {
	ChevronDown,
	ChevronRight,
	Clock,
	Coins,
	MessageSquare,
	Settings,
	Shield,
	Sliders,
} from 'lucide-vue-next'
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
		const nextState = !command.enabled
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
		toast.success(`Command '!${command.trigger}' has been ${nextState ? 'enabled' : 'disabled'}!`)
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
			const currentTriggerPath = triggerPrefix ? `${triggerPrefix} ${detail.trigger || name}` : (detail.trigger || name)
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
	const parentTriggerPath = [`!${parentCommand.trigger}`, ...parentParts].join(' ')

	selectedCommand.value = {
		id: sub.id,
		trigger: activeTriggerWord,
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
	<div class="flex flex-col gap-6">
		<div class="flex items-center justify-between">
			<div class="flex flex-col gap-1">
				<h1 class="text-3xl font-bold tracking-tight">
					Commands Management
				</h1>
				<p class="text-sm text-muted-foreground">
					Configure point costs, dynamic execution cooldowns, trigger aliases, and chat response templates.
				</p>
			</div>
			<Button variant="outline" size="sm" :disabled="loading" @click="refreshCommands">
				Refresh Commands
			</Button>
		</div>

		<!-- Commands Table Card -->
		<Card class="border-border bg-card/50 backdrop-blur-sm">
			<CardHeader class="pb-2 select-none">
				<CardTitle>Active Commands</CardTitle>
				<CardDescription>Core modules registered by the bot and synced via Drizzle SQLite.</CardDescription>
			</CardHeader>
			<CardContent class="p-0">
				<div class="relative overflow-x-auto">
					<table class="w-full text-left text-sm">
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
								<td colspan="6" class="py-10 text-xs text-muted-foreground">
									Loading bot commands...
								</td>
							</tr>
							<tr v-else-if="!commandsList || commandsList.length === 0" class="text-center">
								<td colspan="6" class="py-10 text-xs text-muted-foreground">
									No commands registered.
								</td>
							</tr>
							<template v-for="command in commandsList" v-else :key="command.id">
								<tr
									class="
										transition-colors
										hover:bg-muted/30
									"
									:class="{ 'opacity-65': !command.enabled }"
								>
									<!-- Trigger Name & Aliases -->
									<td class="px-6 py-4">
										<div class="flex flex-col gap-1.5">
											<div class="flex items-center gap-2">
												<!-- Collapsible Subcommands Trigger Chevron -->
												<button
													v-if="command.subcommands && Object.keys(command.subcommands).length > 0"
													class="
														cursor-pointer rounded-sm p-0.5 text-muted-foreground transition-colors
														hover:bg-muted hover:text-foreground
													"
													title="Toggle nested subcommands"
													@click="toggleCommandExpanded(command.id)"
												>
													<ChevronDown v-if="expandedCommands[command.id]" class="size-4 text-primary" />
													<ChevronRight v-else class="size-4" />
												</button>

												<!-- Command Name & ID - Clickable accordion triggers -->
												<div
													class="flex items-center gap-2"
													:class="{ 'cursor-pointer transition-colors select-none hover:text-primary': command.subcommands && Object.keys(command.subcommands).length > 0 }"
													@click="command.subcommands && Object.keys(command.subcommands).length > 0 ? toggleCommandExpanded(command.id) : null"
												>
													<span class="text-base font-bold text-foreground">
														!{{ command.trigger }}
													</span>
													<span class="font-mono text-xs text-muted-foreground">
														({{ command.id }})
													</span>
												</div>
											</div>
											<span class="line-clamp-1 max-w-[280px] text-xs text-muted-foreground">
												{{ command.description }}
											</span>
											<!-- Aliases Render -->
											<div v-if="command.aliases && command.aliases.length > 0" class="mt-1 flex flex-wrap gap-1">
												<Badge
													v-for="alias in command.aliases"
													:key="alias.trigger"
													variant="outline"
													class="border-border bg-muted/10 px-1.5 py-0 text-[9px] font-semibold text-muted-foreground"
												>
													!{{ alias.trigger }}
													<span v-if="alias.subcommand" class="pl-0.5 text-[8px] text-primary/70">
														-> {{ alias.subcommand }}
													</span>
												</Badge>
											</div>
										</div>
									</td>

									<!-- Permission Badge -->
									<td class="px-6 py-4">
										<Badge :class="getPermissionBadgeClass(command.permission)" class="text-[10px] font-medium capitalize">
											<Shield class="mr-1 size-3" />
											{{ command.permission }}
										</Badge>
									</td>

									<!-- Points Cost -->
									<td class="px-6 py-4">
										<Badge
											v-if="command.cost > 0"
											class="gap-1 border border-amber-500/20 bg-amber-500/10 text-[10px] font-semibold text-amber-500"
										>
											<Coins class="size-3" />
											{{ command.cost }} pts
										</Badge>
										<span v-else class="text-xs text-muted-foreground italic">Free</span>
									</td>

									<!-- Cooldowns -->
									<td class="px-6 py-4">
										<div class="flex flex-col gap-0.5 text-xs text-muted-foreground">
											<span class="flex items-center gap-1">
												<Clock class="size-3" /> Global: {{ command.globalCooldown > 0 ? `${command.globalCooldown}s` : 'None' }}
											</span>
											<span class="flex items-center gap-1">
												<Sliders class="size-3" /> User: {{ command.userCooldown > 0 ? `${command.userCooldown}s` : 'None' }}
											</span>
										</div>
									</td>

									<!-- Active Status Toggle -->
									<td class="px-6 py-4 text-center">
										<div class="flex items-center justify-center">
											<label class="relative inline-flex cursor-pointer items-center">
												<input
													type="checkbox"
													:checked="command.enabled"
													class="peer sr-only"
													@change="toggleCommandActive(command)"
												>
												<div
													class="
														peer h-5 w-9 rounded-full border border-border bg-muted transition-all
														peer-checked:bg-primary
														after:absolute after:top-[2px] after:left-[2px] after:size-4 after:rounded-full after:bg-muted-foreground after:transition-all
														peer-checked:after:translate-x-full peer-checked:after:bg-background
													"
												/>
											</label>
										</div>
									</td>

									<!-- Configure Actions -->
									<td class="px-6 py-4 text-right">
										<div class="flex items-center justify-end gap-1.5">
											<Button size="sm" variant="secondary" class="h-8 text-xs" @click="openQuickEdit(command)">
												<Settings class="mr-1 size-3.5" />
												Quick Config
											</Button>
											<Button
												size="sm" variant="outline" class="
													h-8 border-border text-xs
													hover:border-primary/20 hover:bg-primary/10 hover:text-primary
												" as-child
											>
												<NuxtLink :to="`/admin/commands/${command.id}`">
													<MessageSquare class="mr-1 size-3.5" />
													Templates
												</NuxtLink>
											</Button>
										</div>
									</td>
								</tr>

								<!-- Premium Nested Collapsible Subcommands Container Row -->
								<tr v-if="command.subcommands && Object.keys(command.subcommands).length > 0 && expandedCommands[command.id]" class="border-b border-border/50 bg-muted/15">
									<td colspan="6" class="px-8 py-4">
										<div class="space-y-3 border-l-2 border-primary/50 py-2 pl-4">
											<div class="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase select-none">
												Registered Subcommands for !{{ command.trigger }}
											</div>
											<div class="grid gap-2">
												<div
													v-for="subItem in getFlatSubcommands(command.subcommands)"
													:key="subItem.detail.id"
													class="
														flex items-center justify-between rounded-lg border border-border/40 bg-card/45 p-3 transition-all
														hover:border-border
													"
													:class="{ 'opacity-65': !subItem.detail.enabled }"
												>
													<div class="flex flex-col gap-1">
														<div class="flex items-center gap-2">
															<Badge variant="secondary" class="px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
																!{{ command.trigger }} {{ subItem.triggerPath }}
															</Badge>
															<span v-if="subItem.detail.usage" class="font-mono text-[9px] text-muted-foreground">({{ subItem.detail.usage }})</span>
															<Badge v-if="subItem.detail.hasHandler === false" variant="outline" class="h-4 border-border/80 bg-secondary/30 px-1.5 py-0 text-[9px] leading-none text-muted-foreground select-none">
																Command Group
															</Badge>
															<Badge v-if="!subItem.detail.enabled" variant="outline" class="h-4 border-destructive/20 bg-destructive/10 px-1.5 py-0 text-[9px] leading-none text-destructive select-none">
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
																class="h-5 gap-1 border border-amber-500/20 bg-amber-500/10 text-[9px] font-semibold text-amber-500"
															>
																<Coins class="size-2.5" />
																{{ subItem.detail.cost }} pts
															</Badge>
															<Badge
																v-if="subItem.detail.globalCooldown > 0 || subItem.detail.userCooldown > 0"
																class="flex h-5 items-center gap-1 border border-border/80 bg-muted px-1.5 font-mono text-[9px] text-muted-foreground select-none"
																:title="`Global CD: ${subItem.detail.globalCooldown}s | User CD: ${subItem.detail.userCooldown}s`"
															>
																<Clock class="size-2.5" />
																CD
															</Badge>
														</div>

														<div class="flex items-center gap-2">
															<!-- Subcommand Permission Badge -->
															<Badge :class="getPermissionBadgeClass(subItem.detail.permission)" class="h-5 text-[9px] font-medium capitalize">
																<Shield class="mr-1 size-2.5" />
																{{ subItem.detail.permission }}
															</Badge>

															<!-- Subcommand Config Action -->
															<Button
																size="sm" variant="secondary" class="
																	h-7 text-[11px]
																	hover:bg-secondary/80
																" @click="openSubCommandQuickEdit(subItem, command)"
															>
																<Settings class="mr-1 size-3" />
																Quick Config
															</Button>

															<!-- Templates Quick Link (Disabled for command groups) -->
															<Button
																size="sm"
																variant="ghost"
																class="h-7 border border-border/50 text-[11px] select-none"
																:class="subItem.detail.hasHandler === false ? 'pointer-events-none cursor-not-allowed opacity-40' : 'hover:bg-primary/10 hover:text-primary'"
																:disabled="subItem.detail.hasHandler === false"
																as-child
															>
																<NuxtLink v-if="subItem.detail.hasHandler !== false" :to="`/admin/commands/${command.id}`">
																	<MessageSquare class="mr-1 size-3" />
																	Edit Templates
																</NuxtLink>
																<span v-else class="flex items-center text-muted-foreground">
																	<MessageSquare class="mr-1 size-3" />
																	Edit Templates
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
