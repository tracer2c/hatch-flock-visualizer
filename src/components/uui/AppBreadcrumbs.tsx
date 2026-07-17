import { Link, useLocation, matchPath } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTE_CRUMBS, type CrumbSpec, type CrumbContext } from "@/lib/breadcrumbRoutes";

interface ResolvedCrumb {
  label: string;
  href?: string;
}

function resolveSpec(spec: CrumbSpec, ctx: CrumbContext): ResolvedCrumb {
  const label = typeof spec.label === "function" ? spec.label(ctx) : spec.label;
  const href = typeof spec.href === "function" ? spec.href(ctx) : spec.href;
  return { label, href };
}

function humanize(seg: string) {
  return seg
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Untitled UI-style breadcrumbs derived from an explicit route → chain map.
 * Every href points to a URL that actually exists; unknown parent segments
 * render as plain text instead of dead links.
 */
export function AppBreadcrumbs({ className }: { className?: string }) {
  const location = useLocation();
  const pathname = location.pathname;
  const search = new URLSearchParams(location.search);
  if (pathname === "/" || pathname === "") return null;

  let crumbs: ResolvedCrumb[] = [];

  // Special case: /data-entry with ?flock=… is the flock drill-down view.
  if (pathname === "/data-entry" && search.get("flock")) {
    const week = search.get("week");
    const flockKey = search.get("flock") ?? "";
    const rollupQs = new URLSearchParams({ view: "weekly" });
    if (week) rollupQs.set("week", week);
    crumbs = [
      { label: "Weekly Flock Rollup", href: `/data-entry?${rollupQs.toString()}` },
      { label: `Flock ${flockKey}` },
    ];
  } else {
    for (const entry of ROUTE_CRUMBS) {
      const match = matchPath({ path: entry.pattern, end: true }, pathname);
      if (match) {
        const ctx: CrumbContext = {
          params: match.params as Record<string, string | undefined>,
          search,
        };
        crumbs = entry.chain.map((spec) => resolveSpec(spec, ctx));
        break;
      }
    }
  }

  if (crumbs.length === 0) {
    const segments = pathname.split("/").filter(Boolean);
    crumbs = segments.map((seg) => ({ label: humanize(seg) }));
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
          <span
            key={`${i}-${c.label}`}
            className="flex items-center gap-1.5 flex-shrink-0"
          >
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            {isLast || !c.href ? (
              <span
                className={cn(
                  isLast ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {c.label}
              </span>
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
