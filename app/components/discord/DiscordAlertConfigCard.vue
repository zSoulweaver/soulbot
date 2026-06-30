<script setup lang="ts">
import { Bell, Hash, HelpCircle, Keyboard } from '@lucide/vue'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import {
	SettingsGroup,
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'

const props = defineProps<{
	title: string
	description: string
	variables: string[]
	channels: { id: string, name: string }[]
	disabled?: boolean
}>()

// Bindings
const alertEnabled = defineModel<boolean>('alertEnabled', { required: true })
const alertChannelId = defineModel<string>('alertChannelId', { required: true })
const alertTemplate = defineModel<string>('alertTemplate', { required: true })

const showManualInput = ref(false)

function copyVariable(variable: string) {
	const token = variable.split(' ')[0] || variable
	navigator.clipboard.writeText(token)
	toast.success(`Copied ${token} to clipboard!`)
}
</script>

<template>
	<div class="flex flex-col gap-4">
		<!-- Section Header -->
		<div class="flex flex-col gap-1">
			<h3 class="flex items-center gap-2 text-lg font-semibold">
				<Bell class="size-5 text-muted-foreground" />
				{{ props.title }}
			</h3>
			<p class="text-sm text-muted-foreground">
				{{ props.description }}
			</p>
		</div>

		<!-- Options Group -->
		<SettingsGroup>
			<!-- Toggle -->
			<SettingsGroupItem>
				<SettingsGroupContent>
					<SettingsGroupLabel>Send Discord Alert</SettingsGroupLabel>
					<SettingsGroupDescription>
						Post an announcement in Discord when this event triggers.
					</SettingsGroupDescription>
				</SettingsGroupContent>
				<SettingsGroupAction>
					<Switch
						v-model:model-value="alertEnabled"
						:disabled="props.disabled"
					/>
				</SettingsGroupAction>
			</SettingsGroupItem>

			<!-- Target Channel selector -->
			<SettingsGroupItem v-if="alertEnabled && !props.disabled">
				<SettingsGroupContent>
					<SettingsGroupLabel>Target Channel</SettingsGroupLabel>
					<SettingsGroupDescription>
						Select or enter the text channel where the alert will be posted.
					</SettingsGroupDescription>
				</SettingsGroupContent>
				<SettingsGroupAction
					class="
						w-full
						sm:w-80
					"
				>
					<div class="flex w-full flex-col gap-2">
						<div class="flex items-center justify-end">
							<Button
								:disabled="props.channels.length === 0"
								variant="ghost"
								size="sm"
								class="
									px-2 text-xs text-muted-foreground
									hover:text-foreground
								"
								@click="showManualInput = !showManualInput"
							>
								<component :is="showManualInput ? Hash : Keyboard" class="mr-1 size-3" />
								{{ showManualInput ? 'Select from list' : 'Enter ID manually' }}
							</Button>
						</div>

						<!-- Channel Select Selector -->
						<Select
							v-if="props.channels.length > 0 && !showManualInput"
							v-model="alertChannelId"
						>
							<SelectTrigger :id="`${props.title}-channel`" class="w-full">
								<SelectValue placeholder="Select a text channel..." />
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
		</SettingsGroup>

		<!-- Message Template Editor -->
		<div v-if="alertEnabled && !props.disabled" class="flex animate-in flex-col gap-3 duration-200 fade-in slide-in-from-top-2">
			<FieldGroup>
				<Field>
					<FieldLabel :for="`${props.title}-template`">
						Discord Announcement Message
					</FieldLabel>
					<Textarea
						:id="`${props.title}-template`"
						v-model="alertTemplate"
						class="min-h-24 w-full"
						placeholder="Type alert message here..."
					/>

					<!-- Dynamic variables -->
					<div class="flex flex-col gap-2 pt-2">
						<div class="flex items-center gap-1 text-xs text-muted-foreground">
							<HelpCircle class="size-3.5" />
							<span>Available dynamic variables (click to copy):</span>
						</div>
						<div class="flex flex-wrap gap-1.5">
							<Badge
								v-for="variable in props.variables"
								:key="variable"
								variant="secondary"
								class="
									cursor-pointer font-mono transition-all select-none
									hover:bg-primary hover:text-primary-foreground
								"
								@click="copyVariable(variable)"
							>
								{{ variable }}
							</Badge>
						</div>
					</div>
				</Field>
			</FieldGroup>
		</div>
	</div>
</template>
