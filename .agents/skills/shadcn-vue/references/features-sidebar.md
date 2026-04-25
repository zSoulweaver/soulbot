---
name: features-sidebar
description: Composable sidebar component system with collapsible states, menus, sub-menus, and theming.
---

# Sidebar

```bash
npx shadcn-vue@latest add sidebar
```

## Sub-components

- `SidebarProvider` - Context provider, handles collapsible state
- `Sidebar` - Main container
- `SidebarHeader` / `SidebarFooter` - Sticky top/bottom sections
- `SidebarContent` - Scrollable content area
- `SidebarGroup` / `SidebarGroupLabel` / `SidebarGroupContent` / `SidebarGroupAction` - Section grouping
- `SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton` / `SidebarMenuAction` / `SidebarMenuBadge` / `SidebarMenuSkeleton` - Menu system
- `SidebarMenuSub` - Submenu container
- `SidebarTrigger` - Toggle button
- `SidebarRail` - Hover-to-expand rail
- `SidebarInset` - Main content area wrapper
- `SidebarSeparator` - Divider

## Basic Structure

```vue
<script setup lang="ts">
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarRail, SidebarTrigger,
} from '@/components/ui/sidebar'
</script>

<template>
  <SidebarProvider>
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="item in items" :key="item.title">
                <SidebarMenuButton as-child>
                  <a :href="item.url">
                    <component :is="item.icon" />
                    <span>{{ item.title }}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2">
        <SidebarTrigger class="-ml-1" />
      </header>
      <div class="flex flex-1 flex-col gap-4 p-4">
        <!-- Main content -->
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
```

## Sidebar Props

- `side` - `"left"` (default) or `"right"`
- `variant` - `"sidebar"` (default), `"floating"`, `"inset"`
- `collapsible` - `"icon"` (collapse to icons) or `"offcanvas"` (slide off screen)

## SidebarProvider

- `default-open` / `open` / `@update:open` - Control open state
- `storage-key` - Persist state to localStorage
- Keyboard shortcut: `Cmd+B` / `Ctrl+B` to toggle

### Controlled

```vue
<script setup>
const open = ref(false)
</script>

<SidebarProvider :open="open" @update:open="open = $event">
  <!-- ... -->
</SidebarProvider>
```

## useSidebar Composable

```vue
<script setup lang="ts">
import { useSidebar } from '@/components/ui/sidebar'

const { state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar } = useSidebar()
</script>
```

## Menu Button

```vue
<!-- As link -->
<SidebarMenuButton as-child>
  <a href="/home"><Home /><span>Home</span></a>
</SidebarMenuButton>

<!-- Active state -->
<SidebarMenuButton :is-active="true">
  <Home /><span>Home</span>
</SidebarMenuButton>

<!-- Size -->
<SidebarMenuButton size="lg">...</SidebarMenuButton>
```

## Collapsible Menu

```vue
<SidebarMenuItem>
  <Collapsible default-open class="group/collapsible">
    <CollapsibleTrigger as-child>
      <SidebarMenuButton>
        <Home /><span>Home</span>
        <ChevronRight class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
      </SidebarMenuButton>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <SidebarMenuSub>
        <SidebarMenuItem>
          <SidebarMenuButton><span>History</span></SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenuSub>
    </CollapsibleContent>
  </Collapsible>
</SidebarMenuItem>
```

## Menu with Actions & Badges

```vue
<SidebarMenuItem>
  <SidebarMenuButton>
    <Home /><span>Home</span>
    <SidebarMenuBadge>24</SidebarMenuBadge>
  </SidebarMenuButton>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <SidebarMenuAction><MoreHorizontal /></SidebarMenuAction>
    </DropdownMenuTrigger>
    <DropdownMenuContent side="right" align="start">
      <DropdownMenuItem>Edit</DropdownMenuItem>
      <DropdownMenuItem>Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</SidebarMenuItem>
```

## Footer with User Menu

```vue
<SidebarFooter>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton>
            <User2 /> Username
            <ChevronUp class="ml-auto" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" class="w-(--reka-popper-anchor-width)">
          <DropdownMenuItem>Account</DropdownMenuItem>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarFooter>
```

## Theming

Sidebar uses dedicated CSS variables: `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring`.

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/sidebar
-->
