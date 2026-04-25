---
name: components-overlay
description: Dialog, AlertDialog, Sheet, Drawer, Popover, HoverCard, and Tooltip overlay components.
---

# Overlay Components

## Dialog

```bash
npx shadcn-vue@latest add dialog
```

Built on Reka UI Dialog.

```vue
<script setup lang="ts">
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <Button variant="outline">Edit Profile</Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>
          Make changes to your profile here.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <!-- Form content -->
      </div>
      <DialogFooter>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
```

Use `DialogScrollContent` for dialogs with scrollable content.

## AlertDialog

```bash
npx shadcn-vue@latest add alert-dialog
```

Built on Reka UI AlertDialog.

```vue
<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
</script>

<template>
  <AlertDialog>
    <AlertDialogTrigger as-child>
      <Button variant="outline">Delete</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction>Continue</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
```

## Sheet

```bash
npx shadcn-vue@latest add sheet
```

A slide-out panel (drawer from the edge of the screen). Built on Reka UI Dialog.

```vue
<script setup lang="ts">
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
</script>

<template>
  <Sheet>
    <SheetTrigger as-child>
      <Button variant="outline">Open</Button>
    </SheetTrigger>
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Edit profile</SheetTitle>
        <SheetDescription>Make changes to your profile.</SheetDescription>
      </SheetHeader>
      <!-- Content -->
      <SheetFooter>
        <SheetClose as-child>
          <Button type="submit">Save changes</Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
```

`SheetContent` side prop: `top`, `right` (default), `bottom`, `left`.

## Drawer

```bash
npx shadcn-vue@latest add drawer
```

A mobile-friendly bottom drawer. Built on `vaul-vue`.

```vue
<script setup lang="ts">
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
</script>

<template>
  <Drawer>
    <DrawerTrigger as-child>
      <Button variant="outline">Open Drawer</Button>
    </DrawerTrigger>
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Move Goal</DrawerTitle>
        <DrawerDescription>Set your daily activity goal.</DrawerDescription>
      </DrawerHeader>
      <!-- Content -->
      <DrawerFooter>
        <Button>Submit</Button>
        <DrawerClose as-child>
          <Button variant="outline">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>
```

### Responsive Dialog (Desktop Dialog + Mobile Drawer)

Combine Dialog and Drawer based on screen size:

```vue
<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
const isDesktop = useMediaQuery('(min-width: 768px)')
</script>

<template>
  <Dialog v-if="isDesktop" v-model:open="open">
    <!-- Desktop dialog content -->
  </Dialog>
  <Drawer v-else v-model:open="open">
    <!-- Mobile drawer content -->
  </Drawer>
</template>
```

## Popover

```bash
npx shadcn-vue@latest add popover
```

Built on Reka UI Popover.

```vue
<script setup lang="ts">
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline">Open popover</Button>
    </PopoverTrigger>
    <PopoverContent class="w-80">
      <div class="grid gap-4">
        <h4 class="font-medium leading-none">Dimensions</h4>
        <p class="text-sm text-muted-foreground">Set the dimensions.</p>
      </div>
    </PopoverContent>
  </Popover>
</template>
```

## HoverCard

```bash
npx shadcn-vue@latest add hover-card
```

Built on Reka UI HoverCard.

```vue
<script setup lang="ts">
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
</script>

<template>
  <HoverCard>
    <HoverCardTrigger as-child>
      <Button variant="link">@vue</Button>
    </HoverCardTrigger>
    <HoverCardContent class="w-80">
      <p>The Progressive JavaScript Framework</p>
    </HoverCardContent>
  </HoverCard>
</template>
```

## Tooltip

```bash
npx shadcn-vue@latest add tooltip
```

Built on Reka UI Tooltip.

```vue
<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="outline">Hover</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Add to library</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
```

Wrap your app with `<TooltipProvider>` once, then use `<Tooltip>` anywhere inside.

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/dialog
- https://www.shadcn-vue.com/docs/components/alert-dialog
- https://www.shadcn-vue.com/docs/components/sheet
- https://www.shadcn-vue.com/docs/components/drawer
- https://www.shadcn-vue.com/docs/components/popover
- https://www.shadcn-vue.com/docs/components/hover-card
- https://www.shadcn-vue.com/docs/components/tooltip
-->
