<script setup lang="ts">
import type { UserRole } from '~/config/navigation'
import { Bot, ChevronUp } from 'lucide-vue-next'
import { TwitchIcon } from 'vue3-simple-icons'
import { navigation } from '~/config/navigation'

const currentUser = ref({
	isLoggedIn: true,
	name: 'SoulbotAdmin',
	avatarUrl: 'https://github.com/shadcn.png',
	role: 'caster' as UserRole,
})

const filteredNavigation = computed(() => {
	return navigation.map(group => ({
		...group,
		items: group.items.filter(item => !item.roles || item.roles.includes(currentUser.value.role)),
	})).filter(group => group.items.length > 0)
})
</script>

<template>
	<Sidebar collapsible="icon">
		<SidebarHeader class="flex h-16 items-center justify-center border-b">
			<div class="flex items-center gap-2 px-4">
				<Bot
					class="
						size-6
						group-data-[collapsible=icon]:block
					"
				/>
				<span
					class="
						truncate text-xl font-bold tracking-tight
						group-data-[collapsible=icon]:hidden
					"
				>Soulbot</span>
			</div>
		</SidebarHeader>
		<SidebarContent>
			<AppSidebarNavGroup v-for="group in filteredNavigation" :key="group.label" :group="group" />
		</SidebarContent>

		<SidebarFooter>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu v-if="currentUser.isLoggedIn">
						<DropdownMenuTrigger as-child>
							<SidebarMenuButton
								size="lg"
								class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								<Avatar class="size-8 rounded-lg">
									<AvatarImage :src="currentUser.avatarUrl" :alt="currentUser.name" />
									<AvatarFallback class="rounded-lg">
										{{ currentUser.name.charAt(0) }}
									</AvatarFallback>
								</Avatar>
								<div
									class="
										grid flex-1 text-left text-sm/tight
										group-data-[collapsible=icon]:hidden
									"
								>
									<span class="truncate font-semibold">{{ currentUser.name }}</span>
									<span class="truncate text-xs text-muted-foreground">{{ currentUser.role }}</span>
								</div>
								<ChevronUp
									class="
										ml-auto size-4
										group-data-[collapsible=icon]:hidden
									"
								/>
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							class="w-(--reka-popper-anchor-width) min-w-56 rounded-lg"
							side="bottom"
							align="end"
							:side-offset="4"
						>
							<DropdownMenuLabel class="p-0 font-normal">
								<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									<Avatar class="size-8 rounded-lg">
										<AvatarImage :src="currentUser.avatarUrl" :alt="currentUser.name" />
										<AvatarFallback class="rounded-lg">
											{{ currentUser.name.charAt(0) }}
										</AvatarFallback>
									</Avatar>
									<div class="grid flex-1 text-left text-sm/tight">
										<span class="truncate font-semibold">{{ currentUser.name }}</span>
										<span class="truncate text-xs text-muted-foreground">{{ currentUser.role }}</span>
									</div>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								Account settings
							</DropdownMenuItem>
							<DropdownMenuItem>
								Log out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<SidebarMenuButton
						v-else size="lg" class="
							bg-purple-600 text-white
							hover:bg-purple-700
						"
					>
						<div
							class="flex size-8 items-center justify-center rounded-lg bg-white/20"
						>
							<TwitchIcon class="size-4" />
						</div>
						<span
							class="
								ml-2
								group-data-[collapsible=icon]:hidden
							"
						>Log in with Twitch</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarFooter>
		<SidebarRail />
	</Sidebar>
</template>
