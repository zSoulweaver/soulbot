<script setup lang="ts">
import { LogOut, MoreVertical } from 'lucide-vue-next'
import { Avatar, AvatarFallback, AvatarImage } from '~~/app/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~~/app/components/ui/dropdown-menu'
import { useSidebar } from '../ui/sidebar'

const { user, clear } = useUserSession()
const { isMobile } = useSidebar()

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
				<SidebarMenuButton
					size="lg"
					class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<Avatar class="size-8">
						<AvatarImage :src="user.image || ''" :alt="user.displayName || user.username" />
						<AvatarFallback>{{ initials }}</AvatarFallback>
					</Avatar>
					<div class="grid flex-1 text-left text-sm/tight">
						<span class="truncate font-medium">{{ user.displayName || user.username }}</span>
						<span class="truncate text-xs text-muted-foreground capitalize">{{ user.role }}</span>
					</div>
					<MoreVertical class="size-4 text-muted-foreground" />
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				class="w-(--reka-dropdown-menu-trigger-width) min-w-56 rounded-lg"
				:side="isMobile ? 'bottom' : 'right'"
				align="end"
				:side-offset="4"
			>
				<DropdownMenuItem
					variant="destructive"
					@click="handleSignOut"
				>
					<LogOut class="mr-2 size-4" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
</template>
