# Plan: Adopt Untitled UI components (calendar, breadcrumbs, alerts, login)

## Scope
Bring in selected [Untitled UI React](https://www.untitledui.com/react/docs/introduction) components, restyled with our existing design tokens (Auburn Royal Blue `#4169E1`, Burnt Orange `#DD550C`, semantic tokens from `index.css`). No business-logic changes.

## 1. Install Untitled UI

Untitled UI React ships as source you copy in via their CLI (similar to shadcn). Install once:

```
npx untitledui@latest init
```

Then add only the components we need:

```
npx untitledui@latest add date-picker breadcrumb alert sign-in
```

Files land under `src/components/uui/` (namespaced to avoid clashing with our existing shadcn components under `src/components/ui/`).

## 2. Theme bridge (no color drift)

- Map Untitled UI's Tailwind theme vars to our HSL tokens (`--primary`, `--background`, `--foreground`, `--border`, `--destructive`, `--warning`, etc.) in `tailwind.config.ts` + a small `uui-theme.css` imported from `src/index.css`.
- Result: UUI components render in our Auburn Royal Blue / Burnt Orange palette in both light and dark mode. No hardcoded hex in components.

## 3. Range calendar card (the main pain point)

Replace the current calendar popover in `src/components/analytics/AnalyticsFilters.tsx` with UUI's **Range calendar card**:

- Same popover trigger button (unchanged label: `Jul 13 – Jul 19, 2026`).
- Inside the popover: UUI RangeCalendar + our preset chips (This week / Last week / MTD / Last 30 days) on the left, calendar on the right — matches UUI's "card" layout.
- Wire `onChange` back to `filters.setDateRange(from, to)` — no context changes.
- Same swap in `OverviewHeader.tsx` (single date-range popover) so both entry points look consistent.

## 4. Breadcrumbs

- Add a shared `<AppBreadcrumbs />` built on UUI Breadcrumb, rendered inside `TopBar.tsx` under the title row.
- Route → crumb map derived from `App.tsx` routes, e.g.:
  - `/data-entry/flock/:flockKey/residue` → Data Entry › Weekly Flock Rollup › {Flock name} › Residue
  - `/qa-hub` → QA Hub
  - `/analytics/*` → Analytics › {subpage}
- Flock/house names resolved from the existing `useFlockWeekBatches` / route params (no new queries where the data is already in cache).

## 5. Alerts

- Add UUI Alert as `src/components/uui/Alert.tsx` with variants `info | success | warning | error`.
- Replace ad-hoc alert boxes in:
  - `DashboardHome` empty state ("No flocks set between …" → info Alert with the "Jump to most recent week" action).
  - `NeedsAttention` critical row (error Alert).
  - QA Hub past-date read-only banners (warning Alert).
- `useToast` stays as-is — Alerts are for inline, persistent messages only.

## 6. Sign-in page

- Replace the current `src/pages/AuthPage.tsx` sign-in form with UUI's **Sign in** block (split layout: form left, brand panel right).
- Keep every existing behavior: Supabase email/password, sign-up tab, forgot-password link, 2FA verify dialog, email-availability debounce, password strength meter, seamless signup→signin transition.
- Brand panel: our logo + Auburn Royal Blue gradient, no stock imagery.
- Reset password page (`ResetPasswordPage.tsx`) restyled to match.

## 7. Verification

- `tsgo` typecheck.
- Playwright pass on `/`, `/auth`, `/data-entry`, `/qa-hub`, `/analytics/performance` — screenshot each to confirm the new calendar, breadcrumbs, alerts, and sign-in render in our theme.

## What is NOT changing
- No changes to hooks, queries, RLS, routing structure, or data flow.
- Existing shadcn components under `src/components/ui/` stay; UUI lives alongside under `src/components/uui/`. We migrate call sites only for the 4 areas above.
- No new colors, fonts, or logos introduced.

## Open question
Untitled UI React's free tier covers Breadcrumb, Alert, and Date picker. The **Sign in** block is in their PRO tier. Two options:
- **A.** Use UUI free components for calendar/breadcrumb/alert now, and I'll rebuild the sign-in page in the same visual language using free primitives (Input, Button, etc.) — no license needed.
- **B.** You have a UUI PRO license — share it (or confirm) and I'll pull the official Sign in block.

I'll proceed with **A** unless you say otherwise.
