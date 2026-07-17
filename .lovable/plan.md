## Problems

1. **Inconsistent toolbars across tabs.** The top toolbar hides the *By House / By Flock* toggle when the Embrex tab is active, and `EmbrexHOITab` still renders its own toggle inside the content. Other tabs already accept a controlled `viewMode` so they don't duplicate, but the Embrex tab makes the layout jump when switching.
2. **Search feels crammed.** The expandable search sits mid-toolbar between the *Percentages* switch and the *Filters* button with no visual separation, so when it expands it squeezes the neighbours.
3. **Icon toolbar looks generic.** Plain outlined square buttons for Refresh/Export/Search/Filters with no grouping, no separator, no hover polish.
4. **Editing a row requires scrolling to the Actions column** and clicking a tiny pencil — painful on wide tables with a normal mouse.

## Fix

### 1. Single, consistent toolbar for every tab
- Always render the *By House / By Flock* segmented control in the page toolbar (remove the `showViewToggle = activeTab !== "embrex"` gate).
- Add `viewMode` / `onViewModeChange` props to `EmbrexHOITab` (mirror the pattern in `HatchPerformanceTab`), and hide the internal toggle when the parent controls the view. Delete the internal `updateView`-driven toolbar row from `EmbrexHOITab`.

### 2. Reorganize the toolbar into three clean groups with dividers
```
[ Data Sheet | Embrex/HOI | Residue | Egg | Hatch | QA ]        ← left
                                                                    (spacer)
[ By House | By Flock ]  │  [ ⌘K Search flock, house, tech… ]  │  [ % Percentages · Filters ]  │  [ ⟳  ⬇ ]
```
- **Search becomes a persistent, pill-shaped input** with a leading icon and a right-side `⌘K` hint. No more expand/collapse — it always occupies ~260px on md+, collapses to icon-only under 640px. Global `⌘K` / `Ctrl+K` focuses it.
- Insert light `Separator` bars (`h-5 w-px bg-border`) between groups so nothing looks crammed.
- Icon buttons get a subtle hover/active treatment (`hover:bg-muted`, `active:bg-muted/70`) and consistent 36×36 target size.
- Swap the current icons for the more modern set:
  - Refresh → `RotateCw`
  - Export → `Download` (kept; group with a `ChevronDown` when a dropdown is attached)
  - Filters → `SlidersHorizontal` (replaces `Filter` funnel)
  - Search → `Search` (kept, always visible now)

### 3. Row-click opens the edit modal
- In each editable tab (`EmbrexHOITab`, `EggPackQualityTab`, `HatchPerformanceTab`, `ResidueBreakoutTable`, `QAMonitoringTab`):
  - Add `onClick={() => !readOnly && handleEdit(item)}` and `className="cursor-pointer hover:bg-muted/50"` to every data `TableRow`.
  - Stop event propagation on the existing Edit / Delete action buttons so their explicit clicks still work without double-firing.
  - Aggregated "By Flock" rows keep the same behaviour — click opens the flock-level edit dialog that's already wired to the Edit button.
  - Read-only users: no cursor change, no click handler.

### 4. Files touched
- `src/pages/EmbrexDataSheetPage.tsx` — toolbar restructure, always-visible search, always-visible view toggle, updated icons, `⌘K` handler.
- `src/components/dashboard/EmbrexHOITab.tsx` — accept `viewMode` / `onViewModeChange`, drop internal toggle bar, add row-click edit.
- `src/components/dashboard/CompleteDataView.tsx` — pass `viewMode` / `onViewModeChange` through to `EmbrexHOITab` too.
- `src/components/dashboard/EggPackQualityTab.tsx`, `HatchPerformanceTab.tsx`, `QAMonitoringTab.tsx`, `ResidueBreakoutTable.tsx` — add row-click → `handleEdit`, stop propagation on action-cell buttons.

### 5. Out of scope (not touched)
- No column, formula, or data-fetch changes.
- No changes to the Filters dialog contents.
- Aggregated flock rows keep the existing edit dialog — no new edit UI.

## Verification
- Switch between all five tabs → toolbar stays visually identical (same buttons, same spacing).
- Search is always visible with a `⌘K` chip; pressing `⌘K` focuses it.
- Clicking anywhere on a table row (outside the Actions cell) opens the edit modal for that record.
- Clicking the pencil / trash in the Actions cell still works and doesn't double-fire.
- Read-only mode still hides Edit/Delete and disables row-click.
