<script setup lang="ts">
import { Shield } from 'lucide-vue-next'

const props = defineProps<{
	permission: string
}>()

function getPermissionBadgeClass(permission: string) {
	const perm = permission.toLowerCase()
	if (perm === 'caster' || perm === 'broadcaster') {
		return 'text-rose-600 bg-rose-50 border border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20'
	}
	if (perm === 'moderator' || perm === 'mod') {
		return 'text-indigo-600 bg-indigo-50 border border-indigo-200 dark:text-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500/20'
	}
	if (perm === 'vip') {
		return 'text-amber-600 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20'
	}
	if (perm === 'subscriber' || perm === 'sub') {
		return 'text-sky-600 bg-sky-50 border border-sky-200 dark:text-sky-400 dark:bg-sky-500/10 dark:border-sky-500/20'
	}
	return 'text-emerald-600 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20'
}
</script>

<template>
	<Badge :class="getPermissionBadgeClass(props.permission)" class="font-medium capitalize select-none">
		<Shield class="mr-1 size-3.5" />
		{{ props.permission }}
	</Badge>
</template>
