# Printable Set Sheets (Single-Stage & Multi-Stage)

Add a Print button to the top-right of both set entry pages that produces a clean paper copy of the Operation/This Set section plus the full Set Sheet (all setters) exactly as entered.

## What the user gets

- A **Print** button (printer icon + label) in the top-right action row of the Single-Stage page and the Multi-Stage page, next to the existing Save/Reset actions.
- Clicking it opens the browser print dialog with a tidy, ink-light version of the current screen: no sidebar, no top nav, no buttons, no progress bars, no "auto" hints, no toasts.
- The printed page contains:
  1. **Print header band** with:
     - Company name (from the signed-in user's company; falls back to "Hatchery Pro")
     - Sheet title: "Single-Stage Set Sheet" / "Multi-Stage Set Report"
     - Location / hatchery unit (from the setters used on the sheet; blank if none picked yet)
     - Set date, transfer date, hatch date, day of week, set colour name
     - Printed by: signed-in user's name (or email) — and their role
     - Printed on: date + time
  2. **Operation / This Set summary** — the same dates and counts, plus totals (buggies in, total eggs set, est. hatch, carry-overs, machines).
  3. **Set sheet section** — every setter card with its lines as entered (position/line no., flock, house, age, T/S, buggy size, eggs), each setter's footer totals, and a grand total row at the bottom.
  4. A small footer line: page number and "Printed from Hatchery Pro" for traceability.
- Blank lines print as blank lines so the sheet can be finished by hand.
- Landscape orientation, so wide setter cards are not clipped.

## Technical notes

- New `src/components/data-entry/SetSheetPrintHeader.tsx`: print-only header band (`hidden print:block`), takes company name, title, location, header dates/colour, totals, and the printing user.
- New `src/hooks/usePrintMeta.ts`: returns `{ companyName, userName, role, printedAt }` — reads `profile`/`userRoles` from `useAuth` and fetches `companies.name` by `profile.company_id` (react-query, cached). Falls back to "Hatchery Pro" if unavailable.
- Location is derived from the distinct `machines.location` / `unit` values of the setters present on the sheet (`useMultiStageOptions` already returns `location` and `unit_id`).
- Print styling via Tailwind `print:` utilities plus a small `@media print` block appended to `src/index.css`:
  - `@page { size: landscape; margin: 10mm; }`
  - hide app chrome (sidebar, top bar, floating elements) with a `print:hidden` class on layout wrappers; hide interactive-only bits (buttons, search box, fill-down/copy controls, progress bar, resume alert, notes placeholder hints)
  - force inputs/selects to render as flat text: remove borders/shadows/backgrounds, keep values readable, `-webkit-print-color-adjust: exact` for the set-colour chip and T/S badges
  - `break-inside: avoid` on each setter card so a setter never splits across pages
- `SingleStagePage.tsx` / `MultiStagePage.tsx`: add the Print button (`window.print()`), render `SetSheetPrintHeader` at the top of the printable region, and mark non-printing blocks with `print:hidden`.
- No changes to save logic, data model, or grid behaviour — display/print only.
