<script setup lang="ts">
import type { NavGroup } from '~/config/navigation'
import { ChevronRight } from 'lucide-vue-next'

defineProps<{
	group: NavGroup
}>()
</script>

<template>
	<SidebarGroup>
		<SidebarGroupLabel v-if="group.label">{{ group.label }}</SidebarGroupLabel>
		<SidebarGroupContent>
			<SidebarMenu>
				<SidebarMenuItem v-for="item in group.items" :key="item.title">
					<Collapsible v-if="item.items && item.items.length > 0" as-child class="group/collapsible">
						<SidebarMenuItem>
							<CollapsibleTrigger as-child>
								<SidebarMenuButton :tooltip="item.title">
									<component :is="item.icon" v-if="item.icon" />
									<span>{{ item.title }}</span>
									<ChevronRight
										class="
											ml-auto transition-transform duration-200
											group-data-[state=open]/collapsible:rotate-90
										"
									/>
								</SidebarMenuButton>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<SidebarMenuSub>
									<SidebarMenuSubItem v-for="subItem in item.items" :key="subItem.title">
										<SidebarMenuSubButton as-child>
											<NuxtLink :to="subItem.url">
												<span>{{ subItem.title }}</span>
											</NuxtLink>
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
								</SidebarMenuSub>
							</CollapsibleContent>
						</SidebarMenuItem>
					</Collapsible>

					<SidebarMenuButton v-else as-child :tooltip="item.title">
						<NuxtLink :to="item.url">
							<component :is="item.icon" v-if="item.icon" />
							<span>{{ item.title }}</span>
						</NuxtLink>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarGroupContent>
	</SidebarGroup>
</template>
