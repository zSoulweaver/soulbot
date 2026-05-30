<script setup lang="ts">
import { Clock, User } from 'lucide-vue-next'

const props = defineProps<{
	global: number
	user: number
}>()
</script>

<template>
	<div class="flex flex-col gap-0.5 text-xs text-muted-foreground select-none">
		<span class="flex items-center gap-1">
			<Clock class="size-3 text-muted-foreground" />
			Global: {{ props.global > 0 ? `${props.global}s` : 'None' }}
		</span>
		<span class="flex items-center gap-1">
			<User class="size-3 text-muted-foreground" />
			User: {{ props.user > 0 ? `${props.user}s` : 'None' }}
		</span>
	</div>
</template>
