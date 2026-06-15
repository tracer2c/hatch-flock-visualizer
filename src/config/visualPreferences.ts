/**
 * Central registry of toggleable columns for the Data Sheet.
 *
 * Each column has an `id` (matches the DB row field), a human-readable `label`
 * (shown in Visual Options), and `defaultHidden` (initial visibility for users
 * who haven't set an explicit preference).
 *
 * The Visual Options page reads this registry to render the toggle list.
 * Each data-sheet tab reads `isColumnHidden(sectionKey, columnId)` from
 * `useVisualPreferences` to decide whether to render its header + cell.
 *
 * To add a new toggleable column:
 *  1. Add an entry below in the appropriate section.
 *  2. Wrap the column's <TableHead> and <TableCell> in
 *     `{!isColumnHidden('<section>', '<id>') && (...)}`
 *  3. Adjust the empty-state colSpan if needed.
 */

export const PAGE_DATA_SHEET = "data_sheet" as const;

export type ColumnDef = {
  id: string;
  label: string;
  defaultHidden?: boolean;
};

export type SectionDef = {
  key: string;
  label: string;
  description?: string;
  columns: ColumnDef[];
};

export const DATA_SHEET_SECTIONS: SectionDef[] = [
  {
    key: "embrex_hoi",
    label: "Embrex / HOI",
    description: "Columns shown on the Embrex/HOI tab.",
    columns: [
      { id: "flock_number", label: "Flock #" },
      { id: "flock_name", label: "Flock Name" },
      { id: "house_number", label: "House #", defaultHidden: true },
      { id: "age_weeks", label: "Age (weeks)" },
      { id: "set_date", label: "Set Date" },
      { id: "total_eggs_set", label: "Total Eggs Set" },
      { id: "eggs_cleared", label: "Clears" },
      { id: "clear_percent", label: "Clear %" },
      { id: "eggs_injected", label: "Injected" },
      { id: "injected_percent", label: "Injected %" },
      { id: "machine_number", label: "Machine" },
      { id: "status", label: "Status" },
      { id: "technician_name", label: "Technician Name" },
      { id: "notes", label: "Notes" },
    ],
  },
  {
    key: "hatch_results",
    label: "Hatch Results",
    description: "Columns shown on the Hatch Results tab.",
    columns: [
      { id: "flock_number", label: "Flock #" },
      { id: "flock_name", label: "Flock Name" },
      { id: "age_weeks", label: "Age (weeks)" },
      { id: "house_number", label: "House #", defaultHidden: true },
      { id: "set_date", label: "Set Date" },
      { id: "sample_size", label: "Sample Size" },
      { id: "fertility_percent", label: "Fertility %" },
      { id: "hatch", label: "Hatch" },
      { id: "hatch_percent", label: "Hatch %" },
      { id: "hof_percent", label: "HOF %" },
      { id: "hoi_percent", label: "HOI %" },
      { id: "if_percent", label: "I/F %" },
      { id: "technician_name", label: "Technician Name" },
      { id: "notes", label: "Notes" },
    ],
  },
  {
    key: "qa_monitoring",
    label: "Quality Assurance",
    description: "Columns shown on the Quality Assurance tab.",
    columns: [
      { id: "flock_number", label: "Flock #" },
      { id: "flock_name", label: "Flock Name" },
      { id: "house_number", label: "House #" },
      { id: "age_weeks", label: "Age (wks)" },
      { id: "check_date", label: "Check Date" },
      { id: "day_of_incubation", label: "Day of Incubation" },
      { id: "temperature", label: "Temperature (°F)" },
      { id: "temp_avg_overall", label: "Temp Avg Overall" },
      { id: "temp_avg_front", label: "Temp Avg Front" },
      { id: "temp_avg_middle", label: "Temp Avg Middle" },
      { id: "temp_avg_back", label: "Temp Avg Back" },
      { id: "humidity", label: "Humidity (%)" },
      { id: "co2_level", label: "CO2 Level (ppm)" },
      { id: "ventilation_rate", label: "Ventilation Rate", defaultHidden: true },
      { id: "turning_frequency", label: "Turning Freq", defaultHidden: true },
      { id: "angle_top_left", label: "Angle Top L", defaultHidden: true },
      { id: "angle_mid_left", label: "Angle Mid L", defaultHidden: true },
      { id: "angle_bottom_left", label: "Angle Bot L", defaultHidden: true },
      { id: "angle_top_right", label: "Angle Top R", defaultHidden: true },
      { id: "angle_mid_right", label: "Angle Mid R", defaultHidden: true },
      { id: "angle_bottom_right", label: "Angle Bot R", defaultHidden: true },
      { id: "inspector_name", label: "Inspector" },
      { id: "notes", label: "Notes" },
    ],
  },
];

/** O(1) lookup helpers */
export const DATA_SHEET_SECTION_MAP: Record<string, SectionDef> = Object.fromEntries(
  DATA_SHEET_SECTIONS.map((s) => [s.key, s])
);

/** Returns the set of column IDs that are hidden by default for a section. */
export function getDefaultHiddenColumns(sectionKey: string): string[] {
  const section = DATA_SHEET_SECTION_MAP[sectionKey];
  if (!section) return [];
  return section.columns.filter((c) => c.defaultHidden).map((c) => c.id);
}
