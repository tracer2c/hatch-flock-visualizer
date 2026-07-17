# QA Hub Overview — Manager-Grade Dashboard (Single Viewport)

Today's Overview tab is just a table of recent entries with a broken eye button. Replace it with a compact, single-viewport dashboard aimed at what a **hatchery manager** actually needs to know at a glance, plus a working detail drawer for the "view" action.

---

## 1. Layout — one page, no outer scroll

Fixed viewport: Overview content sits inside `h-[calc(100vh-headers)] overflow-hidden` with each panel owning its own inner scroll.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  KPI STRIP  (5 cards, no scroll)                                         │
│  Today | This Week | Out-of-Range 24h | Overdue Checks | Machines Active │
├───────────────────────────┬──────────────────────────┬───────────────────┤
│ TODAY'S COMPLIANCE        │ ATTENTION NEEDED         │ RECENT ACTIVITY   │
│ (heatmap by check type)   │ (out-of-range + overdue) │ (compact feed)    │
│                           │                          │                   │
│ • Temp        ● ● ● ○ ○   │ 🔴 DHN-01 · Temp 102.4°F │ Sruthi · Hatch    │
│ • Angles      ● ● ● ● ○   │ 🔴 Setter Rm · Hum 48%   │ Jack · Tray Wash  │
│ • Humidity    ● ● ○ ─ ─   │ ⚠ Chick Rm rectal >24h  │ Sruthi · Culls    │
│ • Hatch Prog. ● ● ● ● ●   │ ⚠ Angles overdue: DHN-3 │ …scrollable       │
│ • Tray Wash   ● ○ ─ ─ ─   │                          │                   │
│ • Rectal Temp ● ● ● ─ ─   │ [click row → detail]     │ [click → detail]  │
│ • Gravity     ● ● ─ ─ ─   │                          │                   │
│ • Culls       ● ─ ─ ─ ─   │                          │                   │
│                           │                          │                   │
│ scroll ↕ inside           │ scroll ↕ inside          │ scroll ↕ inside   │
├───────────────────────────┴──────────────────────────┴───────────────────┤
│  JUMP TO ENTRY  → chips: [Log Temp] [Log Angles] [Log Humidity] … [Wash]│
└──────────────────────────────────────────────────────────────────────────┘
```

Desktop = 3 columns; tablet/mobile stacks vertically with the KPI strip sticky at top and each panel a collapsible card.

---

## 2. Panels — what & why

**KPI strip (5 cards)**
- **Today's checks** — count of qa_monitoring rows where `check_date = today`.
- **This week's checks** — 7-day count.
- **Out-of-range (24h)** — count of readings that violated their ideal range (temp 99.5–100.5, humidity 53–58, PPM 50–200, tray-wash ≥140°F).
- **Overdue checks** — machines / rooms with no reading in the last 24h for their required type (temp/humidity daily, tray wash daily, hatch progression during hatcher window).
- **Active machines being monitored** — distinct `machine_id` seen in QA in last 24h vs total active machines.

Each KPI card has a subtle sparkline (7-day) and clicking it scrolls/filters the panels below.

**Today's Compliance (left column)**
For each of the 8 check types, show a mini-grid: one dot per required target (machine or room), color-coded:
- green = logged today, in range
- amber = logged today, out of range
- gray = not logged yet
- hyphen = not applicable today

Hover a dot → tooltip with machine/room name + last value. Click → opens the entry drawer (or "Log now" if empty).

**Attention Needed (middle column)**
Scrollable list of urgent items, sorted worst-first:
- Out-of-range readings from last 24h (red row)
- Overdue: last check > threshold (amber row)
- Failed tray-wash / PPM outside 50–200 (red row)
Each row: badge (type) + target (machine/room/flock) + short reason + timestamp + `View` button that opens the detail drawer.

**Recent Activity (right column)**
Compact feed (last 15–20). Each row: check type icon · target · inspector · relative time. Click → detail drawer. This replaces the current giant table.

**Jump-to-entry chips (bottom bar)**
Fixed row of chips: "Log Temperature", "Log Angles", "Log Humidity", "Log Hatch Progression", "Log Tray Wash", "Log Rectal Temp", "Log Gravity", "Log Culls". Each switches to the right scope tab + sub-tab.

---

## 3. Working "View" button — detail drawer

Replace the placeholder eye button with a right-side `Sheet` (shadcn). Opens for any entry (Attention list, Activity feed, compliance dot, or the retained recent table if kept).

Contents:
- Header: check type icon + label, badge (in-range / out-of-range), timestamp.
- Meta grid: Machine / Room / Flock / House · Inspector · Day of incubation · Notes.
- Type-specific body — parsed from `candling_results` JSON:
  - Temperature → positions grid with per-cell coloring, averages (front/mid/back).
  - Angles → 6-position (top/mid/bottom × L/R) badge grid with tolerance check.
  - Humidity → % + °F with range verdict.
  - Hatch Progression → stage, %-out, hatched vs total, check hour.
  - Tray Wash → 3 temps + 5 PPM checks with pass/fail per check.
  - Rectal Temp → location + reading vs target range.
  - Gravity → sample, float %, threshold, verdict.
  - Culls → male/female/defect breakdown.
- Footer: `Open in QA Hub` button → jumps to the correct scope+sub-tab pre-scoped to that machine/flock/date.

---

## 4. Data

Extend existing hooks; no schema changes.

- Widen `useQAStats` to also compute: 24h-out-of-range count, overdue count, active-machines-24h count, and a 7-day per-day series for the sparklines.
- New `useComplianceToday(companyId)` — one query pulling `qa_monitoring` for today + list of required targets (active machines from `machines`, rooms from a small const list) → returns per-type grid data with status + last value.
- New `useAttentionItems(24)` — combines: (a) out-of-range readings pulled from `qa_monitoring` in last 24h (evaluated client-side by parsing `candling_results` + fixed ranges) and (b) overdue targets (target list minus last-check timestamps). Sorted worst-first.
- `useRecentQAEntries` already exists — just render its output in the compact feed and keep the drawer wired to it.

All queries scoped by RLS via `company_id`; no data leakage across tenants.

---

## 5. Files touched

- `src/pages/QAHubPage.tsx` — replace `<RecentQAEntries />` inside the Overview tab with a new `<QAOverviewDashboard />`; remove the plain Card wrapper so the dashboard owns its own single-viewport layout.
- **New** `src/components/qa-hub/overview/QAOverviewDashboard.tsx` — top-level fixed-height container with the 3-column layout + KPI strip + jump chips.
- **New** `src/components/qa-hub/overview/KPIStrip.tsx` — 5 KPI cards with sparklines.
- **New** `src/components/qa-hub/overview/ComplianceHeatmap.tsx` — per-type dot grid.
- **New** `src/components/qa-hub/overview/AttentionList.tsx` — scrollable urgency list.
- **New** `src/components/qa-hub/overview/RecentActivityFeed.tsx` — compact feed (replaces the big table on Overview; the detailed table stays available inside its own scope tabs).
- **New** `src/components/qa-hub/overview/QAEntryDetailSheet.tsx` — the drawer with type-specific parsing.
- **New** `src/hooks/useQAOverviewData.ts` — bundles the three new queries above.
- `src/components/qa-hub/RecentQAEntries.tsx` — wire its eye button to open `QAEntryDetailSheet` (kept as-is elsewhere).

No database migrations. No new tables.

---

## 6. Open questions

1. **Overdue thresholds** — default proposal: Temp/Angles/Humidity every 24h per active machine; Hatch Progression every 4h during hatcher phase; Tray Wash once/day; Rectal Temp once/day per room. OK, or should any be tighter/looser?
2. **Jump-to-entry chips** — include all 8 types, or hide the ones that are already up-to-date today?
3. **Sparkline** on KPI cards — nice-to-have but skippable to keep the page lighter. Include or drop?
