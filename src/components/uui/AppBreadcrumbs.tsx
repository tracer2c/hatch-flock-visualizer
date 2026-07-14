import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Untitled UI-style breadcrumbs derived automatically from the current route.
 * Keeps labels human-readable and links each ancestor.
 */

const STATIC_LABELS: Record<string, string> = {
  "": "Home",
  "data-entry": "Data Entry",
  "data-sheet": "Data Sheet",
  "embrex-data-sheet": "Embrex Data Sheet",
  "embrex-timeline": "Embrex Timeline",
  "qa-hub": "QA Hub",
  "qa-entry": "QA Entry",
  "residue-breakout": "Residue Breakout",
  "analytics": "Analytics",
  "live-tracking": "Live Tracking",
  "house-flow": "House Flow",
  "process-flow": "Process Flow",
  "machine-utilization": "Machine Utilization",
  "performance": "Performance",
  "management": "Management",
  "chat": "Smart Analytics",
  "checklist": "Checklist",
  "support": "Support",
  "profile": "Profile",
  "single-stage": "Single Stage",
  "multi-stage": "Multi Stage",
  "flock": "Weekly Flock Rollup",
  "hoi": "Hatch / HOI",
  "residue": "Residue",
  "fertility": "Fertility",
  "egg-pack": "Egg Pack",
  "clears-injected": "Clears & Injected",
  "hatcheries": "Hatcheries",
  "machines": "Machines",
  "flocks": "Flocks",
  "users": "Users",
  "reports": "Reports",
  "targets": "Targets",
  "sops": "SOPs",
  "sop-dashboard": "SOP Dashboard",
  "activity-log": "Activity Log",
  "archive": "Archive",
  "visual-options": "Visual Options",
  "house-automation": "House Automation",
  "residue-schedule": "Residue Schedule",
  "bulk-import": "Bulk Import",
  "documentation": "Documentation",
  "install": "Install",
};

function humanize(seg: string) {
  if (STATIC_LABELS[seg]) return STATIC_LABELS[seg];
  // ID-ish param — hide
  if (/^[0-9a-f-]{20,}$/i.test(seg)) return null;
  return seg
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AppBreadcrumbs({ className }: { className?: string }) {
  const location = useLocation();
  const params = useParams();
  const paramValues = new Set(Object.values(params).filter(Boolean) as string[]);

  const segments = location.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: { label: string; href: string }[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += "/" + seg;
    // skip raw URL param values that aren't in our label map
    if (paramValues.has(seg) && !STATIC_LABELS[seg]) continue;
    const label = humanize(seg);
    if (!label) continue;
    crumbs.push({ label, href: acc });
  }

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto",
        className
      )}
    >
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors flex-shrink-0"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Home</span>
      </Link>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={c.href} className="flex items-center gap-1.5 flex-shrink-0">
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            {isLast ? (
              <span className="text-foreground font-medium">{c.label}</span>
            ) : (
              <Link
                to={c.href}
                className="hover:text-foreground transition-colors"
              >
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
