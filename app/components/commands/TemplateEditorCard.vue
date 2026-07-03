<script setup lang="ts">
import type { Template } from '~/types/commands'
import { ChevronRight, HelpCircle, RefreshCw } from '@lucide/vue'
import { useClipboard } from '@vueuse/core'
import { computed, nextTick, ref } from 'vue'

import { toast } from 'vue-sonner'

const props = defineProps<{
	template: Template
}>()

const emit = defineEmits(['reset'])
const templateText = defineModel<string | undefined>({ required: true })
const isExpanded = defineModel<boolean>('isExpanded', { default: false })

const { copy } = useClipboard()
const textareaRef = ref<any | null>(null)

function handleParamClick(paramName: string) {
	const token = `$(${paramName})`

	// Copy to clipboard as requested
	copy(token)

	// Insert at textarea cursor position
	const el = textareaRef.value?.$el?.querySelector('textarea') || textareaRef.value?.$el || textareaRef.value
	if (el && typeof el.selectionStart === 'number') {
		const start = el.selectionStart
		const end = el.selectionEnd
		const text = templateText.value || ''
		templateText.value = text.substring(0, start) + token + text.substring(end)

		nextTick(() => {
			if (el) {
				el.focus()
				el.setSelectionRange(start + token.length, start + token.length)
			}
		})
		toast.success(`Copied & inserted '${token}' at cursor!`)
	}
	else {
		toast.success(`Copied '${token}' to clipboard!`)
	}
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

						<!-- Revert to Default Action (always visible in header when modified) -->
						<Button
							v-if="(templateText ?? '') !== props.template.default"
							variant="ghostDestructive"
							size="sm"
							@click.stop="handleReset"
						>
							<RefreshCw class="size-3.5 shrink-0" data-icon="inline-start" />
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
						ref="textareaRef"
						v-model="templateText"
						rows="3"
					/>

					<!-- Available parameters helper box (takes full width) -->
					<div class="flex flex-col gap-1.5 rounded-lg bg-muted p-3">
						<div class="flex items-center gap-1 text-xs font-semibold text-muted-foreground select-none">
							<HelpCircle class="size-3.5" />
							Available Parameters (Click to Copy & Insert):
						</div>
						<div class="mt-1 flex flex-col gap-2">
							<span v-if="props.template.params.length === 0" class="text-xs text-muted-foreground italic select-none">None defined (Static text output)</span>
							<template v-else>
								<div
									v-for="param in props.template.params"
									:key="param.name"
									class="flex items-start gap-2.5 text-xs text-muted-foreground"
								>
									<Badge
										variant="outline"
										class="
											cursor-pointer font-mono font-bold transition-colors select-none
											hover:bg-primary hover:text-primary-foreground
										"
										title="Click to copy parameter and insert at cursor"
										@click="handleParamClick(param.name)"
									>
										{{ `$(${param.name})` }}
									</Badge>
									<span class="pt-0.5 leading-normal">{{ param.description || 'Dynamic parameter for this template.' }}</span>
								</div>
							</template>
						</div>
					</div>
				</CardContent>
			</CollapsibleContent>
		</Card>
	</Collapsible>
</template>
