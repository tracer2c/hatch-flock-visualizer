import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Layouts } from "react-grid-layout";

export interface DashboardLayoutState {
  widgets: string[]; // ordered list of widget ids currently on the board
  layouts: Layouts; // react-grid-layout responsive layouts
}

export const DEFAULT_WIDGETS: string[] = [
  "eggs-hero",
  "metric-fertility",
  "metric-hatch",
  "houses-pipeline",
  "qa-alerts",
];

export const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: "eggs-hero", x: 0, y: 0, w: 7, h: 4, minW: 4, minH: 3 },
    { i: "metric-fertility", x: 7, y: 0, w: 5, h: 2, minW: 3, minH: 2 },
    { i: "metric-hatch", x: 7, y: 2, w: 5, h: 2, minW: 3, minH: 2 },
    { i: "houses-pipeline", x: 0, y: 4, w: 7, h: 4, minW: 4, minH: 3 },
    { i: "qa-alerts", x: 7, y: 4, w: 5, h: 4, minW: 3, minH: 3 },
  ],
  md: [
    { i: "eggs-hero", x: 0, y: 0, w: 10, h: 3 },
    { i: "metric-fertility", x: 0, y: 3, w: 5, h: 2 },
    { i: "metric-hatch", x: 5, y: 3, w: 5, h: 2 },
    { i: "houses-pipeline", x: 0, y: 5, w: 6, h: 4 },
    { i: "qa-alerts", x: 6, y: 5, w: 4, h: 4 },
  ],
  sm: [
    { i: "eggs-hero", x: 0, y: 0, w: 6, h: 3 },
    { i: "metric-fertility", x: 0, y: 3, w: 3, h: 2 },
    { i: "metric-hatch", x: 3, y: 3, w: 3, h: 2 },
    { i: "houses-pipeline", x: 0, y: 5, w: 6, h: 3 },
    { i: "qa-alerts", x: 0, y: 8, w: 6, h: 3 },
  ],
};

export function useDashboardLayout() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<string[]>(DEFAULT_WIDGETS);
  const [layouts, setLayouts] = useState<Layouts>(DEFAULT_LAYOUTS);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Load
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_dashboard_layouts")
        .select("layout, widgets")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const w = Array.isArray(data.widgets) ? (data.widgets as string[]) : DEFAULT_WIDGETS;
        const l = (data.layout && typeof data.layout === "object" ? data.layout : DEFAULT_LAYOUTS) as Layouts;
        setWidgets(w.length ? w : DEFAULT_WIDGETS);
        setLayouts(l);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const persist = useCallback(
    (nextWidgets: string[], nextLayouts: Layouts) => {
      if (!user) return;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        await supabase.from("user_dashboard_layouts").upsert(
          {
            user_id: user.id,
            widgets: nextWidgets,
            layout: nextLayouts as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }, 600);
    },
    [user]
  );

  const updateLayouts = useCallback(
    (next: Layouts) => {
      setLayouts(next);
      persist(widgets, next);
    },
    [widgets, persist]
  );

  const addWidget = useCallback(
    (id: string, size: { w: number; h: number }) => {
      if (widgets.includes(id)) return;
      const nextWidgets = [...widgets, id];
      const nextLayouts: Layouts = { ...layouts };
      (["lg", "md", "sm"] as const).forEach((bp) => {
        const cols = bp === "lg" ? 12 : bp === "md" ? 10 : 6;
        const maxY = Math.max(0, ...(nextLayouts[bp] || []).map((l) => l.y + l.h));
        nextLayouts[bp] = [
          ...(nextLayouts[bp] || []),
          { i: id, x: 0, y: maxY, w: Math.min(size.w, cols), h: size.h },
        ];
      });
      setWidgets(nextWidgets);
      setLayouts(nextLayouts);
      persist(nextWidgets, nextLayouts);
    },
    [widgets, layouts, persist]
  );

  const removeWidget = useCallback(
    (id: string) => {
      const nextWidgets = widgets.filter((w) => w !== id);
      const nextLayouts: Layouts = {};
      Object.keys(layouts).forEach((bp) => {
        nextLayouts[bp] = (layouts[bp] || []).filter((l) => l.i !== id);
      });
      setWidgets(nextWidgets);
      setLayouts(nextLayouts);
      persist(nextWidgets, nextLayouts);
    },
    [widgets, layouts, persist]
  );

  const reset = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    setLayouts(DEFAULT_LAYOUTS);
    persist(DEFAULT_WIDGETS, DEFAULT_LAYOUTS);
  }, [persist]);

  return { widgets, layouts, updateLayouts, addWidget, removeWidget, reset, loaded };
}
