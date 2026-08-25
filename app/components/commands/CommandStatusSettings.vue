<script setup lang="ts">
import {
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'
import { Switch } from '~/components/ui/switch'

const props = withDefaults(defineProps<{
	enableLabel?: string
	showWhispers?: boolean
}>(), {
	enableLabel: 'Enable Trigger',
	showWhispers: true,
})

const enabled = defineModel<boolean>('enabled', { default: true })
const allowWhisper = defineModel<boolean>('allowWhisper', { default: false })
const whisperSilentResponse = defineModel<boolean>('whisperSilentResponse', { default: false })
const hidden = defineModel<boolean>('hidden', { default: false })
</script>

<template>
	<SettingsGroupItem>
		<SettingsGroupContent>
			<SettingsGroupLabel>{{ props.enableLabel }}</SettingsGroupLabel>
			<SettingsGroupDescription>Toggle command activation state in chat.</SettingsGroupDescription>
		</SettingsGroupContent>
		<SettingsGroupAction>
			<Switch v-model:model-value="enabled" />
		</SettingsGroupAction>
	</SettingsGroupItem>

	<template v-if="props.showWhispers">
		<SettingsGroupItem>
			<SettingsGroupContent>
				<SettingsGroupLabel>Allow in Whispers</SettingsGroupLabel>
				<SettingsGroupDescription>Allow this command to be triggered via private whisper to the bot.</SettingsGroupDescription>
			</SettingsGroupContent>
			<SettingsGroupAction>
				<Switch v-model:model-value="allowWhisper" />
			</SettingsGroupAction>
		</SettingsGroupItem>

		<SettingsGroupItem v-if="allowWhisper">
			<SettingsGroupContent>
				<SettingsGroupLabel>Suppress Response When Whispered</SettingsGroupLabel>
				<SettingsGroupDescription class="text-wrap">
					Execute whispered commands silently without sending any confirmation response to chat.
					<span
						class="
							mt-1 block text-xs font-medium text-amber-500
							dark:text-amber-400
						"
					>
						Warning: With this enabled, there will be no chat output or confirmation when the command runs.
					</span>
				</SettingsGroupDescription>
			</SettingsGroupContent>
			<SettingsGroupAction>
				<Switch v-model:model-value="whisperSilentResponse" />
			</SettingsGroupAction>
		</SettingsGroupItem>
	</template>

	<SettingsGroupItem>
		<SettingsGroupContent>
			<SettingsGroupLabel>Hide from Directory</SettingsGroupLabel>
			<SettingsGroupDescription>Hide this command from the public commands directory page for viewers.</SettingsGroupDescription>
		</SettingsGroupContent>
		<SettingsGroupAction>
			<Switch v-model:model-value="hidden" />
		</SettingsGroupAction>
	</SettingsGroupItem>
</template>
