<script setup lang="ts">
import { Bot } from 'lucide-vue-next'
import { TwitchIcon } from 'vue3-simple-icons'
import { navigation } from '~/config/navigation'

const { loggedIn, user } = useUserSession()

const filteredNavigation = computed(() => {
	const userRole = user.value?.role || 'viewer'
	return navigation.map(group => ({
		...group,
		items: group.items.filter(item => !item.roles || item.roles.includes(userRole)),
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
					<AppUserDropdown v-if="loggedIn" />
					<SidebarMenuButton
						v-else
						size="lg"
						class="
							bg-purple-600 text-white
							hover:bg-purple-700
						"
						as-child
					>
						<a href="/api/auth/twitch">
							<div class="flex size-8 items-center justify-center rounded-lg bg-white/20">
								<TwitchIcon class="size-4" />
							</div>
							<span
								class="
									ml-2
									group-data-[collapsible=icon]:hidden
								"
							>Log in with Twitch</span>
						</a>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarFooter>
		<SidebarRail />
	</Sidebar>
</template>
