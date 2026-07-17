export type ChangelogTag = "New" | "Improved" | "Fixed";

export interface ChangelogEntry {
  version: string;
  releaseDate: string; // ISO date
  title: string;
  highlights: { tag: ChangelogTag; text: string }[];
}

/**
 * User-facing changelog. Newest entry first.
 * The FIRST entry is treated as the current release and triggers the
 * "What's New" dialog for users who haven't seen this version yet.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.3.0",
    releaseDate: "2026-07-17",
    title: "Cleaner navigation, smarter Data Sheet, and HatchAI",
    highlights: [
      { tag: "Improved", text: "Redesigned Data Sheet with a single-row toolbar, expandable search, and click-any-row to edit." },
      { tag: "Improved", text: "Machines filter now groups by hatchery with search and quick select, showing only relevant machines." },
      { tag: "Improved", text: "Slim collapsible sidebar with modern icons; brand moved to the top bar with no duplicates." },
      { tag: "Fixed", text: "Breadcrumbs are fully clickable and remember your selected week so Back never dumps you at the dashboard." },
      { tag: "New", text: "HatchAI Assistant (formerly Smart Analytics) with richer formatted answers and inline charts." },
      { tag: "Improved", text: "QA Hub: unified date selector, room-based Humidity with quick Add Room, and technician auto-filled from your profile." },
    ],
  },
  {
    version: "1.2.0",
    releaseDate: "2026-07-10",
    title: "Weekly Flock Rollup and flock-level entry",
    highlights: [
      { tag: "New", text: "Weekly Flock Rollup view with data-presence dots on the week picker." },
      { tag: "New", text: "Flock-scoped entry for Egg Pack, Fertility, Residue, and Clears & Injected." },
      { tag: "Improved", text: "HOF and HOI now fall back to batch totals when residue or fertility isn't captured yet." },
      { tag: "Fixed", text: "Whole-flock entries no longer lock you to House #1." },
    ],
  },
  {
    version: "1.1.0",
    releaseDate: "2026-07-01",
    title: "QA Hub reorganization",
    highlights: [
      { tag: "Improved", text: "QA Hub reorganized into Machine, Room, and Flock scopes for easier navigation." },
      { tag: "New", text: "Tray Wash form with 5 fixed PPM columns and temperature fields." },
      { tag: "Improved", text: "Resumable day-scoped entries so partial logs pick up where you left off." },
      { tag: "Fixed", text: "Hatch Progression Add Record now saves reliably." },
    ],
  },
];

export const CURRENT_VERSION = CHANGELOG[0].version;
