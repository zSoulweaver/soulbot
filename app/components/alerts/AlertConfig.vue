<script setup lang="ts">
import { Bell, BellOff, MessageSquare, PiggyBank } from '@lucide/vue'
import { ref, watch } from 'vue'
import TemplateEditor from '~/components/templates/TemplateEditor.vue'
import { Badge } from '~/components/ui/badge'
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

// Auto-expand/collapse accordion logic based on toggles
watch(
	[alertEnabled, pointsEnabled],
	([newAlert, newPoints], [oldAlert, oldPoints]) => {
		if (oldAlert !== undefined && oldPoints !== undefined) {
			if (newAlert || newPoints) {
				isExpanded.value = true
			}
			else if (!newAlert && !newPoints) {
				isExpanded.value = false
			}
		}
	},
	{ immediate: false },
)
</script>

<template>
	<ConfigAccordion
		v-model="isExpanded"
		:title="props.title"
		:description="props.description"
	>
		<template #icon>
			<Bell
				v-if="alertEnabled || (!props.hidePoints && pointsEnabled)"
				class="size-5 text-primary transition-colors"
			/>
			<BellOff
				v-else
				class="
					size-5 text-muted-foreground transition-colors
					group-hover:text-primary
				"
			/>
		</template>

		<template #header-action>
			<!-- Right-aligned Status Badges -->
			<div class="flex items-center gap-2 select-none">
				<!-- Points Badge -->
				<template v-if="!props.hidePoints">
					<Badge
						v-if="pointsEnabled"
						variant="secondary"
						class="
							gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-600
							dark:text-emerald-400
						"
					>
						<PiggyBank class="size-3" />
						+{{ pointsReward }} points
					</Badge>
					<Badge
						v-else
						variant="secondary"
						class="gap-1 opacity-40"
					>
						<PiggyBank class="size-3" />
						Points disabled
					</Badge>
				</template>

				<!-- Chat Alert Badge -->
				<Badge
					v-if="alertEnabled"
					variant="secondary"
					class="gap-1 border-primary/20 bg-primary/10 text-primary"
				>
					<MessageSquare class="size-3" />
					Chat alert
				</Badge>
				<Badge
					v-else
					variant="secondary"
					class="gap-1 opacity-40"
				>
					<MessageSquare class="size-3" />
					Chat disabled
				</Badge>
			</div>
		</template>

		<!-- Two column grid for Points vs Chat configuration -->
		<div
			class="
				grid grid-cols-1 gap-8 pt-2
				xl:gap-12
			"
			:class="{ 'xl:grid-cols-2': !props.hidePoints }"
		>
			<!-- Points Reward Settings -->
			<div v-if="!props.hidePoints" class="flex flex-col gap-4">
				<Item class="border-none bg-transparent px-0 py-2 shadow-none">
					<ItemContent>
						<ItemTitle class="flex items-center gap-2">
							<PiggyBank class="size-4 text-muted-foreground" />
							Reward Points
						</ItemTitle>
						<ItemDescription>
							Reward viewers with loyalty points on this event.
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
