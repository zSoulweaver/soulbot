<script setup lang="ts">
import type { Template } from '~/types/commands'
import { AlertTriangle, ChevronRight, RefreshCw } from '@lucide/vue'
import { computed } from 'vue'
import TemplateEditor from '~/components/templates/TemplateEditor.vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
import { validateTemplate } from '~/composables/useTemplateValidator'

const props = defineProps<{
	template: Template
}>()

const emit = defineEmits(['reset'])
const templateText = defineModel<string | undefined>({ required: true })
const isExpanded = defineModel<boolean>('isExpanded', { default: false })

function getTemplateSummary() {
	if (!templateText.value)
		return 'Empty template'
	return templateText.value.length > 55 ? `${templateText.value.substring(0, 55)}...` : templateText.value
}

function handleReset() {
	emit('reset')
}

const customVariables = computed(() => {
	if (!props.template.params)
		return []
	return props.template.params.map(p => ({
		name: p.name,
		label: p.label || p.name,
		description: p.description || '',
		example: p.example ?? p.name,
	}))
})

const templateValidation = computed(() => {
	return validateTemplate(templateText.value || '', {
		customVariables: customVariables.value,
		includeGlobal: true,
	})
})
const hasInvalidVariables = computed(() => !templateValidation.value.isValid)

const borderClass = computed(() => {
	if (hasInvalidVariables.value) {
		return 'border-destructive/70 dark:border-destructive/60'
	}
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
						<!-- Warning Badge for Invalid Variables -->
						<Badge
							v-if="hasInvalidVariables"
							variant="destructive"
						>
							<AlertTriangle class="size-3" />
							Invalid Variable
						</Badge>

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
					<TemplateEditor
						v-model="templateText"
						:custom-variables="customVariables"
						:reply-to="true"
						placeholder="Enter response template message..."
					/>
				</CardContent>
			</CollapsibleContent>
		</Card>
	</Collapsible>
</template>
