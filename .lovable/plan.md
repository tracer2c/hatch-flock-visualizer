## Recommended variant: **Section subheadings** (full-width sidebar)

A ~260px sidebar grouped by category subheadings (uppercase, muted). Each row shows icon + label; groups with sub-pages expand inline. Footer pinned to bottom for Support + Settings + user card.

Why not the others:
- **Simple / Dual-tier** — flat lists don't scale to 10+ items cleanly.
- **Slim** — what I built. Labels hidden behind hover; heavy for a data app.
- **Section dividers** — same as subheadings but with hairlines only; subheadings read better with our count.

### Structure

```text
┌──────────────────────────┐
│  Logo · Hatch Flock      │
│  [Search]                │
├──────────────────────────┤
│ MONITOR                  │
│   Dashboard              │
│   Multi-Stage            │
│   Single-Stage           │
│   Timeline               │
│                          │
│ DATA                     │
│   Data Entry        ▸    │
│   Data Sheet             │
│                          │
│ QUALITY                  │
│   QA Hub            ▸    │
│   Daily Tasks            │
│                          │
│ INTELLIGENCE             │
│   Smart Analytics        │
│                          │
│ ADMIN                    │
│   Management        ▸    │
├──────────────────────────┤
│  Support                 │
│  Settings                │
│  ── user card ──         │
└──────────────────────────┘
```

Expanders (`▸`) reveal sub-items inline (indented, no fly-out panel):
- **Data Entry**: Weekly Rollup, Egg Pack, Fertility, Residue, Clears & Injected
- **QA Hub**: Temps, Angles, Humidity, Rectal, Wash, Culls, Gravity, Hatch
- **Management**: Hatcheries, Machines, Flocks, Users, Reports, Targets

Expander auto-opens when a child route is active; user toggle persists in `localStorage`.

### Styling (mapped to our tokens)

- Bg: `bg-sidebar`, border `border-sidebar-border/50`
- Subheadings: `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-4 pb-1`
- Row: `h-9 px-3 rounded-lg gap-3 text-sm`, hover `bg-sidebar-accent`
- Active: `bg-primary/10 text-primary font-medium` with 2px primary left indicator
- Sub-row: indent `pl-9`, same active treatment
- Icon size: `h-4 w-4`
- Width: `260px` desktop; `collapsible="offcanvas"` on mobile (unchanged)

### Files to change

1. **`src/components/ModernSidebar.tsx`** — rewrite. Replace slim rail with:
   - Grouped `NAV_GROUPS` config: `{ heading, items: NavItem[] }[]`
   - `NavItem` supports optional `items` for sub-pages; renders as `<Collapsible>` (shadcn) when present
   - Uses shadcn `Sidebar` + `SidebarContent` + `SidebarGroup` + `SidebarGroupLabel` + `SidebarMenu` primitives (they already implement subheadings)
   - Footer via `SidebarFooter` with Support, Settings, and a compact user card (avatar + name + email)
   - Reset `--sidebar-width` to `260px`
   - Permissions: hide items whose `featureKey` fails `hasFeatureAccess`; hide a group if all its items are hidden

2. **`src/App.tsx`** — no route changes. Only remove the earlier `--sidebar-width: 68px` override if we set it (we did on the Sidebar element, so it's contained in the component).

3. **`src/components/TopBar.tsx`** — no changes; breadcrumbs stay in page body as agreed last turn.

### Out of scope

- No route or permission changes.
- No featured card (upgrade CTA / progress card) — can add later if you want one of the UUI featured cards in the footer.
- Mobile behavior unchanged (offcanvas drawer with the same grouped layout).

### Verification

- Typecheck clean.
- Click each group with sub-items; confirm expand/collapse and active highlight for both parent and child routes (`/qa-hub?tab=angles`, `/data-entry/residue`, `/management/users`).
- Verify staff / restricted role sees only permitted groups; empty groups don't render their heading.
