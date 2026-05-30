<script setup lang="ts">
const permission = defineModel<string>({ default: 'everyone' })
</script>

<template>
	<Field>
		<FieldLabel for="permission-level">
			Required Permission Level
		</FieldLabel>
		<Select v-model="permission">
			<SelectTrigger id="permission-level" class="w-full">
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
		<FieldDescription>Select the minimum chat badge role required to execute this trigger.</FieldDescription>
	</Field>
</template>
