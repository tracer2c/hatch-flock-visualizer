# Dynamic weekly worksheet summaries

## Goal
Replace the repeated Eggs Set / Injected / Clears / Chicks Hatched block with metrics that match the worksheet currently open.

## Changes
- Keep the existing flock, week, house-count, and status information at the top.
- Make the four summary cells configurable and update them from the values loaded or typed on the current sheet.
- Show these summaries:
  - **Egg Pack:** Sample Inspected, Grade A, Grade A %, Egg Pack Defects.
  - **Fertility:** Sample Size, Fertile Eggs, Fertility %, Infertile %.
  - **Residue:** Sample Size, Total Dead, Total Dead %, Culls.
  - **Clears / Injected / Hatch:** Sample Size, Injection %, Hatch %, HOI %.
- Calculate percentages from combined weekly totals, not by averaging individual house percentages.
- Keep summaries accurate when switching between **By house** and **Whole flock**.

## Technical details
- Extend the shared top summary to accept worksheet-specific labels and formatted values.
- Emit current totals from the by-house tables, whole-flock form, and clears sheet to their parent pages.
- Reuse existing formulas and loaded records; no database changes.
- Verify TypeScript and the relevant worksheet screens.
