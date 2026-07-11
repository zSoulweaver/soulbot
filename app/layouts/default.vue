<script setup lang="ts">
const { loggedIn, user } = useUserSession()
const isModeratorOrCaster = computed(() => {
	return loggedIn.value && (user.value?.role === 'caster' || user.value?.role === 'moderator')
})
</script>

<template>
	<SidebarProvider>
		<AppSidebar />
		<SidebarInset>
			<header
				class="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/40 px-4 backdrop-blur-md transition-[width,height] ease-linear"
			>
				<div class="flex w-full items-center gap-2">
					<SidebarTrigger class="-ml-1" />
					<Separator orientation="vertical" class="mr-2 h-8!" />

					<AppBreadcrumbs />

					<div class="ml-auto flex items-center gap-4">
						<AppBotStatus v-if="isModeratorOrCaster" />
						<AppThemeSwitcherButton />
					</div>
				</div>
			</header>
			<main class="flex flex-1 flex-col gap-4">
				<div
					class="
						mx-8 mt-6 hidden animate-in flex-col gap-2 duration-300 fade-in slide-in-from-top
						has-[*]:flex
					"
				>
					<AppOutdatedTokenAlert />
					<AppBotModeratorAlert />
				</div>
				<slot />
			</main>
		</SidebarInset>
	</SidebarProvider>
</template>
