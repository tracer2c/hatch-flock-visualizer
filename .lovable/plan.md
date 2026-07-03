
# Dashboard Redesign + Analytics Nav & Filters

Rebuild the Dashboard as a lightweight triage/summary screen (matching the mockup) and restructure the sidebar so the four analytics-style pages live under an "Analytics" dropdown in the top nav. Add a shared filter bar (Date, Hatcheries, Flock/House) that actually drives the pages under Analytics.

## 1. Dashboard rebuild (`/`)

Replace `OverviewOperations` (currently a passthrough to `BatchOverviewDashboard`) with a new `DashboardHome` composed of small, focused sections. Nothing on this page becomes an editor — every action links to Data Entry / Data Sheet / QA Hub.

Sections top → bottom, matching the reference screenshot:

1. **Page header** — "Hatchery Dashboard" + subtitle + right-aligned filter row: Set-Date Week picker, Hatchery multi-select, Machine multi-select. "Last updated" stamp.
2. **KPI cards (5)** — Total Eggs Set (week), Avg Fertility %, Avg Hatch %, Avg HOI %, Critical QA Alerts. Each shows current value, target (where applicable), and week-over-week delta.
3. **Needs Attention** — compact exceptions table (max 5 rows) with columns Flock / Issue tag / Details / Set Date / Action button. Issue categories: Performance Variance, Missing Data, Below Target, QA Alert, Due Soon. "View all needs attention →" links to Data Sheet with the same filter applied.
4. **Weekly Flock Status** — small summary card: Total Flocks / Complete / Missing Data / Critical Issues counts + buttons `Open Weekly Rollup` (→ `/data-entry` weekly rollup) and `Go to Data Entry`.
5. **Active Houses Pipeline** — up to 3 rows: house code, flock/machine, status pill (In Setter / In Hatcher), "Due in N days". "View full pipeline →" opens Live Tracking.
6. **QA Alerts** (right column on desktop, stacked on mobile) — top 3 critical alerts with temp/humidity + detected time. "Go to QA Hub" button.

No inline editing, no full flock table, no export controls, no worksheet columns. Data comes from existing hooks (`useWeeklyFlockRollup`, `useAlerts`, `useHousesData`, targets, etc.) — no new tables.

### New/changed files
- `src/components/dashboard/DashboardHome.tsx` (new — orchestrates sections)
- `src/components/dashboard/sections/KpiRow.tsx`
- `src/components/dashboard/sections/NeedsAttention.tsx`
- `src/components/dashboard/sections/WeeklyFlockStatusCard.tsx`
- `src/components/dashboard/sections/ActiveHousesPipeline.tsx`
- `src/components/dashboard/sections/DashboardQaAlerts.tsx`
- `src/pages/Index.tsx` — render `DashboardHome` instead of `OverviewOperations`
- Leave `BatchOverviewDashboard` and its tabs in place; the heavy tabbed analytics stays reachable through the Analytics menu and Data Sheet, not the dashboard.

## 2. Sidebar cleanup + Analytics top-nav dropdown

Currently the sidebar shows Dashboard, Multi-Stage, Single-Stage, Data Entry, QA Hub, Data Sheet, Timeline, Daily Tasks, Smart Analytics, Management. The four analytics-flavored screens (Live Tracking, House Flow, Process Flow, Machine Utilization) are only reachable via direct URLs today.

Changes:
- **Sidebar** stays operational: Dashboard, Multi-Stage, Single-Stage, Data Entry, QA Hub, Data Sheet, Timeline, Daily Tasks, Smart Analytics, Management. (No new items.)
- **TopBar** — add an "Analytics" dropdown button (icon `TrendingUp`, matches mockup style) between the Search box and the Home icon. Items:
  - Live Tracking → `/live-tracking`
  - House Flow → `/house-flow`
  - Process Flow → `/process-flow`
  - Machine Utilization → `/machine-utilization`
- Gate each item through `usePermissions().hasFeatureAccess` using the existing feature keys so role-based hiding continues to work.
- Highlight the current analytics route in the dropdown trigger (active pill styling) when the user is on one of those pages.

### Files
- `src/components/TopBar.tsx` — insert the dropdown (use existing `DropdownMenu` primitives).
- `src/components/ModernSidebar.tsx` — no item changes; keep as-is.

## 3. Shared Analytics filter bar

Add a shared `AnalyticsFilters` header used by the four Analytics pages (Live Tracking, House Flow, Process Flow, Machine Utilization) and the Dashboard header. Requirements:

- **Date range** — presets (This week / Last week / MTD / Last 30 days / Custom) using the shadcn date-range picker (`pointer-events-auto`).
- **Hatcheries** — multi-select of the user's hatcheries (from `units` via existing loader), "All hatcheries" default.
- **Flocks / Houses** — dependent multi-select scoped to the selected hatcheries. A small toggle switches between filtering by Flock and by House so power users can pick the axis they care about.

Filters must actually drive queries — not just be decorative:
- Introduce a lightweight `AnalyticsFilterContext` (`src/contexts/AnalyticsFilterContext.tsx`) that persists selection to `sessionStorage` and exposes `{ dateRange, hatcheryIds, flockIds, houseIds, mode }`.
- Wrap the analytics routes with the provider in `App.tsx` (single `<Route element>` layout wrapper containing the four routes).
- Update the page components to read the context and pass values into their existing hooks:
  - `LiveHouseTracker` → filter by hatchery + house
  - `HouseFlowPage` → filter by hatchery + flock/house + date
  - `ProcessFlowDashboard` → date + hatchery + flock
  - `MachineUtilizationPage` → date + hatchery
- Where a hook doesn't accept filter args yet, extend its signature (params object) and apply the filter client-side after fetch if a server change would be out of scope; keep the change additive so other callers are unaffected.
- Dashboard header re-uses the same filter component (same context provider mounted at the app shell) so Set-Date Week + Hatchery selection stays consistent when the user moves between Dashboard and Analytics pages.

### Files
- `src/contexts/AnalyticsFilterContext.tsx` (new)
- `src/components/analytics/AnalyticsFilters.tsx` (new — date range, hatchery multi-select, flock/house multi-select with mode toggle)
- `src/components/analytics/AnalyticsPageShell.tsx` (new — page header + filter bar wrapper used by the four pages)
- `src/pages/LiveTrackingPage.tsx`, `src/pages/HouseFlowPage.tsx`, `src/pages/ProcessFlowPage.tsx`, `src/pages/MachineUtilizationPage.tsx` — wrap in `AnalyticsPageShell`, read context
- `src/App.tsx` — mount `AnalyticsFilterProvider` around the app shell so both TopBar dropdown targets and the Dashboard share the same filter state
- Underlying hooks touched only enough to accept the new params (no schema changes, no new tables)

## Out of scope
- No changes to Data Sheet, Data Entry, or the Flock Detail Editor introduced earlier.
- No new Supabase migrations.
- Sidebar item list stays as-is; Analytics lives in the top nav per your instruction.
