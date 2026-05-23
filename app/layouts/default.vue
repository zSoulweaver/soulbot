<script setup lang="ts">
const { data: status } = await useFetch<any>('/api/bot/status')

const showOutdatedAlert = computed(() => status.value?.isStreamerTokenOutdated)
</script>

<template>
	<SidebarProvider>
		<AppSidebar />
		<SidebarInset>
			<header
				class="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear"
			>
				<div class="flex w-full items-center gap-2">
					<SidebarTrigger class="-ml-1" />
					<Separator orientation="vertical" class="mr-2 h-8!" />

					<AppBreadcrumbs />

					<div class="ml-auto flex items-center gap-4">
						<AppBotStatus />
						<AppThemeSwitcherButton />
					</div>
				</div>
			</header>
			<main class="flex flex-1 flex-col gap-4 p-4">
				<Alert
					v-if="showOutdatedAlert"
					variant="destructive"
					class="flex animate-in items-center justify-between gap-4 p-4 duration-300 fade-in slide-in-from-top"
				>
					<div class="flex flex-1 flex-col gap-0.5">
						<AlertTitle class="font-bold tracking-tight">
							Twitch Permissions Out of Date
						</AlertTitle>
						<AlertDescription class="text-xs font-medium text-destructive/80">
							Soulbot has new watch-time payout capabilities that require additional broadcaster permissions. Please re-authenticate now.
						</AlertDescription>
					</div>
					<Button
						variant="destructive"
						size="sm"
						as="a"
						href="/setup"
						class="shrink-0 font-semibold"
					>
						Upgrade Permissions
					</Button>
				</Alert>
				<slot />
			</main>
		</SidebarInset>
	</SidebarProvider>
</template>
