## Goal
Make `/embrex-data-sheet` a single, non-scrolling page — everything above the table fits in one compact row, and only the table body scrolls internally. Reclaim as much vertical space as possible for data rows without breaking any current functionality.

## Changes

### 1. `src/pages/EmbrexDataSheetPage.tsx` — collapse the header

Reduce the header from 2 rows (title + actions, then tabs + filter + search) to a single tight toolbar:

```
[Data Sheet] [Tabs: Embrex/HOI · Residue · Egg Quality · Hatch · QA] ......... [By House | By Flock] [% toggle] [🔍] [⚙ Filters] [↻] [⬇] 
```

Concrete edits:
- Remove the `Timeline View` button entirely (also remove the `TrendingUp` import and the `handleTimelineView` handler).
- Convert **Refresh** and **Export** buttons to `size="icon"` variant with a `Tooltip` (keeps the export dropdown; icon-only trigger).
- Convert **Search** to an icon-only button that, when clicked, expands into an inline input (existing `searchTerm` state stays; add local `searchOpen` state). Escape/blur-with-empty collapses it back.
- Drop the subtitle line "View and analyze all hatchery data in one place." (SEO description in the `<meta>` stays unchanged).
- Move the H1 into the same row as the tabs (small `text-lg font-semibold`) so title, tabs, and actions live on one line.
- Add the **By House / By Flock** toggle (see §3) into this same toolbar row.
- Change the outer wrapper so the page never scrolls:
  - Outer: `h-[calc(100vh-<header offsets>)] flex flex-col overflow-hidden` (already `h-screen overflow-hidden` — keep, just verify with app shell).
  - Content wrapper (currently `flex-1 overflow-auto p-6`) becomes `flex-1 min-h-0 overflow-hidden p-4` so the child owns scrolling.

### 2. Internal-only table scroll
Ensure the currently rendered tab panel is the sole scroller:
- In `CompleteDataView` (and each tab component: `EmbrexHOITab`, `ResidueBreakoutTable`, `EggPackQualityTab`, `HatchPerformanceTab`, `QAMonitoringTab`), wrap the returned content with `<div className="h-full flex flex-col min-h-0">`, put static bits (banner, helper text) at the top, and give the table container `flex-1 min-h-0 overflow-auto`.
- Do not modify column definitions, data hooks, filters, aggregations, or export logic.

### 3. Lift the By House / By Flock toggle to the page toolbar
Currently `DataSheetViewModeToggle` lives inside each tab (Residue, Egg Pack, Hatch, QA — not Embrex/HOI). Lifting:
- Add `const [viewMode, setViewMode] = useState<DataSheetViewMode>("rows")` in `EmbrexDataSheetPage`.
- Render the toggle in the toolbar; hide it when `activeTab === "embrex"` (that tab has no By Flock mode today).
- Pass `viewMode` / `setViewMode` down through `CompleteDataView` into `ResidueBreakoutTable`, `EggPackQualityTab`, `HatchPerformanceTab`, `QAMonitoringTab` as optional controlled props; if the prop is provided, use it instead of local `useState` and remove the inline `<DataSheetViewModeToggle …/>` render in that tab. If the prop is absent, existing behavior is preserved (safe fallback).

### 4. Nothing else changes
- No route removal (leave `/embrex-timeline` reachable from any other entry point).
- No changes to data queries, exports, permissions, filter dialog contents, or read-only banner.
- Breadcrumbs, sidebar, and TopBar untouched.

## Verification
1. Build passes.
2. Visit `/embrex-data-sheet`: header is one row, no page scroll, only the table area scrolls; resizing the window keeps the table filling remaining space.
3. Each tab: filters, search (expanded via icon), refresh, CSV/Excel export, percentage toggle all still work.
4. Switching tabs preserves the chosen By House / By Flock view; toggle hidden on Embrex/HOI tab.
5. No Timeline View button anywhere on this page.
