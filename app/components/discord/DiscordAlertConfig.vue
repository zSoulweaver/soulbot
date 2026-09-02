<script setup lang="ts">
import { Bell, BellOff, Hash, Keyboard } from '@lucide/vue'
import { ref } from 'vue'
import TemplateEditor from '~/components/templates/TemplateEditor.vue'
import { Button } from '~/components/ui/button'
import { ConfigAccordion } from '~/components/ui/config-accordion'
import { Field, FieldGroup, FieldLabel } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'
import { Switch } from '~/components/ui/switch'

const props = defineProps<{
	title: string
	description: string
	scope: string
	channels: { id: string, name: string }[]
	disabled?: boolean
}>()

// Bindings
const alertEnabled = defineModel<boolean>('alertEnabled', { required: true })
const alertChannelId = defineModel<string>('alertChannelId', { required: true })
const alertTemplate = defineModel<string>('alertTemplate', { required: true })

const showManualInput = ref(false)
const isExpanded = ref(false)

function onToggleAlert(val: boolean) {
	if (props.disabled)
		return
	isExpanded.value = val
}
</script>

<template>
	<ConfigAccordion
		v-model="isExpanded"
		:title="props.title"
		:description="props.description"
	>
		<template #icon>
			<Bell
				v-if="alertEnabled && !props.disabled"
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
			<Switch
				v-model:model-value="alertEnabled"
				:disabled="props.disabled"
				@update:model-value="onToggleAlert"
			/>
		</template>

		<div class="flex flex-col gap-6 pt-2">
			<!-- Settings Group for Channel Selection -->
			<SettingsGroup>
				<!-- Target Text Channel Picker -->
				<SettingsGroupItem class="sm:flex-col sm:items-start sm:gap-2">
					<div class="flex w-full items-center justify-between">
						<SettingsGroupContent>
							<SettingsGroupLabel>Discord Channel</SettingsGroupLabel>
							<SettingsGroupDescription>
								The text channel where alert announcements will be published.
							</SettingsGroupDescription>
						</SettingsGroupContent>
						<Button
							variant="ghost"
							size="sm"
							class="h-7 text-xs text-muted-foreground"
							@click="showManualInput = !showManualInput"
						>
							<Hash v-if="showManualInput" class="mr-1 size-3" />
							<Keyboard v-else class="mr-1 size-3" />
							{{ showManualInput ? 'Select from list' : 'Enter ID manually' }}
						</Button>
					</div>

					<SettingsGroupAction
						class="
							w-full
							sm:max-w-none
						"
					>
						<div class="w-full">
							<!-- Channel Dropdown -->
							<Select
								v-if="!showManualInput && props.channels.length > 0"
								v-model="alertChannelId"
								:disabled="props.disabled"
							>
								<SelectTrigger class="w-full">
									<SelectValue placeholder="Select target Discord channel" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem
										v-for="ch in props.channels"
										:key="ch.id"
										:value="ch.id"
									>
										#{{ ch.name }} ({{ ch.id }})
									</SelectItem>
								</SelectContent>
							</Select>

							<!-- Manual Text Field Fallback -->
							<div v-else class="flex w-full flex-col gap-1">
								<Input
									:id="`${props.title}-channel`"
									v-model="alertChannelId"
									placeholder="Enter text channel ID (e.g. 123456789...)"
									class="w-full"
								/>
							</div>
						</div>
					</SettingsGroupAction>
				</SettingsGroupItem>
				<slot name="extra-options" />
			</SettingsGroup>

			<!-- Message Template Editor -->
			<div class="flex flex-col gap-3">
				<FieldGroup>
					<Field>
						<FieldLabel :for="`${props.title}-template`">
							Discord Announcement Message
						</FieldLabel>
						<TemplateEditor
							v-model="alertTemplate"
							:scope="props.scope"
							:disabled="props.disabled || !alertEnabled"
							preview-mode="discord"
							placeholder="Type Discord message here..."
						/>
					</Field>
				</FieldGroup>
			</div>
		</div>
	</ConfigAccordion>
</template>
