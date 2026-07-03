<script setup lang="ts">
import { navigation } from '~/config/navigation'

const route = useRoute()

const breadcrumbs = computed(() => {
	const path = route.path
	const crumbs: { title: string, url?: string }[] = []

	// Gather all navigation items that match the active path
	const matches: { group: any, item: any }[] = []
	for (const group of navigation) {
		for (const item of group.items) {
			const segments = item.url.split('/')
			const basePrefix = segments.length > 3 ? segments.slice(0, 3).join('/') : item.url

			const matchesUrl = path === item.url
				|| path.startsWith(`${item.url}/`)
				|| (basePrefix !== '/admin' && path.startsWith(`${basePrefix}/`))

			const matchesSub = item.items?.some((subItem: any) => path === subItem.url || path.startsWith(`${subItem.url}/`))
			if (matchesUrl || matchesSub) {
				matches.push({ group, item })
			}
		}
	}

	// Sort to find the best match (the most specific/longest URL prefix)
	const bestMatch = matches.sort((a, b) => b.item.url.length - a.item.url.length)[0]
	if (bestMatch) {
		const { group, item } = bestMatch

		if (group.label) {
			crumbs.push({
				title: group.label,
				url: group.label === 'Bot Administration' ? '/admin' : undefined,
			})
		}
		crumbs.push({ title: item.title, url: item.url })

		// Check for an exact nested sub-item match
		const subItem = item.items?.find((subItem: any) => path === subItem.url)
		if (subItem) {
			crumbs.push({ title: subItem.title, url: subItem.url })
		}
		else if (path !== item.url) {
			// Dynamic subpage segment fallback (e.g. /admin/commands/123)
			const subSegments = path.replace(item.url, '').split('/').filter(Boolean)
			const lastSegment = subSegments[subSegments.length - 1] || ''
			if (lastSegment) {
				crumbs.push({
					title: lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' '),
					url: path,
				})
			}
		}
		return crumbs
	}

	// Fallback
	return [{ title: 'Home', url: '/' }]
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
