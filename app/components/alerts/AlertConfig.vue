<script setup lang="ts">
import { Bell, BellOff, PiggyBank } from '@lucide/vue'
import { ref, watch } from 'vue'
import TemplateEditor from '~/components/templates/TemplateEditor.vue'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ConfigAccordion } from '~/components/ui/config-accordion'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '~/components/ui/item'
import { Label } from '~/components/ui/label'
import { NumberField, NumberFieldContent, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput } from '~/components/ui/number-field'
import { Switch } from '~/components/ui/switch'

const props = withDefaults(
	defineProps<{
		title: string
		description: string
		scope: string
		pointsLabel?: string
		hidePoints?: boolean
	}>(),
	{
		hidePoints: false,
	},
)

// Separate v-models for clean bindings
const alertEnabled = defineModel<boolean>('alertEnabled', { required: true })
const alertTemplate = defineModel<string>('alertTemplate', { required: true })
const pointsEnabled = defineModel<boolean>('pointsEnabled', { default: false })
const pointsReward = defineModel<number>('pointsReward', { default: 0 })

const isExpanded = ref(false)

// Auto-expand accordion if settings are enabled
watch(
	[alertEnabled, pointsEnabled],
	([newAlert, newPoints]) => {
		if (newAlert || newPoints) {
			isExpanded.value = true
		}
	},
	{ immediate: true },
)

function toggleMaster(enabled: boolean) {
	alertEnabled.value = enabled
	if (!props.hidePoints) {
		pointsEnabled.value = enabled
	}
}
</script>

<template>
	<ConfigAccordion
		v-model:is-expanded="isExpanded"
		:title="props.title"
		:description="props.description"
	>
		<template #badge>
			<Badge
				v-if="alertEnabled || (!props.hidePoints && pointsEnabled)"
				variant="outline"
				class="
					border-emerald-500/25 bg-emerald-500/10 text-emerald-600
					dark:text-emerald-400
				"
			>
				Active
			</Badge>
			<Badge
				v-else
				variant="outline"
				class="border-muted-foreground/20 text-muted-foreground"
			>
				Disabled
			</Badge>
		</template>

		<template #header-actions>
			<div class="flex items-center gap-1">
				<Button
					v-if="alertEnabled || (!props.hidePoints && pointsEnabled)"
					variant="ghost"
					size="sm"
					class="
						h-8 gap-1.5 text-xs text-muted-foreground
						hover:text-foreground
					"
					@click.stop="toggleMaster(false)"
				>
					<BellOff class="size-3.5" />
					Disable All
				</Button>
				<Button
					v-else
					variant="ghost"
					size="sm"
					class="
						h-8 gap-1.5 text-xs text-muted-foreground
						hover:text-foreground
					"
					@click.stop="toggleMaster(true)"
				>
					<Bell class="size-3.5" />
					Enable All
				</Button>
			</div>
		</template>

		<div class="flex flex-col gap-6 pt-2">
			<!-- Points Reward Settings -->
			<div v-if="!props.hidePoints" class="flex flex-col gap-4 border-b border-border/50 pb-6">
				<Item class="border-none bg-transparent px-0 py-2 shadow-none">
					<ItemContent>
						<ItemTitle class="flex items-center gap-2">
							<PiggyBank class="size-4 text-muted-foreground" />
							Reward Points
						</ItemTitle>
						<ItemDescription>
							Automatically grant channel currency to the chatter for this event.
						</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Switch v-model:model-value="pointsEnabled" />
					</ItemActions>
				</Item>

				<div v-if="pointsEnabled" class="flex animate-in flex-col gap-3 pt-2 duration-200 fade-in slide-in-from-top-2">
					<Label :for="`${props.title}-points`">
						{{ props.pointsLabel || 'Points Reward Amount' }}
					</Label>
					<NumberField :id="`${props.title}-points`" v-model="pointsReward" :min="0" class="w-full" :default-value="0">
						<NumberFieldContent>
							<NumberFieldDecrement />
							<NumberFieldInput />
							<NumberFieldIncrement />
						</NumberFieldContent>
					</NumberField>
					<p class="text-xs text-muted-foreground">
						Set the number of points to be credited to the chatter's balance.
					</p>
				</div>
			</div>

			<!-- Chat Alert Settings -->
			<div class="flex flex-col gap-4">
				<Item class="border-none bg-transparent px-0 py-2 shadow-none">
					<ItemContent>
						<ItemTitle class="flex items-center gap-2">
							<Bell class="size-4 text-muted-foreground" />
							Chat Message Alert
						</ItemTitle>
						<ItemDescription>
							Post an announcement in chat when this event triggers.
						</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Switch v-model:model-value="alertEnabled" />
					</ItemActions>
				</Item>

				<div v-if="alertEnabled" class="flex animate-in flex-col gap-3 pt-2 duration-200 fade-in slide-in-from-top-2">
					<Label :for="`${props.title}-template`">
						Chat Announcement Message
					</Label>
					<TemplateEditor
						v-model="alertTemplate"
						:scope="props.scope"
						placeholder="Type alert message here..."
					/>
				</div>
			</div>
		</div>
	</ConfigAccordion>
</template>
