---
name: components-layout
description: Accordion, Collapsible, Separator, AspectRatio, Resizable, ScrollArea, Carousel, Alert, and Toast/Sonner components.
---

# Layout & Feedback Components

## Accordion

```bash
npx shadcn-vue@latest add accordion
```

Built on Reka UI Accordion.

```vue
<script setup lang="ts">
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
</script>

<template>
  <Accordion type="single" collapsible>
    <AccordionItem value="item-1">
      <AccordionTrigger>Is it accessible?</AccordionTrigger>
      <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-2">
      <AccordionTrigger>Is it styled?</AccordionTrigger>
      <AccordionContent>Yes. It comes with default styles.</AccordionContent>
    </AccordionItem>
  </Accordion>
</template>
```

Props: `type` (`single`, `multiple`), `collapsible` (boolean), `default-value`.

## Collapsible

```bash
npx shadcn-vue@latest add collapsible
```

Built on Reka UI Collapsible.

```vue
<script setup lang="ts">
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
</script>

<template>
  <Collapsible>
    <CollapsibleTrigger as-child>
      <Button variant="ghost" size="sm">Toggle</Button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div class="rounded-md border px-4 py-3">Content</div>
    </CollapsibleContent>
  </Collapsible>
</template>
```

## Separator

```bash
npx shadcn-vue@latest add separator
```

Built on Reka UI Separator.

```vue
<script setup lang="ts">
import { Separator } from '@/components/ui/separator'
</script>

<template>
  <Separator />
  <Separator orientation="vertical" />
</template>
```

## AspectRatio

```bash
npx shadcn-vue@latest add aspect-ratio
```

Built on Reka UI AspectRatio.

```vue
<script setup lang="ts">
import { AspectRatio } from '@/components/ui/aspect-ratio'
</script>

<template>
  <AspectRatio :ratio="16 / 9">
    <img src="..." alt="Photo" class="rounded-md object-cover h-full w-full" />
  </AspectRatio>
</template>
```

## Resizable

```bash
npx shadcn-vue@latest add resizable
```

Built on Reka UI Splitter.

```vue
<script setup lang="ts">
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
</script>

<template>
  <ResizablePanelGroup direction="horizontal">
    <ResizablePanel>One</ResizablePanel>
    <ResizableHandle />
    <ResizablePanel>Two</ResizablePanel>
  </ResizablePanelGroup>
</template>
```

Use `with-handle` prop on `ResizableHandle` to show a visible drag handle.

## ScrollArea

```bash
npx shadcn-vue@latest add scroll-area
```

Built on Reka UI ScrollArea.

```vue
<script setup lang="ts">
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
</script>

<template>
  <ScrollArea class="h-72 w-48 rounded-md border">
    <div class="p-4">
      <!-- Long content -->
    </div>
  </ScrollArea>

  <!-- Horizontal scroll -->
  <ScrollArea class="w-96 whitespace-nowrap rounded-md border">
    <div class="flex w-max space-x-4 p-4">
      <!-- Horizontal content -->
    </div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
</template>
```

## Carousel

```bash
npx shadcn-vue@latest add carousel
```

Built on `embla-carousel-vue`.

```vue
<script setup lang="ts">
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
</script>

<template>
  <Carousel class="w-full max-w-xs">
    <CarouselContent>
      <CarouselItem v-for="i in 5" :key="i">
        <div class="p-1">
          <Card>
            <CardContent class="flex aspect-square items-center justify-center p-6">
              <span class="text-4xl font-semibold">{{ i }}</span>
            </CardContent>
          </Card>
        </div>
      </CarouselItem>
    </CarouselContent>
    <CarouselPrevious />
    <CarouselNext />
  </Carousel>
</template>
```

Options via `:opts` prop: `align`, `loop`, etc. Supports vertical with `orientation="vertical"`.

## Alert

```bash
npx shadcn-vue@latest add alert
```

```vue
<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
</script>

<template>
  <Alert>
    <Terminal class="h-4 w-4" />
    <AlertTitle>Heads up!</AlertTitle>
    <AlertDescription>You can add components to your app.</AlertDescription>
  </Alert>

  <Alert variant="destructive">
    <AlertCircle class="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>Something went wrong.</AlertDescription>
  </Alert>
</template>
```

Variants: `default`, `destructive`.

## Sonner (Toast)

```bash
npx shadcn-vue@latest add sonner
```

Toast notifications using the `vue-sonner` library.

### Setup

Add `<Toaster />` to your root layout:

```vue
<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
  <Toaster />
  <RouterView />
</template>
```

### Usage

```vue
<script setup lang="ts">
import { toast } from 'vue-sonner'
</script>

<template>
  <Button @click="toast('Event has been created')">
    Show Toast
  </Button>
</template>
```

```ts
// Different toast types
toast('Default toast')
toast.success('Success!')
toast.error('Error!')
toast.warning('Warning!')
toast.info('Info!')
toast.loading('Loading...')

// With description
toast('Event created', {
  description: 'Sunday, December 03, 2023 at 9:00 AM',
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo'),
  },
})
```

## Toast (Legacy)

```bash
npx shadcn-vue@latest add toast
```

The original toast component using `useToast` composable. Sonner is recommended for new projects.

```vue
<script setup lang="ts">
import { useToast } from '@/components/ui/toast/use-toast'
import { Toaster } from '@/components/ui/toast'

const { toast } = useToast()
</script>

<template>
  <Toaster />
  <Button @click="toast({ title: 'Scheduled', description: 'Friday, February 10, 2023 at 5:57 PM' })">
    Add to calendar
  </Button>
</template>
```

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/accordion
- https://www.shadcn-vue.com/docs/components/collapsible
- https://www.shadcn-vue.com/docs/components/separator
- https://www.shadcn-vue.com/docs/components/aspect-ratio
- https://www.shadcn-vue.com/docs/components/resizable
- https://www.shadcn-vue.com/docs/components/scroll-area
- https://www.shadcn-vue.com/docs/components/carousel
- https://www.shadcn-vue.com/docs/components/alert
- https://www.shadcn-vue.com/docs/components/sonner
- https://www.shadcn-vue.com/docs/components/toast
-->
