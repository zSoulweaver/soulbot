# Settings Page Layout & Spacing

To maintain a cohesive design system, all administrative and settings panels must follow standard layout configurations, spacing parameters, and typographic hierarchies.

---

## Layout & Spacing Standards

### Grid Spacing

Settings views must use consistent gap constraints instead of ad-hoc margins or legacy `space-y-*`/`space-x-*` elements.

- **Main page content groups**: Use `flex flex-col gap-8` (with `<Separator />` components between major sections).
- **Header-to-fields spacing**: Use `flex flex-col gap-4`.
- **Field blocks & inputs grids**: Use `grid gap-4`.
- **Legacy class ban**: **Do not** use `space-x-*` or `space-y-*` classes on page templates or settings layout wrappers.

**Incorrect:**

```html
<div class="space-y-6">
  <div class="space-y-2">
    <h3>Title</h3>
    <p>desc</p>
  </div>
  <hr class="my-4" />
  <div class="grid grid-cols-2 space-x-4">
    <Input />
    <Input />
  </div>
</div>
```

**Correct:**

```html
<div class="flex flex-col gap-8">
  <div class="flex flex-col gap-4">
    <h3 class="flex items-center gap-2 text-lg font-semibold">Title</h3>
    <FieldGroup class="grid grid-cols-2 gap-4">
      <Field>...</Field>
      <Field>...</Field>
    </FieldGroup>
  </div>
  
  <Separator />
  
  <!-- Next section -->
</div>
```

---

## Section Typography & Headings

- Settings sub-section titles must always use: `<h3 class="flex items-center gap-2 text-lg font-semibold">`.
- Icons paired with sub-section headers should use `size-5` (or `size-4` for small sub-cards).

**Incorrect:**

```html
<h3 class="text-xl font-semibold">
  <Radio class="w-6 h-6" /> Settings
</h3>

<h3 class="text-base font-bold">
  <Sliders class="size-4" /> Parameters
</h3>
```

**Correct:**

```html
<h3 class="flex items-center gap-2 text-lg font-semibold">
  <Radio class="size-5 text-muted-foreground" /> Settings
</h3>
```

---

## Form Field Labels

`FieldLabel` components must inherit default style weights (`text-sm font-medium leading-none select-none`). **Do not** apply manual layout or typographic modifiers inline (e.g. `text-xs font-bold text-muted-foreground uppercase`) to keep label styling consistent across pages.

**Incorrect:**

```html
<FieldLabel for="minBet" class="text-xs font-bold text-muted-foreground uppercase">
  Minimum Bet
</FieldLabel>
```

**Correct:**

```html
<FieldLabel for="minBet">
  Minimum Bet
</FieldLabel>
```

---

## Toggle Options Layout

- **Standalone/Main Toggles**: Housed in a standalone card container using the generic `<Item variant="outline">` component.
- **Grouped Toggles**: Housed inside a `<SettingsGroup>` list container, with each setting row built using `<SettingsGroupItem>`.

**Correct Standalone Option:**

```html
<Item variant="outline">
  <ItemContent>
    <ItemTitle>Enable Service</ItemTitle>
    <ItemDescription>Toggle the main service state.</ItemDescription>
  </ItemContent>
  <ItemActions>
    <Switch v-model="form.enabled" />
  </ItemActions>
</Item>
```

**Correct Grouped Options:**

```html
<SettingsGroup>
  <SettingsGroupItem>
    <SettingsGroupContent>
      <SettingsGroupLabel>Followers Only</SettingsGroupLabel>
      <SettingsGroupDescription>Only allow followers to request.</SettingsGroupDescription>
    </SettingsGroupContent>
    <SettingsGroupAction>
      <Switch v-model="form.followersOnly" />
    </SettingsGroupAction>
  </SettingsGroupItem>
</SettingsGroup>
```
