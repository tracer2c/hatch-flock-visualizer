import { Link, useLocation, matchPath } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTE_CRUMBS, type CrumbSpec } from "@/lib/breadcrumbRoutes";

interface ResolvedCrumb {
  label: string;
  href?: string;
}

function resolveSpec(
  spec: CrumbSpec,
  params: Record<string, string | undefined>
): ResolvedCrumb {
  const label =
    typeof spec.label === "function" ? spec.label(params) : spec.label;
  const href =
    typeof spec.href === "function" ? spec.href(params) : spec.href;
  return { label, href };
}

function humanize(seg: string) {
  return seg
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Untitled UI-style breadcrumbs derived from an explicit route → chain map.
 * Every href points to a route that actually exists; unknown parent
 * segments render as plain text instead of dead links.
 */
export function AppBreadcrumbs({ className }: { className?: string }) {
  const location = useLocation();
  const pathname = location.pathname;
  if (pathname === "/" || pathname === "") return null;

  // Find matching pattern (ordered — first match wins, so more specific patterns
  // must appear before their prefixes in ROUTE_CRUMBS).
  let crumbs: ResolvedCrumb[] = [];

  for (const entry of ROUTE_CRUMBS) {
    const match = matchPath({ path: entry.pattern, end: true }, pathname);
    if (match) {
      crumbs = entry.chain.map((spec) =>
        resolveSpec(spec, match.params as Record<string, string | undefined>)
      );
      break;
    }
  }

  // Fallback: build from URL segments (labels only, no links) if unmapped.
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
