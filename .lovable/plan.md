## Goal
Rebalance the Dashboard so action blocks lead, KPIs feel alive with sparklines, and the AI Briefing shrinks into a compact summary — matching the priorities the user described. Frontend-only, no backend changes.

## New layout (top → bottom)

```
[ slim header: weather chip · range · filters ]

[ KPI 1 ][ KPI 2 ][ KPI 3 ][ KPI 4 ][ KPI 5 ]      <- with sparklines & pending states

[ Needs Attention (large, 8 cols) ] [ QA Alerts (4 cols) ]
                                    [ Upcoming Tasks    ]

[ AI Daily Briefing — compact (~150px, single row of bullets) ]

[ Weekly Trend / Production Pipeline (fills remaining vertical) ]
```

No `h-[calc(100vh-3.5rem)]` no-scroll clamp — the page becomes normally scrollable so operational widgets can breathe. Header/KPI rows stay above the fold on 1080p; row 3+ scrolls in.

## Row 1 — Header
- Keep weather chip but demote: smaller text, muted styling, `hidden lg:flex`. Range label to the right of it.
- Filters on the right (unchanged).

## Row 2 — KPI cards with sparklines and better states

Refactor `KpiRow.tsx`:
- Add a `spark?: number[]` prop per KPI. Render a tiny recharts `<AreaChart>` (or `<LineChart>`) 80×32 in the top-right corner of the card body, tone-tinted (matches the KPI accent). Uses `Total Eggs Set` daily series over the last 14 days; other KPIs use last-4-week averages when available, `undefined` otherwise (sparkline hidden).
- New states — pass a `pending?: string` prop; when the metric is `null`/`NaN`, render the pending label (e.g. "Awaiting HOI data") in muted italic instead of `—`.
- Deltas: keep the `↑/↓ X% vs last period` line; when `pending`, hide the delta.
- Card height fixed (`h-[110px]`) so the row stays tight but readable. Two lines: value + sparkline (row) then sub/delta.

Sparkline data source: derive from `useWeeklyFlockRollup` results grouped by day for Total Eggs Set; for Fertility/Hatch/HOI use `prevRows` + `rows` averages as a simple 2-point trend (upgrade later). Keep the addition non-breaking — sparkline is optional.

Pending labels wired in `DashboardHome`:
- Avg Hatch % → "Pending hatch data" when no completed rows have `hof_pct`.
- Avg HOI % → "Awaiting HOI data" when all `hoi_pct` are null.
- Avg Fertility → "Not entered yet" when all `fertility_pct` are null.
- Total Eggs Set → normal value (0 is legitimate).
- Critical QA Alerts → "All clear" when 0 (already handled).

## Row 3 — Needs Attention (hero) + right rail

Use `grid-cols-12`: `NeedsAttention` full mode occupies `col-span-8`; right column `col-span-4` stacks:
1. `DashboardQaAlerts` (existing)
2. New **Upcoming Tasks** card that reuses `useChecklistForecast` or `useCriticalEvents` if already present — otherwise a lightweight card that pulls the next 3 items from `daily_tasks` / checklist forecast. If no such data hook exists, render a placeholder card that links to `/checklist` with count of today's tasks from an existing hook (verify — will confirm during implementation and swap for a static "View today's tasks" CTA if no cheap source exists).

Upgrade the full `NeedsAttention` variant:
- Add a small **Severity** column (Warning/Critical) derived from `kind`.
- Add an **Updated** column showing relative time ("1 hour ago") when `setDate` is present.
- Keep table dense; primary CTA `Review Flock` navigates to the flock in `/embrex-data-sheet`.

Compact variant is removed from the dashboard usage (still supported for other callers).

## Row 4 — Compact AI Daily Briefing

Refactor `AIBriefingCard.tsx`:
- New `variant="compact"` prop. Compact mode:
  - Fixed height ~150–170px.
  - Header row: sparkle icon + "AI Daily Briefing" + "Updated X ago" · "Ask HatchAI" ghost button (routes to `/chat`) + "View full briefing" link that opens the existing full-card in a dialog (or navigates to `/chat` with the briefing prefilled — pick dialog for zero routing changes).
  - Body: 3–5 short single-line bullets rendered from the model output. Prompt updated to force ≤5 bullets, ≤80 chars each, ending with a "Next step:" line.
- Use compact variant on the dashboard; keep default for anywhere else.

## Row 5 — Operational widget

Add `WeeklyTrendCard.tsx`:
- Simple `<LineChart>` from recharts (already used) showing the last 6 weeks of Total Eggs Set, Fertility %, Hatch %. Uses `useWeeklyFlockRollup` extended range (query 6 iso weeks back — reuse existing hook by calling it once per week if cheap; otherwise a single `useDatesWithBatches`-style aggregate). Falls back to `ActiveHousesPipeline` if the trend query is empty.
- Card height ~280px, fills the row.

## Files

### Edit
- `src/components/dashboard/DashboardHome.tsx` — new grid, no viewport clamp, wire pending states + sparkline data, mount compact briefing + trend card.
- `src/components/dashboard/sections/KpiRow.tsx` — add `spark`, `pending`, render sparkline, apply pending state.
- `src/components/dashboard/sections/NeedsAttention.tsx` — add Severity + Updated columns, tighten default variant, CTA copy.
- `src/components/dashboard/sections/AIBriefingCard.tsx` — add `variant="compact"`, "Ask HatchAI" + "View full" affordances; tighten briefing prompt in `useAIBriefing.ts` for ≤5 bullets.

### Create
- `src/components/dashboard/sections/UpcomingTasksCard.tsx` — right-rail card.
- `src/components/dashboard/sections/WeeklyTrendCard.tsx` — row 5 line chart.

### No changes
- Filters, weather chip, alerts hooks, routes, sidebar.

## Out of scope
- Real AI-generated sparklines / new backend series.
- New AI endpoints — the briefing keeps the existing `ai-chat` invocation and 2h cache.
- Replacing recharts with another library.

## Verification
1. Build passes.
2. Preview at ~1280×800: header + KPI row + Needs Attention hero visible above the fold; page scrolls to reveal AI briefing (compact) and trend chart.
3. KPI cards show a tiny inline sparkline and either a delta or a "Pending / Awaiting … " label instead of `0.0%` / `—` for metrics with no data.
4. `NeedsAttention` shows Severity + Updated columns and a `Review Flock` CTA.
5. AI Briefing card is ~150–170px tall, shows ≤5 bullets and an "Ask HatchAI" button.
