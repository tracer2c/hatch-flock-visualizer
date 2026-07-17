## Problem

The Weekly Flock Rollup drill-down lives entirely in React state inside `DataEntryPage.tsx` — it has no URL. Breadcrumbs can only reflect the URL, so:

1. On the flock drill-down view (image 1), the breadcrumb only says **Data Entry** — it can't show `Weekly Flock Rollup > Flock 1001`.
2. On the Residue / Fertility / etc. entry pages (image 2), the **Flock 1001** crumb is not clickable because there is no route that represents "the flock drill-down for flock 1001 in week X".
3. Clicking **Weekly Flock Rollup** goes to `/data-entry` and drops the previously selected week, so the user has to page back through the calendar to find their flock again.

## Fix — encode drill-down + week in the URL

### 1. `DataEntryPage.tsx` — URL-driven drill-down
- Read `?view=weekly|houses`, `?flock=<flockKey>`, `?week=<yyyy-MM-dd>` from `useSearchParams`.
- Derive `view` and `drilldownFlock` from the URL instead of local state (keep local state as an optimistic mirror, but write through to the URL on every change).
- When `?flock=` is present, resolve the row from the weekly rollup query for that `?week=` and render `<FlockDrillDown>`. If the row is still loading, show a skeleton; if it truly doesn't exist for that week, clear the param.
- Clicking a flock row → `navigate({ search: "?view=weekly&flock=<key>&week=<yyyy-MM-dd>" })`.
- Back button in `FlockDrillDown` → strip `flock` param but keep `week`.
- View toggle (Weekly / By House) writes `view` to the URL and keeps `week`.

### 2. Flock entry pages — carry the week
Add `?week=<yyyy-MM-dd>` when navigating from `FlockDrillDown` to:
- `/data-entry/flock/:flockKey/egg-pack`
- `.../fertility`
- `.../residue`
- `.../clears-injected`
- `.../hoi`

The entry pages already receive `location.state.from`; keep that for the smart Back button. The `?week` param is what breadcrumbs consume.

### 3. `breadcrumbRoutes.ts` — hrefs that preserve context
Extend `CrumbSpec` so `href` (and label) receive **both** path params and search params:

```ts
href?: (ctx: { params: Record<string,string|undefined>; search: URLSearchParams }) => string;
```

Update `AppBreadcrumbs.tsx` to pass `new URLSearchParams(location.search)` into the resolver.

Then update the two flock chains:

```
/data-entry/flock/:flockKey/:section
  Data Entry                → /data-entry?view=weekly&week={week}
  Weekly Flock Rollup       → /data-entry?view=weekly&week={week}
  Flock {flockKey}          → /data-entry?view=weekly&flock={flockKey}&week={week}
  {Section label}           (plain text)

/data-entry/flock/:flockKey/hoi   — same shape, last crumb = "Hatch / HOI"
```

And add a chain for the drill-down URL itself:

```
/data-entry  (when ?flock=… is present, resolved in AppBreadcrumbs)
  Data Entry                → /data-entry?view=weekly&week={week}
  Weekly Flock Rollup       → /data-entry?view=weekly&week={week}
  Flock {flock}             (plain text — current page)
```

Because the drill-down shares the `/data-entry` path, add a small branch in `AppBreadcrumbs.tsx` before the pattern loop: if `pathname === "/data-entry"` and `search.flock` exists, use the drill-down chain instead of the plain `Data Entry` chain.

### 4. Collapse the duplicate "Data Entry" → "Weekly Flock Rollup" hop
Both segments point at the same URL, so render just one crumb: **Weekly Flock Rollup** as the parent of the flock. Final chains:

- Rollup list: `Weekly Flock Rollup`
- Flock drill-down: `Weekly Flock Rollup > Flock 1001`
- Section entry: `Weekly Flock Rollup > Flock 1001 > Residue`

(Keeps the crumb bar shorter and matches the user's mental model.)

## Files touched

- `src/pages/DataEntryPage.tsx` — URL sync for view / flock / week
- `src/components/dashboard/WeeklyRollupView.tsx` — receive `weekStart` from URL, notify parent on week change
- `src/components/dashboard/FlockDrillDown.tsx` — append `?week=` when navigating to entry pages; use `onBack` that strips only `flock`
- `src/lib/breadcrumbRoutes.ts` — new chain shape, week-aware hrefs
- `src/components/uui/AppBreadcrumbs.tsx` — pass search params to resolver; drill-down branch for `/data-entry?flock=…`

## Verification

- From `/data-entry?view=weekly&week=2026-03-16`, click flock 1001 → URL becomes `…&flock=1001`; breadcrumb reads `Weekly Flock Rollup > Flock 1001`.
- Click **Residue** → URL `/data-entry/flock/1001/residue?week=2026-03-16`; breadcrumb `Weekly Flock Rollup > Flock 1001 > Residue`, both parents clickable.
- Click **Flock 1001** crumb → returns to drill-down for the same week.
- Click **Weekly Flock Rollup** crumb → returns to the rollup list for the same week (no calendar reset).
- Refreshing the page on any of those URLs restores the same view.
