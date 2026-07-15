## Goal

Redesign `/` (DashboardHome) as an editorial, neo-brutalist **bento dashboard** where the user can add, remove, drag, and resize widgets. Layout persists per user. Only the dashboard page changes — sidebar, top nav, and data hooks stay as-is.

## Visual direction

- **Palette (new dashboard-scoped tokens, additive to brand):**
  - Ink `#0f0f10`, Cream `#f4f2ec`, Lime `#c8f169`, Lavender `#c9b8ff`, plus existing Royal Blue `#4169E1` and Hatcher Orange `#DD550C` used sparingly for status.
- **Type:** Swiss-inspired. Display = tight, oversized (clamp 3–6rem) for hero numbers; body stays existing sans. No new font files — use `font-black` + tight tracking on current stack, wired via a `.font-display` utility.
- **Cards:** thick 2px ink borders, 20–28px radius, offset hard shadows (`8px 8px 0 #0f0f10`), striped/hatched SVG fills for progress, oversized numerals, small ALL-CAPS labels.
- Dark ink hero tile with lime accent (mirrors reference "Compliance pulse"). Lavender + lime alternating accent tiles. Cream page background.

## Architecture

### 1. Widget registry
`src/components/dashboard/bento/widgets/registry.ts`
- Each widget = `{ id, title, icon, defaultSize {w,h}, minSize, category, Component }`.
- v1 widgets:
  - `eggs-hero` — oversized total eggs + sparkline (uses existing rollup hook)
  - `metric-fertility`, `metric-hatch`, `metric-hoi` — big-number tiles with mini area chart
  - `houses-pipeline` — striped progress for setter/hatcher/completed (from `useHousesData`)
  - `qa-alerts` — high-contrast alert stack (from `useCriticalAlerts`)
  - `weekly-flock-status` — 4 tiles (total / complete / missing / critical)

### 2. Grid engine
- Add `react-grid-layout` (single dep). Wrap in `BentoGrid.tsx` with 12-col responsive breakpoints, 120px row height, ink gutters.
- Drag handle = card header; resize handle = bottom-right corner (styled brutalist notch).

### 3. Layout persistence
- New table `user_dashboard_layouts (user_id uuid pk, layout jsonb, widgets jsonb, updated_at)` with RLS `auth.uid() = user_id` + required `GRANT`s.
- Hook `useDashboardLayout()` — load on mount, debounced save on change. Fallback to a sensible default layout if none exists.

### 4. Edit mode
- "Customize" toggle in dashboard header → enables drag/resize, reveals remove (×) on each widget and an **"+ Add widget"** button opening a sheet listing registry widgets not yet on the board.
- "Reset layout" and "Done" buttons.

### 5. Files

**New**
- `src/components/dashboard/bento/BentoDashboard.tsx` (replaces body of `DashboardHome`)
- `src/components/dashboard/bento/BentoGrid.tsx`
- `src/components/dashboard/bento/BentoCard.tsx` (shared brutalist shell: border, offset shadow, header, remove btn)
- `src/components/dashboard/bento/AddWidgetSheet.tsx`
- `src/components/dashboard/bento/widgets/registry.ts`
- `src/components/dashboard/bento/widgets/EggsHeroWidget.tsx`
- `src/components/dashboard/bento/widgets/MetricTileWidget.tsx` (parameterized for fertility/hatch/hoi)
- `src/components/dashboard/bento/widgets/HousesPipelineWidget.tsx`
- `src/components/dashboard/bento/widgets/QaAlertsWidget.tsx`
- `src/components/dashboard/bento/widgets/WeeklyFlockStatusWidget.tsx`
- `src/hooks/useDashboardLayout.ts`
- Migration: `user_dashboard_layouts` table + RLS + grants

**Modified**
- `src/components/dashboard/DashboardHome.tsx` — swap body to `<BentoDashboard />`, keep filters bar + range label
- `src/index.css` — add bento tokens (`--bento-ink`, `--bento-cream`, `--bento-lime`, `--bento-lavender`), striped-fill SVG bg, offset-shadow utility, `.font-display`
- `tailwind.config.ts` — expose bento color tokens + shadow

**Untouched**
- Sidebar, TopBar, all analytics sub-pages, all data hooks, chat, QA hub.

## Behavior notes

- Widgets consume existing `useAnalyticsFilters` context, so global date/hatchery/flock filters still drive every widget.
- Empty/no-data state per widget uses the same "Jump to most recent week" affordance already in `DashboardHome`.
- Mobile (<md): grid collapses to single column, drag/resize disabled, "Customize" hidden.

## Out of scope

- Restyling other pages, sidebar, or auth.
- New data sources or KPIs beyond current hooks.
- Widget marketplace / sharing layouts across users.

## Rollout

Single phase — ship the bento dashboard + persistence together behind the existing `/` route. No feature flag; falls back to default layout for users with no saved layout row.
