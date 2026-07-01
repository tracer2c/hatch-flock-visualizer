## Problem

On the Embrex Data Sheet → **By Flock** view, when you edit Hatch/Clears and click **Save changes**, the input snaps back to the old computed value. Only a full browser refresh shows the saved number.

Root cause: `FlockSummaryView` renders from the `data` prop fed by `CompleteDataView.loadCompleteData()` (a manual fetch, not React Query). The save hook only invalidates React Query caches (`["batches"]`, `["complete-data"]`) — nothing tells the parent to re-run `loadCompleteData`, so the stale `data` prop keeps re-showing the old value (via `batches_chicks_hatched` fallback) and wipes the just-saved edit from local state.

## Fix (small, frontend-only)

1. `src/components/dashboard/FlockSummaryView.tsx`
   - Add optional `onDataUpdate?: () => void` prop.
   - After `saveAll()` finishes successfully (all dirty rows committed), call `onDataUpdate?.()` so the parent refetches from `batches`.

2. `src/components/dashboard/EmbrexHOITab.tsx`
   - Pass `onDataUpdate={onDataUpdate}` down to `<FlockSummaryView />`.

No hook, DB, or aggregation changes. After save, the parent refetch pulls the new `batches.chicks_hatched`, `batches_chicks_hatched` recomputes to the saved value, and the row displays the correct number without a manual refresh.
