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
				<slot />
			</main>
		</SidebarInset>
	</SidebarProvider>
</template>
