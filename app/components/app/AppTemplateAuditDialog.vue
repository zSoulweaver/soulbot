<script setup lang="ts">
import type { TemplateAuditIssue } from '~/composables/useTemplateAudit'
import {
	AlertTriangle,
	CheckCircle2,
	ExternalLink,
	RefreshCw,
	Sparkles,
	Trash2,
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogScrollContent,
	DialogTitle,
} from '~/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useTemplateAudit } from '~/composables/useTemplateAudit'
import { tokenizeTemplate } from '~/composables/useTemplateValidator'

const isOpen = defineModel<boolean>('open', { default: false })
const { auditResult, loading, refresh, resetTemplate } = useTemplateAudit()
const router = useRouter()

// Automatically refresh issues when dialog is opened
watch(isOpen, (open) => {
	if (open) {
		refresh()
	}
})

const selectedDomain = ref<string>('all')
const resettingIssueId = ref<string | null>(null)
const isResettingAll = ref(false)

const allIssues = computed(() => auditResult.value?.issues || [])

const domainCounts = computed(() => {
	const counts: Record<string, number> = { all: allIssues.value.length }
	for (const issue of allIssues.value) {
		const group = issue.domain
		counts[group] = (counts[group] || 0) + 1
	}
	counts.loyalty = (counts.vault || 0) + (counts.gambling || 0)
	return counts
})

const filteredIssues = computed(() => {
	if (selectedDomain.value === 'all')
		return allIssues.value
	if (selectedDomain.value === 'loyalty' || selectedDomain.value === 'vault' || selectedDomain.value === 'gambling')
		return allIssues.value.filter(i => i.domain === 'vault' || i.domain === 'gambling')
	return allIssues.value.filter(i => i.domain === selectedDomain.value)
})

const resetableIssues = computed(() => {
	return allIssues.value.filter(i => i.canReset)
})

async function handleReset(issue: TemplateAuditIssue) {
	if (resettingIssueId.value)
		return
	resettingIssueId.value = issue.id
	try {
		await resetTemplate(issue.id)
		if (issue.isOrphan) {
			toast.success(`Cleaned up orphaned template "${issue.targetId || issue.id}".`)
		}
		else {
			toast.success(`Reset "${issue.location}" back to default template.`)
		}
	}
	catch (err: any) {
		toast.error(err?.data?.statusMessage || 'Failed to reset template')
	}
	finally {
		resettingIssueId.value = null
	}
}

async function handleResetAll() {
	if (isResettingAll.value || resetableIssues.value.length === 0)
		return
	isResettingAll.value = true
	let successCount = 0

	try {
		for (const issue of resetableIssues.value) {
			try {
				await resetTemplate(issue.id)
				successCount++
			}
			catch {
				// Continue resetting remaining
			}
		}
		toast.success(`Successfully restored ${successCount} template(s) back to default.`)
	}
	finally {
		isResettingAll.value = false
		await refresh()
	}
}

function handleNavigate(url: string) {
	isOpen.value = false
	router.push(url)
}

async function copySuggestion(sug: string) {
	const formatted = sug.startsWith('$') ? sug : `$(${sug})`
	try {
		await navigator.clipboard.writeText(formatted)
		toast.success(`Copied "${formatted}" to clipboard!`)
	}
	catch {
		toast.info(`Variable: ${formatted}`)
	}
}

function highlightTemplate(template: string, invalidVars: Array<{ raw: string }>) {
	if (!template)
		return []

	const invalidRawSet = new Set(invalidVars.map(v => v.raw))
	const tokens = tokenizeTemplate(template)
	const parts: Array<{ text: string, isInvalid: boolean, isVar: boolean }> = []
	let lastIndex = 0

	for (const token of tokens) {
		if (token.startIndex > lastIndex) {
			parts.push({
				text: template.substring(lastIndex, token.startIndex),
				isInvalid: false,
				isVar: false,
			})
		}
		if (token.startIndex >= lastIndex) {
			const isInvalid = invalidRawSet.has(token.raw)
			parts.push({
				text: token.raw,
				isInvalid,
				isVar: true,
			})
			lastIndex = token.endIndex
		}
	}

	if (lastIndex < template.length) {
		parts.push({
			text: template.substring(lastIndex),
			isInvalid: false,
			isVar: false,
		})
	}

	return parts
}
</script>

<template>
	<Dialog v-model:open="isOpen">
		<DialogScrollContent class="sm:max-w-3xl">
			<DialogHeader>
				<div class="flex items-center gap-2">
					<div class="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
						<AlertTriangle class="size-4" />
					</div>
					<div>
						<DialogTitle class="flex items-center gap-2 text-base">
							<span>Template Variable Diagnostics</span>
							<Badge v-if="allIssues.length > 0" variant="destructive" class="px-1.5 py-0 text-xs">
								{{ allIssues.length }} {{ allIssues.length === 1 ? 'Issue' : 'Issues' }}
							</Badge>
						</DialogTitle>
						<DialogDescription class="text-xs">
							Audit detected invalid or deprecated variables that will fail to render in stream chat or Discord.
						</DialogDescription>
					</div>
				</div>
			</DialogHeader>

			<!-- Domain Filter Tabs -->
			<div v-if="allIssues.length > 0" class="flex flex-col gap-4">
				<Tabs v-model="selectedDomain" class="w-full">
					<TabsList class="w-full">
						<TabsTrigger value="all" class="text-xs">
							All ({{ domainCounts.all || 0 }})
						</TabsTrigger>
						<TabsTrigger v-if="domainCounts.alerts" value="alerts">
							Alerts ({{ domainCounts.alerts }})
						</TabsTrigger>
						<TabsTrigger v-if="domainCounts.discord" value="discord">
							Discord ({{ domainCounts.discord }})
						</TabsTrigger>
						<TabsTrigger v-if="domainCounts.ads" value="ads">
							Ads ({{ domainCounts.ads }})
						</TabsTrigger>
						<TabsTrigger v-if="domainCounts.commands" value="commands">
							Commands ({{ domainCounts.commands }})
						</TabsTrigger>
						<TabsTrigger v-if="domainCounts.custom_commands" value="custom_commands">
							Custom ({{ domainCounts.custom_commands }})
						</TabsTrigger>
						<TabsTrigger v-if="domainCounts.loyalty" value="loyalty">
							Loyalty ({{ domainCounts.loyalty }})
						</TabsTrigger>
						<TabsTrigger v-if="domainCounts.timers" value="timers">
							Timers ({{ domainCounts.timers }})
						</TabsTrigger>
						<TabsTrigger v-if="domainCounts.widgets" value="widgets">
							Widgets ({{ domainCounts.widgets }})
						</TabsTrigger>
					</TabsList>
				</Tabs>

				<!-- Issues List -->
				<div class="flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-1">
					<div
						v-for="issue in filteredIssues"
						:key="issue.id"
						class="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3.5 transition-all"
					>
						<!-- Issue Header -->
						<div class="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
							<div class="flex items-center gap-2">
								<span class="text-sm font-medium text-foreground">{{ issue.location }}</span>
								<Badge
									v-if="issue.isOrphan" variant="outline" class="
										border-amber-500/50 bg-amber-500/10 text-[11px] font-semibold text-amber-600
										dark:text-amber-400
									"
								>
									Orphaned
								</Badge>
								<Badge v-else variant="secondary" class="capitalize">
									{{ issue.domain }}
								</Badge>
							</div>

							<div class="flex items-center gap-1.5">
								<!-- 1-Click Reset / Clean Up Button -->
								<Button
									v-if="issue.canReset"
									size="sm"
									variant="ghostDestructive"
									:disabled="resettingIssueId === issue.id || isResettingAll"
									@click="handleReset(issue)"
								>
									<Trash2
										v-if="issue.isOrphan"
										class="size-3.5"
										:class="{ 'animate-spin': resettingIssueId === issue.id }"
									/>
									<RefreshCw
										v-else
										class="size-3.5"
										:class="{ 'animate-spin': resettingIssueId === issue.id }"
									/>
									<span>{{ issue.isOrphan ? 'Clean Up Orphan' : 'Reset to Default' }}</span>
								</Button>

								<!-- Navigate Button -->
								<Button
									v-if="issue.editUrl"
									size="sm"
									variant="ghost"
									@click="handleNavigate(issue.editUrl)"
								>
									<ExternalLink />
									<span>Edit</span>
								</Button>
							</div>
						</div>

						<!-- Broken Template Highlight Preview -->
						<div class="flex flex-col gap-1">
							<span class="text-xs font-semibold text-muted-foreground">Current Template:</span>
							<div class="rounded-md border border-border/60 bg-background/90 p-2.5 text-xs/relaxed break-all text-foreground">
								<template v-for="(chunk, idx) in highlightTemplate(issue.currentTemplate, issue.invalidVariables)" :key="idx">
									<span
										v-if="chunk.isInvalid"
										class="inline-flex items-center rounded-sm border border-destructive/50 bg-destructive/20 px-1 py-0.5 font-mono font-bold text-destructive"
									>
										{{ chunk.text }}
									</span>
									<span
										v-else-if="chunk.isVar"
										class="inline-flex items-center rounded-sm border border-primary/30 bg-primary/10 px-1 py-0.5 font-mono text-primary"
									>
										{{ chunk.text }}
									</span>
									<span v-else>{{ chunk.text }}</span>
								</template>
							</div>
						</div>

						<!-- Invalid Variable Breakdown & Suggestions -->
						<div class="flex flex-col gap-1.5">
							<span class="text-xs font-semibold text-muted-foreground">Detected Issues:</span>
							<div class="flex flex-col gap-1.5">
								<div
									v-for="(inv, vIdx) in issue.invalidVariables"
									:key="vIdx"
									class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/20 bg-background/60 px-2.5 py-1.5 text-xs"
								>
									<div class="flex items-center gap-2">
										<Badge variant="destructive" class="font-mono text-[11px]">
											{{ inv.raw }}
										</Badge>
										<span class="text-xs text-muted-foreground">{{ inv.reason }}</span>
									</div>

									<!-- Suggestions Pill -->
									<div v-if="inv.suggestions.length > 0" class="flex items-center gap-1">
										<span class="text-xs text-muted-foreground">Suggestion:</span>
										<div class="flex flex-wrap gap-1">
											<Badge
												v-for="sug in inv.suggestions"
												:key="sug"
												variant="secondary"
												class="
													cursor-pointer gap-1 border-emerald-500/20 bg-emerald-500/10 font-mono text-xs text-emerald-600
													hover:bg-emerald-500/20
													dark:text-emerald-400
												"
												title="Click to copy variable"
												@click="copySuggestion(sug)"
											>
												<Sparkles />
												{{ sug.startsWith('$') ? sug : `$(${sug})` }}
											</Badge>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- All Clear State -->
			<div v-else class="flex flex-col items-center justify-center gap-2 py-8 text-center">
				<div class="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
					<CheckCircle2 class="size-6" />
				</div>
				<h3 class="text-sm font-semibold text-foreground">
					All Templates Valid
				</h3>
				<p class="max-w-md text-xs text-muted-foreground">
					No invalid, broken, or outdated template variables were detected across your database and settings.
				</p>
			</div>

			<DialogFooter
				class="
					flex flex-wrap items-center justify-between gap-2
					sm:justify-between
				"
			>
				<div class="flex items-center gap-2">
					<Button
						v-if="resetableIssues.length > 1"
						variant="ghostDestructive"
						:disabled="isResettingAll || loading"
						@click="handleResetAll"
					>
						<RefreshCw :class="{ 'animate-spin': isResettingAll }" />
						{{ isResettingAll ? 'Processing...' : `Clean Up / Reset All (${resetableIssues.length})` }}
					</Button>
				</div>

				<Button variant="secondary" @click="isOpen = false">
					Close
				</Button>
			</DialogFooter>
		</DialogScrollContent>
	</Dialog>
</template>
