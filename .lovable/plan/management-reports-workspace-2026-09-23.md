# Management Reports Workspace

## Goal
Replace the current two-download-card screen with a clean report workbench for breeder and hatchery performance. The uploaded House Performance Report is a content reference only; it will not be embedded.

## Reports

### 1. Combined Fertility Report
- Show every hatchery on one printable sheet by default.
- Add an **All Hatcheries / specific hatchery** filter without changing the report structure.
- Group results by flock and house, with weekly fertility, change versus the prior comparable week, and clear up/down/steady indicators.
- Use weighted totals: combined fertile eggs divided by combined sample size, not an average of percentages.

### 2. House Performance Report
- Put the selected date range, flock number/name, house, hatchery, breed, and available grower context above one dense table.
- Include: eggs set, fertility and weighted average, residue contamination %, residue late-dead %, upside-down count, early-dead count, and weekly hatch %.
- Source egg set and hatch from set-sheet batch records; fertility from fertility entries; mortality, contamination, and upside-down from residue entries.
- Label unavailable grower information as “Not recorded” because no dedicated grower field currently exists.

### 3. Flock Comparison
- Allow searching and selecting 2–5 flocks.
- Add same-age guidance and an age filter while still allowing an intentional cross-age comparison.
- Compare the same core metrics side by side, with best/worst emphasis and deltas from the selected group.
- Support combined data plus hatchery-specific filtering.

## Shared Report Controls
- One top filter bar for report type, date range, hatchery, flock, and house; filters remain visible while reviewing results.
- Searchable selectors instead of long dropdowns, plus sensible weekly shortcuts.
- Loading, empty, partial-data, and error states that explain exactly what is missing.
- Print and PDF actions for each report; printed output includes company, hatchery scope, date range, logged-in user, generation date/time, and report title.

## Visual Direction
- Use the selected **Executive Neutral** palette with the existing semantic theme roles: restrained navy, teal-blue accents, pale cool surfaces, and white report paper.
- Use **Sora** headings and **Manrope** body/table text.
- Build the selected **Report Workbench** layout: compact control strip, summary row, then a full-width report table and supporting trend view.
- Remove the “Available Reports” section and avoid the current card-grid appearance. Use thin dividers, compact rows, aligned numbers, and minimal elevation for an enterprise SaaS feel.

## Technical Details
- Create a dedicated paginated report-data hook rather than the current 100-house query limit.
- Join batches to flocks, hatcheries, fertility, residue, and egg-pack data by batch; group by flock/house/date range and preserve hatchery identity from each batch.
- Recompute percentages from summed numerators and denominators. Hatch % uses chicks hatched ÷ eggs set; contamination and late-dead percentages use residue sample size.
- Treat upside-down as residue data, matching the field currently saved by the weekly residue sheet.
- Exclude archived records and avoid duplicate multiplication when several analysis rows exist for one set record.
- Keep the existing role-protected Reports access and read-only reporting behavior. No database change is required for the requested metrics; grower information remains unavailable until the client defines that field.

## Validation
- Verify All Hatcheries and single-hatchery totals, date boundaries, weighted calculations, and 2–5 flock selection.
- Verify empty/partial records, large datasets beyond 1,000 rows, print/PDF output, and mobile horizontal-table handling.
- Run the project type check and focused lint checks.
