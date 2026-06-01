<script setup lang="ts">
import type { Template } from '~/types/commands'
import { useClipboard } from '@vueuse/core'
import { ChevronRight, HelpCircle, RefreshCw } from 'lucide-vue-next'
import { computed } from 'vue'

import { toast } from 'vue-sonner'

const props = defineProps<{
	template: Template
}>()

const emit = defineEmits(['reset'])
const templateText = defineModel<string | undefined>({ required: true })
const isExpanded = defineModel<boolean>('isExpanded', { default: false })

const { copy } = useClipboard()

function copyToClipboard(param: string) {
	copy(`\${${param}}`)
	toast.success(`Copied '\${${param}}' to clipboard!`)
}

function getTemplateSummary() {
	if (!templateText.value)
		return 'Empty template'
	return templateText.value.length > 55 ? `${templateText.value.substring(0, 55)}...` : templateText.value
}

function handleReset() {
	emit('reset')
}

const borderClass = computed(() => {
	const isModifiedState = (templateText.value ?? '') !== (props.template.custom !== null ? props.template.custom : props.template.default)
	if (isModifiedState) {
		return 'border-amber-500/70 dark:border-amber-500/60'
	}
	if (props.template.custom !== null) {
		return 'border-emerald-500/70 dark:border-emerald-500/60'
	}
	return 'border-muted-foreground/25 dark:border-muted/50'
})
</script>

<template>
	<Collapsible
		:open="isExpanded"
		@update:open="isExpanded = $event"
	>
		<Card :class="borderClass" class="gap-0 overflow-hidden p-0 transition-all duration-200">
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
						<ChevronRight class="size-4 text-primary transition-transform" :class="{ 'rotate-90': isExpanded }" />

						<div class="flex flex-col gap-0.5">
							<span class="font-mono text-xs font-bold">
								{{ props.template.id }}
							</span>
							<!-- Inline summary preview of template message -->
							<span
								v-if="!isExpanded" class="
									max-w-70 truncate text-xs text-muted-foreground
									sm:max-w-112.5
								"
							>
								"{{ getTemplateSummary() }}"
							</span>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<!-- Modified/Saved Badges -->
						<Badge
							v-if="(templateText ?? '') !== (props.template.custom !== null ? props.template.custom : props.template.default)"
							variant="outline"
							class="border-amber-500/20 bg-amber-500/10 text-amber-500"
						>
							Modified
						</Badge>
						<Badge
							v-else-if="props.template.custom !== null"
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
							v-if="!isExpanded && (templateText ?? '') !== props.template.default"
							variant="destructive"
							size="sm"
							@click.stop="handleReset"
						>
							<RefreshCw data-icon="inline-start" />
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
						v-model="templateText"
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
								<span v-if="props.template.params.length === 0" class="text-xs text-muted-foreground italic select-none">None defined (Static text output)</span>
								<Badge
									v-for="param in props.template.params"
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
								:disabled="(templateText ?? '') === props.template.default"
								@click="handleReset"
							>
								<RefreshCw data-icon="inline-start" />
								Reset to Default Value
							</Button>
						</div>
					</div>
				</CardContent>
			</CollapsibleContent>
		</Card>
	</Collapsible>
</template>
