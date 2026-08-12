# Fast Set Entry Grid + Timeline Data Fix

Two independent workstreams from Corey's feedback. Phase 1 is the bulk set-entry screen, Phase 2 fixes the timeline graphs.

## Phase 1 — Paper-style bulk set entry (Multi-Stage page)

Goal: drop 40–45 minutes to a few minutes by removing the one-setter-at-a-time flow.

Keep the existing top section unchanged (Set Date, Day, Transfer/Hatch dates, Buggies Set, Carry Overs, # of Machines, Set Color, live totals).

Replace the current one-row-per-setter table with a **Set Report grid** that mirrors the paper form:

```text
 SETTER 15        SETTER 16        SETTER 17
 pos  date  flock  pos  date  flock  pos  date  flock
  1   8-3   6501    1   8-3   6501    1   8-3   6501
  2   8-3   6501    2   8-3   6501    2   8-3   6501
  3   8-3   6501    3   8-3   6501    3   8-3   6501
```

Behavior:
- One card per setter, three position lines each (matching the 3 buggy positions on the paper card), all setters visible on one scrolling page — no dialogs, no per-machine card selection.
- Flock is entered by **typing the flock number** (e.g. `6501`); it resolves to the flock as you type and shows the flock name inline. Unknown numbers flag as a warning instead of blocking.
- Date defaults to the header set date on every line, editable per line.
- Buggy count per line defaults to 1 with a per-setter buggy size, so the existing eggs/projected-hatch math still works.
- Fill helpers: type a flock on position 1 and "fill down" applies to positions 2–3; copy the previous setter's column; keyboard-only movement (Enter/Tab moves down the column, arrow keys move between cells).
- Setters shown are only `multi_setter` machines for the selected hatchery, ordered by machine number, so the on-screen order matches the paper sheet order.
- Only setters with at least one filled line are saved; empty setters are ignored.
- Holdovers area at the bottom, matching the paper form, captured as operation notes.
- Autosave draft continues to work (same `operation_drafts` mechanism), so a half-entered sheet survives a closed tab.
- Save writes exactly what it writes today: one operation header, one batch + one operation row per filled line, plus multi-setter position allocation.

Old flow: the sequential single-row entry table is removed from this page (the grid supersedes it). Single-Stage page is left alone.

## Phase 2 — Timeline graphs: data-pulling fixes

Confirmed while investigating:
- The timeline loads batches with **no row limit set**, so Supabase caps the result at 1000 rows. There are currently 2222 batches, meaning roughly the oldest 1000 load and everything newer is silently missing from every timeline graph. This alone explains "some data not showing".
- Batches without a fertility/residue breakout (419 of 2222 have fertility, 288 have residue) are mapped to `0` rather than "no data", so they drag averages down and draw flat zero lines.
- Flock-week entries saved on the newer flock-level tables (`flock_weekly_fertility`, `flock_weekly_residue`, `flock_weekly_egg_pack`) are not read by the timeline at all.

Fixes:
1. Fetch all batches via paged requests (1000-row pages) and constrain to the selected date range, so nothing is truncated.
2. Treat missing breakout metrics as `null`/gaps instead of `0`; charts skip gaps and averages exclude them, so a flock with no residue analysis no longer reports 0%.
3. Include flock-week level data as a fallback when a house-level breakout is absent, so weekly flock roll-up entries appear in the timeline.
4. Add a small "data coverage" note per chart (e.g. "38 of 120 houses have residue data in this range") so it's obvious when a graph looks thin because the data isn't entered yet versus a bug.

## Technical notes

- Phase 1 touches `src/pages/MultiStagePage.tsx` plus a new grid component and small helpers; `useMultiStage.ts` save path is reused with rows generated from the grid (no schema change, no migration).
- Flock-number typing uses the existing `useMultiStageOptions` flock list, indexed by `flock_number`.
- Phase 2 touches the loader in `src/pages/EmbrexTimelinePage.tsx` and the metric mapping there; `hatcheryFormulas.ts` stays as the source of truth for HOF/HOI.
- Verification after each phase: enter a multi-setter sheet end-to-end and confirm batches/rows/positions land in the DB; then compare timeline chart values against the Data Sheet for the same flock/week.
