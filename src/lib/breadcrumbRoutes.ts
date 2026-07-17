/**
 * Route → breadcrumb chain map.
 *
 * Each chain segment declares a label (or a function that derives it from
 * URL params) and, if the segment corresponds to a real route in App.tsx,
 * an `href` (or href-builder). Segments without an href render as plain text.
 *
 * The last segment in a chain is always rendered as plain text regardless.
 */

export interface CrumbSpec {
  label: string | ((params: Record<string, string | undefined>) => string);
  href?: string | ((params: Record<string, string | undefined>) => string);
}

export interface RouteCrumbEntry {
  /** react-router path pattern */
  pattern: string;
  chain: CrumbSpec[];
}

// Order matters: more specific patterns first.
export const ROUTE_CRUMBS: RouteCrumbEntry[] = [
  // ── Data Entry ───────────────────────────────────────────────
  {
    pattern: "/data-entry/flock/:flockKey/hoi",
    chain: [
      { label: "Data Entry", href: "/data-entry" },
      { label: "Weekly Flock Rollup", href: "/data-entry" },
      { label: (p) => `Flock ${p.flockKey ?? ""}` },
      { label: "Hatch / HOI" },
    ],
  },
  {
    pattern: "/data-entry/flock/:flockKey/:section",
    chain: [
      { label: "Data Entry", href: "/data-entry" },
      { label: "Weekly Flock Rollup", href: "/data-entry" },
      { label: (p) => `Flock ${p.flockKey ?? ""}` },
      {
        label: (p) => {
          switch (p.section) {
            case "egg-pack":
              return "Egg Pack";
            case "fertility":
              return "Fertility";
            case "residue":
              return "Residue";
            case "clears-injected":
              return "Clears & Injected";
            default:
              return p.section ?? "";
          }
        },
      },
    ],
  },
  {
    pattern: "/data-entry/house/:houseId/:section",
    chain: [
      { label: "Data Entry", href: "/data-entry" },
      { label: (p) => `House #${p.houseId?.slice(0, 6) ?? ""}` },
      {
        label: (p) => {
          switch (p.section) {
            case "egg-pack":
              return "Egg Pack";
            case "fertility":
              return "Fertility";
            case "residue":
              return "Residue";
            case "clears-injected":
              return "Clears & Injected";
            case "qa":
              return "QA Entry";
            default:
              return p.section ?? "";
          }
        },
      },
    ],
  },
  {
    pattern: "/data-entry/house/:houseId",
    chain: [
      { label: "Data Entry", href: "/data-entry" },
      { label: (p) => `House #${p.houseId?.slice(0, 6) ?? ""}` },
    ],
  },
  { pattern: "/data-entry", chain: [{ label: "Data Entry" }] },

  // ── QA Hub ───────────────────────────────────────────────────
  { pattern: "/qa-hub", chain: [{ label: "QA Hub" }] },

  // ── Checklist ────────────────────────────────────────────────
  {
    pattern: "/checklist/house/:houseId",
    chain: [
      { label: "Checklist", href: "/checklist" },
      { label: (p) => `House #${p.houseId?.slice(0, 6) ?? ""}` },
    ],
  },
  {
    pattern: "/checklist/machine/:machineId",
    chain: [
      { label: "Checklist", href: "/checklist" },
      { label: (p) => `Machine ${p.machineId?.slice(0, 6) ?? ""}` },
    ],
  },
  { pattern: "/checklist", chain: [{ label: "Checklist" }] },

  // ── Management ───────────────────────────────────────────────
  { pattern: "/management/sop-dashboard", chain: [{ label: "Management", href: "/management" }, { label: "SOP Dashboard" }] },
  { pattern: "/management/hatcheries", chain: [{ label: "Management", href: "/management" }, { label: "Hatcheries" }] },
  { pattern: "/management/rooms", chain: [{ label: "Management", href: "/management" }, { label: "Rooms" }] },
  { pattern: "/management/house-automation", chain: [{ label: "Management", href: "/management" }, { label: "House Automation" }] },
  { pattern: "/management/sop-manager", chain: [{ label: "Management", href: "/management" }, { label: "SOP Manager" }] },
  { pattern: "/management/flocks", chain: [{ label: "Management", href: "/management" }, { label: "Flocks" }] },
  { pattern: "/management/machines", chain: [{ label: "Management", href: "/management" }, { label: "Machines" }] },
  { pattern: "/management/users", chain: [{ label: "Management", href: "/management" }, { label: "Users" }] },
  { pattern: "/management/targets", chain: [{ label: "Management", href: "/management" }, { label: "Targets" }] },
  { pattern: "/management/residue-schedule", chain: [{ label: "Management", href: "/management" }, { label: "Residue Schedule" }] },
  { pattern: "/management/reports", chain: [{ label: "Management", href: "/management" }, { label: "Reports" }] },
  { pattern: "/management/activity-log", chain: [{ label: "Management", href: "/management" }, { label: "Activity Log" }] },
  { pattern: "/management/visual-options", chain: [{ label: "Management", href: "/management" }, { label: "Visual Options" }] },
  { pattern: "/management/archive", chain: [{ label: "Management", href: "/management" }, { label: "Archive" }] },
  { pattern: "/management", chain: [{ label: "Management" }] },

  // ── Analytics / Ops ──────────────────────────────────────────
  { pattern: "/analytics", chain: [{ label: "Analytics" }] },
  { pattern: "/performance", chain: [{ label: "Analytics", href: "/analytics" }, { label: "Performance" }] },
  { pattern: "/process-flow", chain: [{ label: "Analytics", href: "/analytics" }, { label: "Process Flow" }] },
  { pattern: "/house-flow", chain: [{ label: "Analytics", href: "/analytics" }, { label: "House Flow" }] },
  { pattern: "/embrex-data-sheet", chain: [{ label: "Embrex Data Sheet" }] },
  { pattern: "/embrex-timeline", chain: [{ label: "Embrex Timeline" }] },
  { pattern: "/live-tracking", chain: [{ label: "Live Tracking" }] },
  { pattern: "/machine-utilization", chain: [{ label: "Machine Utilization" }] },
  { pattern: "/residue-breakout", chain: [{ label: "Residue Breakout" }] },
  { pattern: "/multi-stage", chain: [{ label: "Multi Stage" }] },
  { pattern: "/single-stage", chain: [{ label: "Single Stage" }] },
  { pattern: "/bulk-import", chain: [{ label: "Bulk Import" }] },
  { pattern: "/chat", chain: [{ label: "HatchAI Assistant" }] },
  { pattern: "/documentation", chain: [{ label: "Documentation" }] },
  { pattern: "/profile", chain: [{ label: "Profile" }] },
];
