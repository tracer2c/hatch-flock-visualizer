## Problem

Breadcrumbs at the top look right but many crumbs link to **routes that don't exist**, so clicking them lands on 404:

- `/data-entry/flock` → 404 (no route)
- `/data-entry/flock/1001` → 404 (no drill-down route)
- Some `/data-entry/house/:id` segments also link to non-existent parents

The breadcrumb component blindly accumulates URL segments; it doesn't know which are real routes vs. sub-paths that only render as part of a deeper page. It also uses raw params (`1001`, house IDs) with no context, so the crumb text is unhelpful.

Separately, the back button on entry pages (`Back to Weekly Flock Rollup`) navigates to a fixed URL, which drops any filter state the user had (selected week, hatchery filter, etc.). The user wants "back = the actual previous page".

## Fix

### 1. Route-aware breadcrumbs (replace segment-accumulator with a route map)

Rewrite `src/components/uui/AppBreadcrumbs.tsx` to build crumbs from an explicit route table instead of splitting the URL. Each entry defines the crumb chain (label + real href) for that route.

Example table:

```ts
// pattern → chain
"/data-entry"                              → [Data Entry]
"/data-entry/house/:houseId"               → [Data Entry, House {houseId}]
"/data-entry/house/:houseId/residue"       → [Data Entry, House {houseId}, Residue]
"/data-entry/flock/:flockKey/hoi"          → [Data Entry, Flock {flockKey}, Hatch / HOI]
"/data-entry/flock/:flockKey/residue"      → [Data Entry, Flock {flockKey}, Residue]
"/qa-hub"                                  → [QA Hub]
"/management/rooms"                        → [Management, Rooms]
...
```

Rules:
- Every crumb href in the chain must point to a **route that actually exists** in `App.tsx`. If a logical parent has no route (e.g. `Flock 1001` has no standalone page), that crumb renders as **plain text**, not a link.
- The final crumb is always plain text.
- Use `matchPath` from `react-router-dom` to resolve the current pathname against patterns.
- Dynamic labels: pull `houseId` / `flockKey` from `useParams` and render as `House #1` / `Flock 1001`.
- Fallback: if no pattern matches, fall back to the current humanized-segment behavior (so unmapped routes still show something reasonable).

### 2. Smarter "Back" navigation on flock/house entry pages

Introduce a small hook `useSmartBack(fallback: string)` in `src/hooks/useSmartBack.ts`:

- On mount, store `location.state.from` (if provided by the linker) or `document.referrer` derived path.
- Returns a `goBack()` that:
  1. Uses `navigate(-1)` **only if** the previous history entry is inside our app (checked via a session-storage stack we push on every route change).
  2. Otherwise navigates to the `fallback` URL passed in (e.g. `/data-entry`).

Add a tiny history tracker in `App.tsx` (a `<RouteHistoryTracker>` inside the `Routes`) that pushes each visited in-app path to `sessionStorage`. This lets the hook know whether `-1` is safe.

Wire `useSmartBack("/data-entry")` into the back buttons of:
- `HatchHOIEntryPage.tsx`
- `FlockResidueEntryPage.tsx`
- `FlockFertilityEntryPage.tsx`
- `FlockEggPackEntryPage.tsx`
- `FlockClearsInjectedEntryPage.tsx`
- `FlockDrillDown.tsx` ("Back to Totals")

When these pages are opened, also pass `state={{ from: location.pathname + location.search }}` from the caller (`WeeklyRollupView` links) so the entry page can restore filters (week, hatchery) on back.

### 3. Preserve rollup filter state across back navigation

In `WeeklyRollupView.tsx`, when navigating to a flock entry page, include `state={{ from: currentUrlWithQuery }}` on the `<Link>` / `navigate()` call. The entry pages' back button (via `useSmartBack`) will return the user to that exact URL, preserving the selected week and hatchery filter.

## Files

**Edit**
- `src/components/uui/AppBreadcrumbs.tsx` — replace with route-table implementation.
- `src/App.tsx` — mount `<RouteHistoryTracker />` inside the authenticated `<Routes>`.
- `src/components/dashboard/WeeklyRollupView.tsx` — pass `state={{ from }}` when navigating to entry pages.
- `src/pages/HatchHOIEntryPage.tsx`, `FlockResidueEntryPage.tsx`, `FlockFertilityEntryPage.tsx`, `FlockEggPackEntryPage.tsx`, `FlockClearsInjectedEntryPage.tsx`, `src/components/dashboard/FlockDrillDown.tsx` — swap fixed back-URL for `useSmartBack("/data-entry")`.

**Create**
- `src/hooks/useSmartBack.ts` — the smart back hook.
- `src/components/RouteHistoryTracker.tsx` — pushes in-app paths to `sessionStorage`.
- `src/lib/breadcrumbRoutes.ts` — the pattern → crumb-chain map.

## Verification

1. Navigate `Data Entry → Weekly Flock Rollup → 1001 → Residue`. Click each breadcrumb; every click lands on a real page (no 404).
2. Open Residue entry page from the rollup, hit Back — return to the rollup with the same week/hatchery filter.
3. Open the entry page directly via a deep-link (fresh tab), hit Back — falls back to `/data-entry`.
4. Same check for `/data-entry/house/:id/*` chain.
5. Breadcrumbs for `/qa-hub`, `/management/rooms`, `/chat`, `/analytics/*` still render.
