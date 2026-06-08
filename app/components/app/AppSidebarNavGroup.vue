<script setup lang="ts">
import type { NavGroup, NavItem } from '~/config/navigation'
import { ChevronRight } from 'lucide-vue-next'
import { ref, watch } from 'vue'

const props = defineProps<{
	group: NavGroup
}>()

const route = useRoute()

// Initialize open states for collapsible groups based on active sub-items
const openStates = ref<Record<string, boolean>>({})

function hasActiveSubItem(item: NavItem) {
	if (!item.items)
		return false
	return item.items.some(subItem => route.path === subItem.url)
}

props.group.items.forEach((item) => {
	if (item.items && item.items.length > 0) {
		openStates.value[item.title] = hasActiveSubItem(item)
	}
})

// Watch route changes to automatically expand the group containing the active sub-item
watch(
	() => route.path,
	() => {
		props.group.items.forEach((item) => {
			if (item.items && item.items.length > 0 && hasActiveSubItem(item)) {
				openStates.value[item.title] = true
			}
		})
	},
)
</script>

<template>
	<SidebarGroup>
		<SidebarGroupLabel v-if="group.label">
			{{ group.label }}
		</SidebarGroupLabel>
		<SidebarGroupContent>
			<SidebarMenu>
				<template v-for="item in group.items" :key="item.title">
					<Collapsible
						v-if="item.items && item.items.length > 0"
						v-model:open="openStates[item.title]"
						as-child
						class="group/collapsible"
					>
						<SidebarMenuItem>
							<CollapsibleTrigger as-child>
								<SidebarMenuButton :tooltip="item.title" :is-active="hasActiveSubItem(item)">
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
										<SidebarMenuSubButton as-child :is-active="route.path === subItem.url">
											<NuxtLink :to="subItem.url">
												<span>{{ subItem.title }}</span>
											</NuxtLink>
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
								</SidebarMenuSub>
							</CollapsibleContent>
						</SidebarMenuItem>
					</Collapsible>

					<SidebarMenuItem v-else>
						<SidebarMenuButton as-child :tooltip="item.title" :is-active="route.path === item.url">
							<NuxtLink :to="item.url">
								<component :is="item.icon" v-if="item.icon" />
								<span>{{ item.title }}</span>
							</NuxtLink>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</template>
			</SidebarMenu>
		</SidebarGroupContent>
	</SidebarGroup>
</template>
