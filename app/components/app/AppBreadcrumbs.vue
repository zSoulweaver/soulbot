<script setup lang="ts">
import { navigation } from '~/config/navigation'

const route = useRoute()

const breadcrumbs = computed(() => {
	const path = route.path
	const crumbs: { title: string, url?: string }[] = []

	const matches: { group: any, item: any }[] = []
	for (const group of navigation) {
		for (const item of group.items) {
			if (path === item.url || path.startsWith(`${item.url}/`)) {
				matches.push({ group, item })
			}
		}
	}

	if (matches.length > 0) {
		const best = matches.sort((a, b) => b.item.url.length - a.item.url.length)[0]
		if (best) {
			const { group, item } = best

			if (group.label) {
				crumbs.push({ title: group.label })
			}

			crumbs.push({ title: item.title, url: item.url })

			// Check sub-items
			if (item.items) {
				const subItem = item.items.find((si: any) => path === si.url)
				if (subItem) {
					crumbs.push({ title: subItem.title, url: subItem.url })
				}
				else if (path !== item.url) {
					const subPath = path.replace(item.url, '').split('/').filter(Boolean)
					if (subPath.length > 0) {
						const lastSegment = subPath[subPath.length - 1] || ''
						crumbs.push({
							title: lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ') : 'Unknown',
							url: path,
						})
					}
				}
			}
			return crumbs
		}
	}

	// Fallback
	return [{ title: 'Soulbot', url: '/' }]
})
</script>

<template>
	<Breadcrumb>
		<BreadcrumbList>
			<template v-for="(crumb, index) in breadcrumbs" :key="crumb.title">
				<BreadcrumbItem :class="{ 'hidden md:block': index === 0 && breadcrumbs.length > 1 }">
					<BreadcrumbLink
						v-if="crumb.url && crumb.url !== route.path && index < breadcrumbs.length - 1"
						as-child
					>
						<NuxtLink :to="crumb.url">
							{{ crumb.title }}
						</NuxtLink>
					</BreadcrumbLink>
					<BreadcrumbPage v-else>
						{{ crumb.title }}
					</BreadcrumbPage>
				</BreadcrumbItem>
				<BreadcrumbSeparator
					v-if="index < breadcrumbs.length - 1"
					:class="{ 'hidden md:block': index === 0 && breadcrumbs.length > 1 }"
				/>
			</template>
		</BreadcrumbList>
	</Breadcrumb>
</template>
