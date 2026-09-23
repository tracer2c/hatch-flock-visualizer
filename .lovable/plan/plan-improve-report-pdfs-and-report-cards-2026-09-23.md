# Plan: Improve report PDFs and report cards

## What will change

1. **Fix clipped house names and table rows**
   - Update the PDF table renderer so long house names wrap inside the House column instead of being cut off.
   - Make each row height dynamic based on the tallest wrapped cell.
   - Keep page breaks safe so wrapped rows do not split awkwardly across pages.

2. **Make the PDF header feel more polished**
   - Replace the flat, low header area with a stronger report header: title, company name, date range, hatchery scope, printed-by, and generated time in a clearer grouped layout.
   - Give the header enough height and spacing so it looks intentional on page one.
   - Keep repeated headers on later pages compact.

3. **Improve red/green trend treatment**
   - Replace tiny trend text like `0.9` with larger, labeled trend badges.
   - Use clear labels such as `Down 0.9 pts`, `Up 1.2 pts`, or `Steady`.
   - Keep green for favorable movement and red for unfavorable movement, with neutral styling when there is no meaningful change.

4. **Add labeled visuals to page one**
   - Add simple report-native charts to the first page before the main table:
     - Current vs prior weighted fertility.
     - Current vs prior weekly hatch.
     - Current vs prior residue risk metrics such as contamination and late-dead.
   - Label each chart clearly so the client can understand it without reading the table.
   - Keep the table starting below the page-one visuals; continue table pages as needed.

5. **Fix report-page tile overflow**
   - Keep the existing simple report selection UI.
   - Adjust the report cards so buttons and labels stay inside each tile at the current screen size and smaller widths.
   - Allow button text to wrap or stack cleanly instead of extending beyond the card boundary.

## Technical details

- Update `ReportService.generateManagementReportPdf()` to support wrapped table cells, dynamic row heights, improved header layout, larger trend badges, and jsPDF-drawn chart blocks.
- Update the management reports card layout in `ReportsManager` only where needed to prevent overflow.
- Do not embed the uploaded screenshots; use them only as visual reference.

## Verification

- Generate at least one report PDF and visually inspect page one plus a table page for clipped text, readable headers, chart labels, and trend styling.
- Check the reports screen at the current preview width and a narrower width to confirm card actions stay inside the tiles.
