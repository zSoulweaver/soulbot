<script setup lang="ts">
import { Shield } from 'lucide-vue-next'

const props = defineProps<{
	permission: string
}>()

function getPermissionBadgeClass(permission: string) {
	const perm = permission.toLowerCase()
	if (perm === 'caster' || perm === 'broadcaster') {
		return 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
	}
	if (perm === 'moderator' || perm === 'mod') {
		return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
	}
	if (perm === 'vip') {
		return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
	}
	if (perm === 'subscriber' || perm === 'sub') {
		return 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
	}
	return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
}
</script>

<template>
	<Badge :class="getPermissionBadgeClass(props.permission)" class="font-medium capitalize select-none">
		<Shield class="mr-1 size-3.5" />
		{{ props.permission }}
	</Badge>
</template>
