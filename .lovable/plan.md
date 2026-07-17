## Goal
Turn the main dashboard into a **single-viewport, no-scroll** operational cockpit. Remove space-wasting chrome, add a subtle weather/location chip, and introduce an **AI summary card** that quietly refreshes every 2 hours.

## Layout (fits in one viewport, internal scroll only where needed)

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [Weather chip: ☀ Auburn, AL · 78°F]     [Date range] [Filters ⚙]    │  ← 44px header row
├──────────────────────────────────────────────────────────────────────┤
│ KPI 1 │ KPI 2 │ KPI 3 │ KPI 4 │ KPI 5                                │  ← compact KPI row (~90px)
├──────────────────────────────────────────────────────────────────────┤
│ ┌── AI Daily Briefing ──────────────┐ ┌── Needs Attention (compact) ┐│
│ │ • bullet 1                        │ │ 3 critical · 5 warning       ││
│ │ • bullet 2                        │ │ chip list, not full row      ││
│ │ • bullet 3                        │ └──────────────────────────────┘│  
│ │ Last updated 2h ago               │ ┌── QA Alerts (compact) ───────┐│
│ └───────────────────────────────────┘ │ …                            ││
│ ┌── Weekly Flock Status ────────────┐ └──────────────────────────────┘│
│ │ dense table, internal scroll only │                                 │
│ └───────────────────────────────────┘                                 │
└──────────────────────────────────────────────────────────────────────┘
```

Root container becomes `h-[calc(100vh-topbar)] overflow-hidden` with a grid where only inner cards scroll.

## Changes

### 1. Remove header chrome (`DashboardHome.tsx`)
- Delete the "Hatchery Dashboard" title, egg icon, and description paragraph.
- Replace with a slim 44px header row: **weather/location chip (left)** + existing `AnalyticsFilters` (right).

### 2. Weather + location chip (new `WeatherLocationChip.tsx`)
- On mount: fetch IP geolocation from `https://ipapi.co/json/` (no key, free tier) → `{city, region_code}`. Cache in `sessionStorage` for the session.
- Fetch current weather from **Open-Meteo** (`https://api.open-meteo.com/v1/forecast?...&current=temperature_2m,weather_code&temperature_unit=fahrenheit`) — free, no API key.
- Render: `<icon> Auburn, AL · 78°F`. Icon map: sun / cloud / cloud-rain / cloud-snow / cloud-lightning from lucide.
- Silent fail (hide chip) if either request fails — never blocks dashboard.

### 3. Compact "Needs Attention" (`NeedsAttention.tsx`)
- Collapse from full-width row to a **compact card** in the right column.
- Show counts as chips (`3 critical`, `5 warning`) with a small horizontal list of the top 3 flock names; "View all" link opens existing detail.

### 4. AI Daily Briefing card (new `AIBriefingCard.tsx` + `useAIBriefing.ts`)
- Calls existing `ai-chat` edge function with a fixed prompt: summarize today's KPIs, alerts, and top attention flocks into **4–6 short bullets** (plain user language).
- Highlighted styling: soft primary gradient background, sparkle icon, bulleted list.
- **Caching / refresh cadence**: store `{ text, generatedAt }` in `localStorage` under `hp:ai-briefing:<companyId>`. On mount, if `Date.now() - generatedAt > 2h` → refetch silently in background (no loading spinner over old content; swap in when ready).
- Footer shows only `Last updated 2h ago` in muted 11px text — no reload UI, no manual refresh button.

### 5. Compact KPI row
- Reduce `KpiRow` card padding (`p-4` → `p-3`) and value size (`text-2xl` → `text-xl`) so the row fits ~90px tall.

### 6. Right column stack
- `DashboardQaAlerts` becomes compact (max-height with internal scroll).
- Remove `ActiveHousesPipeline` from the default view (keep component, unmount here) — reclaims the vertical space needed for no-scroll.

## Technical notes
- No new dependencies. Open-Meteo + ipapi are keyless public APIs; called client-side.
- AI briefing reuses `supabase.functions.invoke('ai-chat', ...)`; the prompt asks explicitly for bullet-only output and forbids all-zero tables (matches existing system prompt rules).
- Everything is presentation-layer only — no schema, no RLS, no business logic changes.
- Verify one-page fit at 1280×800 and 1440×900 desktop; on <lg screens fall back to normal scroll (mobile isn't a "no-scroll" target).

## Out of scope
- Editable briefing prompt / admin controls.
- Multi-day weather forecast.
- Persisting briefings to the DB (localStorage is enough for a 2h cache).
