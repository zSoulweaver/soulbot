---
name: features-charts
description: Chart components using Unovis with ChartConfig, tooltips, legends, and theming.
---

# Charts with Unovis

```bash
npx shadcn-vue@latest add chart
```

## Dependencies

```bash
npm install @unovis/ts @unovis/vue
```

## Custom Components

- `ChartContainer` - Wrapper that applies chart config styling
- `ChartTooltip` - Tooltip container
- `ChartTooltipContent` - Tooltip content renderer
- `ChartCrosshair` - Crosshair with tooltip integration
- `ChartLegendContent` - Legend display
- `componentToString` - Utility to convert components to Unovis template strings

```ts
import type { ChartConfig } from '@/components/ui/chart'
import {
  ChartContainer,
  ChartCrosshair,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart'
```

## Chart Config

Defines labels, icons, and colors for chart series:

```ts
import type { ChartConfig } from '@/components/ui/chart'
import { Monitor } from 'lucide-vue-next'

const chartConfig = {
  desktop: {
    label: 'Desktop',
    icon: Monitor,
    color: 'var(--chart-1)',
  },
  mobile: {
    label: 'Mobile',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig
```

Alternatively, use a `theme` object for light/dark:

```ts
{
  desktop: {
    label: 'Desktop',
    theme: {
      light: 'var(--chart-1)',
      dark: 'var(--chart-2)',
    },
  },
}
```

## Bar Chart Example

```vue
<script setup lang="ts">
import type { ChartConfig } from '@/components/ui/chart'
import { VisAxis, VisGroupedBar, VisXYContainer } from '@unovis/vue'
import {
  ChartContainer, ChartCrosshair, ChartTooltip, ChartTooltipContent, componentToString,
} from '@/components/ui/chart'

const chartData = [
  { date: new Date('2024-01-01'), desktop: 186, mobile: 80 },
  { date: new Date('2024-02-01'), desktop: 305, mobile: 200 },
  { date: new Date('2024-03-01'), desktop: 237, mobile: 120 },
]
type Data = (typeof chartData)[number]

const chartConfig = {
  desktop: { label: 'Desktop', color: 'var(--chart-1)' },
  mobile: { label: 'Mobile', color: 'var(--chart-2)' },
} satisfies ChartConfig
</script>

<template>
  <ChartContainer :config="chartConfig" class="min-h-[400px] w-full">
    <VisXYContainer :data="chartData">
      <VisGroupedBar
        :x="(d: Data) => d.date"
        :y="[(d: Data) => d.desktop, (d: Data) => d.mobile]"
        :color="[chartConfig.desktop.color, chartConfig.mobile.color]"
      />
      <VisAxis type="x" :x="(d: Data) => d.date"
        :tick-format="(d: number) => new Date(d).toLocaleDateString('en-US', { month: 'short' })"
        :tick-values="chartData.map(d => d.date)"
        :tick-line="false" :domain-line="false" />
      <VisAxis type="y" :tick-format="() => ''" :tick-line="false" :domain-line="false" :grid-line="true" />
      <ChartTooltip />
      <ChartCrosshair :template="componentToString(chartConfig, ChartTooltipContent)" />
    </VisXYContainer>
    <ChartLegendContent />
  </ChartContainer>
</template>
```

## Tooltip Customization

```vue
<ChartCrosshair
  :template="componentToString(chartConfig, ChartTooltipContent, {
    labelKey: 'visitors',
    nameKey: 'browser',
    hideLabel: false,
    hideIndicator: false,
    indicator: 'dot',
    labelFormatter(d) {
      return new Date(d).toLocaleDateString('en-US', { month: 'long' })
    },
  })"
/>
```

### ChartTooltipContent Props

| Prop | Type | Description |
|------|------|-------------|
| `labelKey` | `string` | Config/data key for tooltip label |
| `nameKey` | `string` | Config/data key for tooltip name |
| `indicator` | `'dot'` \| `'line'` \| `'dashed'` | Indicator style |
| `hideLabel` | `boolean` | Hide the label |
| `hideIndicator` | `boolean` | Hide the indicator |

## Color Reference

Use `var(--color-KEY)` format in Unovis components:

```vue
<VisGroupedBar color="var(--color-desktop)" />
```

Or in data:

```ts
const chartData = [
  { browser: 'chrome', visitors: 275, fill: 'var(--color-chrome)' },
]
```

## CSS Variables for Charts

```css
:root {
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
}
```

<!--
Source references:
- https://www.shadcn-vue.com/docs/components/chart
-->
