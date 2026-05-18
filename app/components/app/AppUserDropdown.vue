<script setup lang="ts">
import { LogOut, MoreVertical } from 'lucide-vue-next'
import { Avatar, AvatarFallback, AvatarImage } from '~~/app/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~~/app/components/ui/dropdown-menu'

const { user, clear } = useUserSession()

const initials = computed(() => {
	const name = user.value?.displayName || user.value?.username
	if (!name)
		return '??'
	return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
})

async function handleSignOut() {
	await clear()
	navigateTo('/')
}
</script>

<template>
	<div v-if="user" class="flex items-center gap-3">
		<DropdownMenu>
			<DropdownMenuTrigger as-child>
				<button
					class="
						flex w-full items-center gap-3 rounded-md p-1 text-left transition-colors outline-none
						hover:bg-sidebar-accent
					"
				>
					<Avatar class="size-8 border">
						<AvatarImage :src="user.image || ''" :alt="user.displayName || user.username || ''" />
						<AvatarFallback>{{ initials }}</AvatarFallback>
					</Avatar>
					<div class="flex flex-1 flex-col text-sm/tight">
						<span class="truncate font-semibold">{{ user.displayName || user.username }}</span>
						<span class="truncate text-xs text-muted-foreground capitalize">{{ user.role }}</span>
					</div>
					<MoreVertical class="size-4 text-muted-foreground" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" class="w-56">
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					class="
						cursor-pointer text-destructive
						focus:text-destructive
					" @click="handleSignOut"
				>
					<LogOut class="mr-2 size-4" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
</template>
