<script setup lang="ts">
import {
	SettingsGroupAction,
	SettingsGroupContent,
	SettingsGroupDescription,
	SettingsGroupItem,
	SettingsGroupLabel,
} from '~/components/ui/settings-group'

const permission = defineModel<string>({ default: 'everyone' })
</script>

<template>
	<SettingsGroupItem>
		<SettingsGroupContent>
			<SettingsGroupLabel>
				Required Permission Level
			</SettingsGroupLabel>
			<SettingsGroupDescription>Select the minimum chat badge role required to execute this trigger.</SettingsGroupDescription>
		</SettingsGroupContent>
		<SettingsGroupAction>
			<Select v-model="permission">
				<SelectTrigger class="w-full">
					<SelectValue placeholder="Select Permission Level" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="everyone">
						Everyone
					</SelectItem>
					<SelectItem value="subscriber">
						Subscriber
					</SelectItem>
					<SelectItem value="vip">
						VIP
					</SelectItem>
					<SelectItem value="moderator">
						Moderator
					</SelectItem>
					<SelectItem value="broadcaster">
						Broadcaster
					</SelectItem>
				</SelectContent>
			</Select>
		</SettingsGroupAction>
	</SettingsGroupItem>
</template>
