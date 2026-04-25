---
name: components-navigation
description: Breadcrumb, NavigationMenu, Tabs, Pagination, and Stepper navigation components.
---

# Navigation Components

## Breadcrumb

```bash
npx shadcn-vue@latest add breadcrumb
```

```vue
<script setup lang="ts">
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
</script>

<template>
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink href="/">Home</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink href="/components">Components</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
</template>
```

Use `BreadcrumbEllipsis` for collapsed items and `DropdownMenu` for expandable sections.

## NavigationMenu

```bash
npx shadcn-vue@latest add navigation-menu
```

Built on Reka UI NavigationMenu.

```vue
<script setup lang="ts">
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
</script>

<template>
  <NavigationMenu>
    <NavigationMenuList>
      <NavigationMenuItem>
        <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
        <NavigationMenuContent>
          <ul class="grid gap-3 p-6 md:w-[400px]">
            <li>
              <NavigationMenuLink as-child>
                <a href="/docs">Introduction</a>
              </NavigationMenuLink>
            </li>
          </ul>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
          <a href="/docs">Documentation</a>
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
</template>
```

## Tabs

```bash
npx shadcn-vue@latest add tabs
```

Built on Reka UI Tabs.

```vue
<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
</script>

<template>
  <Tabs default-value="account" class="w-[400px]">
    <TabsList>
      <TabsTrigger value="account">Account</TabsTrigger>
      <TabsTrigger value="password">Password</TabsTrigger>
    </TabsList>
    <TabsContent value="account">
      <p>Make changes to your account here.</p>
    </TabsContent>
    <TabsContent value="password">
      <p>Change your password here.</p>
    </TabsContent>
  </Tabs>
</template>
```

## Pagination

```bash
npx shadcn-vue@latest add pagination
```

Built on Reka UI Pagination.

```vue
<script setup lang="ts">
import {
  Pagination,
  PaginationEllipsis,
  PaginationFirst,
  PaginationLast,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
} from '@/components/ui/pagination'
</script>

<template>
  <Pagination v-slot="{ page }" :total="100" :sibling-count="1" show-edges :default-page="2">
    <PaginationList v-slot="{ items }" class="flex items-center gap-1">
      <PaginationFirst />
      <PaginationPrev />
      <template v-for="(item, index) in items">
        <PaginationListItem v-if="item.type === 'page'" :key="index" :value="item.value" as-child>
          <Button class="w-10 h-10 p-0" :variant="item.value === page ? 'default' : 'outline'">
            {{ item.value }}
          </Button>
        </PaginationListItem>
        <PaginationEllipsis v-else :key="item.type" :index="index" />
      </template>
      <PaginationNext />
      <PaginationLast />
    </PaginationList>
  </Pagination>
</template>
```

## Stepper

```bash
npx shadcn-vue@latest add stepper
```

Built on Reka UI Stepper.

```vue
<script setup lang="ts">
import { Stepper, StepperDescription, StepperIndicator, StepperItem, StepperSeparator, StepperTitle, StepperTrigger } from '@/components/ui/stepper'
</script>

<template>
  <Stepper>
    <StepperItem :step="1">
      <StepperTrigger>
        <StepperIndicator />
        <div class="flex flex-col">
          <StepperTitle>Step 1</StepperTitle>
          <StepperDescription>Description</StepperDescription>
        </div>
      </StepperTrigger>
      <StepperSeparator />
    </StepperItem>
  </Stepper>
</template>
```

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/breadcrumb
- https://www.shadcn-vue.com/docs/components/navigation-menu
- https://www.shadcn-vue.com/docs/components/tabs
- https://www.shadcn-vue.com/docs/components/pagination
- https://www.shadcn-vue.com/docs/components/stepper
-->
