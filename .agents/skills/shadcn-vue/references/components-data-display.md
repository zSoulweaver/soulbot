---
name: components-data-display
description: Card, Table, Avatar, Item, Empty, Badge, Kbd, Label, Typography, Spinner, and Skeleton components.
---

# Data Display Components

## Card

```bash
npx shadcn-vue@latest add card
```

```vue
<script setup lang="ts">
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Card Title</CardTitle>
      <CardDescription>Card Description</CardDescription>
    </CardHeader>
    <CardContent>
      <p>Card Content</p>
    </CardContent>
    <CardFooter>
      <p>Card Footer</p>
    </CardFooter>
  </Card>
</template>
```

## Table

```bash
npx shadcn-vue@latest add table
```

```vue
<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
</script>

<template>
  <Table>
    <TableCaption>A list of your recent invoices.</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead class="w-[100px]">Invoice</TableHead>
        <TableHead>Status</TableHead>
        <TableHead class="text-right">Amount</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell class="font-medium">INV001</TableCell>
        <TableCell>Paid</TableCell>
        <TableCell class="text-right">$250.00</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
```

## Avatar

```bash
npx shadcn-vue@latest add avatar
```

Built on Reka UI Avatar.

```vue
<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
</script>

<template>
  <Avatar>
    <AvatarImage src="https://github.com/unovue.png" alt="@unovue" />
    <AvatarFallback>CN</AvatarFallback>
  </Avatar>
</template>
```

## Item

```bash
npx shadcn-vue@latest add item
```

Flexible container for lists, cards, and content items.

```vue
<script setup lang="ts">
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
</script>

<template>
  <Item>
    <ItemMedia variant="icon">
      <HomeIcon />
    </ItemMedia>
    <ItemContent>
      <ItemTitle>Dashboard</ItemTitle>
      <ItemDescription>Overview of your account.</ItemDescription>
    </ItemContent>
  </Item>
</template>
```

### ItemMedia variants

- `variant="icon"` - For icons
- `variant="avatar"` - For avatars
- `variant="image"` - For images

### ItemGroup

```vue
<ItemGroup>
  <Item v-for="item in items" :key="item.id">
    <!-- ... -->
  </Item>
</ItemGroup>
```

### As Link

```vue
<Item as-child>
  <a href="/dashboard">
    <ItemMedia variant="icon"><HomeIcon /></ItemMedia>
    <ItemContent><ItemTitle>Dashboard</ItemTitle></ItemContent>
  </a>
</Item>
```

## Empty

```bash
npx shadcn-vue@latest add empty
```

Empty state component.

```vue
<script setup lang="ts">
import { Empty, EmptyContent, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
</script>

<template>
  <Empty>
    <EmptyMedia variant="icon">
      <InboxIcon />
    </EmptyMedia>
    <EmptyTitle>No messages</EmptyTitle>
    <EmptyDescription>You don't have any messages yet.</EmptyDescription>
    <EmptyContent>
      <Button>Send a message</Button>
    </EmptyContent>
  </Empty>
</template>
```

## Badge

```bash
npx shadcn-vue@latest add badge
```

```vue
<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
</script>

<template>
  <Badge>Badge</Badge>
  <Badge variant="secondary">Secondary</Badge>
  <Badge variant="outline">Outline</Badge>
  <Badge variant="destructive">Destructive</Badge>
</template>
```

Variants: `default`, `secondary`, `outline`, `destructive`.

## Kbd

```bash
npx shadcn-vue@latest add kbd
```

Keyboard key display.

```vue
<script setup lang="ts">
import { Kbd, KbdGroup } from '@/components/ui/kbd'
</script>

<template>
  <Kbd>Ctrl</Kbd>

  <KbdGroup>
    <Kbd>Ctrl</Kbd>
    <Kbd>B</Kbd>
  </KbdGroup>
</template>
```

## Label

```bash
npx shadcn-vue@latest add label
```

Built on Reka UI Label.

```vue
<script setup lang="ts">
import { Label } from '@/components/ui/label'
</script>

<template>
  <Label for="email">Your email address</Label>
</template>
```

## Typography

```bash
npx shadcn-vue@latest add typography
```

Styled typography primitives for headings and text.

## Spinner

```bash
npx shadcn-vue@latest add spinner
```

```vue
<script setup lang="ts">
import { Spinner } from '@/components/ui/spinner'
</script>

<template>
  <Spinner />
  <Button disabled>
    <Spinner class="mr-2" />
    Loading...
  </Button>
</template>
```

## Skeleton

```bash
npx shadcn-vue@latest add skeleton
```

```vue
<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
</script>

<template>
  <div class="flex items-center space-x-4">
    <Skeleton class="h-12 w-12 rounded-full" />
    <div class="space-y-2">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
    </div>
  </div>
</template>
```

## Progress

```bash
npx shadcn-vue@latest add progress
```

Built on Reka UI Progress.

```vue
<script setup lang="ts">
import { Progress } from '@/components/ui/progress'
</script>

<template>
  <Progress :model-value="33" />
</template>
```

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/card
- https://www.shadcn-vue.com/docs/components/table
- https://www.shadcn-vue.com/docs/components/avatar
- https://www.shadcn-vue.com/docs/components/item
- https://www.shadcn-vue.com/docs/components/empty
- https://www.shadcn-vue.com/docs/components/badge
- https://www.shadcn-vue.com/docs/components/kbd
- https://www.shadcn-vue.com/docs/components/label
- https://www.shadcn-vue.com/docs/components/spinner
- https://www.shadcn-vue.com/docs/components/skeleton
- https://www.shadcn-vue.com/docs/components/progress
-->
