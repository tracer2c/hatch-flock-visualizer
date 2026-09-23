# Reports Page Restore + Detailed PDF Reports

## Goal
Bring the Management Reports screen back to the simpler previous page style, while making the downloaded reports much more detailed and professional.

## What will change on the Reports page
- Remove the full “workbench/select module” layout and sidebar-style report navigation.
- Restore a clean Reports page with separate report options, similar to the earlier card-based page.
- Keep clear separate download actions for:
  - House Performance Report
  - Combined Fertility Report
  - Flock Comparison Report
- Keep report filters practical and lightweight: date range, hatchery, flock/house where relevant, and 2–5 flock selection for comparisons.
- Do not make the on-screen page look like the final report document; the polished design belongs mainly in the PDF.

## PDF report design
- Build the PDF as the primary polished report experience.
- Add a summary section at the top of every PDF labeled only “Summary”.
- Keep the report detailed, with report-specific tables and metric sections.
- Use green and red trend styling in the PDF for up/down performance movement.
- Include company name, hatchery/location scope, selected date range, logged-in user, and generated date/time.
- Use the existing metrics already prepared for reports: eggs set, fertility, contamination, late dead, upside down, early dead, hatch percent, and weighted totals.

## Report-specific downloads

### House Performance Report
- Select date range, hatchery, flock, and house scope.
- Download a detailed by-house PDF with top summary, house metadata, metric totals, and a detailed table.

### Combined Fertility Report
- Allow All Hatcheries or one hatchery.
- Download one combined fertility PDF with hatchery breakout and weighted fertility totals.
- Show prior-period trend movement with green/red indicators.

### Flock Comparison Report
- Select 2–5 flocks.
- Download a side-by-side comparison PDF with the same core metrics, best/worst emphasis, and group deltas.

## Summary generation
- Add a server-side report-summary call so the app can generate a short executive summary from the selected report data.
- The user-facing PDF will label this simply as “Summary”; it will not say “AI summary”.
- If the summary request cannot run, the PDF will still download with a clear template-based summary instead of failing.

## Technical details
- Keep the existing paginated report-data hook and weighted calculations.
- Rework the Reports page presentation only; preserve the new report data aggregation behind it.
- Add a server-side function for report summaries so model credentials never appear in browser code.
- Use the current app report data as the input to the summary function, with concise output limits.
- Extend the PDF generation service so it creates structured PDF pages directly instead of relying only on a screenshot of the on-screen page.
- Preserve partial-data and empty-data states so missing fertility/residue rows are obvious.

## Validation
- Verify the Reports page looks like a simple reports/download page again.
- Verify each report type can be selected and downloaded separately.
- Verify PDFs include the Summary section, detailed tables, metadata, and green/red trend markers.
- Verify the PDF still downloads when the generated summary is unavailable.
