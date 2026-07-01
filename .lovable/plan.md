## Problem
In `EmbrexHOITab.tsx`, the `view` state (`"rows"` = By House, `"flock-summary"` = By Flock) is local component state. When Save runs, `onDataUpdate()` triggers the parent refetch, which remounts the tab, resetting `view` back to the default `"rows"` (By House).

## Fix
Persist the view mode so it survives remounts/refetches.

- In `src/components/dashboard/EmbrexHOITab.tsx`:
  - Initialize `view` from `localStorage.getItem("embrex-hoi-view")` (fallback `"rows"`).
  - On toggle click, write the new value to `localStorage` alongside `setView`.

Result: after clicking **Save changes**, the page refreshes with the latest data and stays on **By Flock** (or whichever view the user had selected).

No other tabs/files change.