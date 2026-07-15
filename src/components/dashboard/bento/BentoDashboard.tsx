import { useState } from "react";
import { format } from "date-fns";
import { Egg, Plus, Pencil, Check, RotateCcw } from "lucide-react";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { BentoGrid } from "./BentoGrid";
import { AddWidgetSheet } from "./AddWidgetSheet";

export default function BentoDashboard() {
  const filters = useAnalyticsFilters();
  const { widgets, layouts, updateLayouts, addWidget, removeWidget, reset } = useDashboardLayout();
  const [editing, setEditing] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const rangeLabel = `${format(filters.dateFrom, "MMM d")} — ${format(filters.dateTo, "MMM d, yyyy")}`;

  return (
    <div className="h-full bg-[hsl(var(--bento-page))] px-4 md:px-6 pt-3 pb-3 flex flex-col overflow-hidden">
      <div className="mb-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg border-2 border-[hsl(var(--bento-ink))] bg-[hsl(var(--bento-lime))] p-1.5 shadow-[2px_2px_0_hsl(var(--bento-ink))]">
            <Egg className="h-4 w-4 text-[hsl(var(--bento-ink))]" />
          </div>
          <div>
            <h1 className="font-display font-black tracking-[-0.03em] text-xl md:text-2xl leading-tight text-[hsl(var(--bento-ink))]">
              Hatchery Dashboard
            </h1>
            <p className="text-[10px] md:text-xs text-[hsl(var(--bento-ink))]/70 leading-tight">
              {rangeLabel} · {widgets.length} widgets
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AnalyticsFilters showMode={false} />
          {editing && (
            <>
              <button
                onClick={() => setLibraryOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-[hsl(var(--bento-ink))] bg-[hsl(var(--bento-lime))] px-3 py-1.5 text-xs font-bold shadow-[3px_3px_0_hsl(var(--bento-ink))] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_hsl(var(--bento-ink))] transition-all text-[hsl(var(--bento-ink))]"
              >
                <Plus className="h-3.5 w-3.5" /> Add widget
              </button>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-[hsl(var(--bento-ink))] bg-white px-3 py-1.5 text-xs font-bold text-[hsl(var(--bento-ink))] hover:bg-[hsl(var(--bento-lavender))] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </>
          )}
          <button
            onClick={() => setEditing((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border-2 border-[hsl(var(--bento-ink))] px-3 py-1.5 text-xs font-bold shadow-[3px_3px_0_hsl(var(--bento-ink))] transition-all ${
              editing
                ? "bg-[hsl(var(--bento-ink))] text-[hsl(var(--bento-cream))]"
                : "bg-[hsl(var(--bento-lavender))] text-[hsl(var(--bento-ink))]"
            }`}
          >
            {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editing ? "Done" : "Customize"}
          </button>
        </div>
      </div>

      <BentoGrid
        widgets={widgets}
        layouts={layouts}
        editing={editing}
        onLayoutChange={updateLayouts}
        onRemove={removeWidget}
      />

      <AddWidgetSheet
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        active={widgets}
        onAdd={addWidget}
      />
    </div>
  );
}
