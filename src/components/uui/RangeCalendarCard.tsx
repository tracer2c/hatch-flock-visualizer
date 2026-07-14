import { useMemo, useState } from "react";
import { format, subDays, startOfMonth, startOfWeek, endOfWeek, startOfYear } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DateRange = { from: Date; to: Date };

interface Preset {
  label: string;
  get: () => DateRange;
}

const buildPresets = (): Preset[] => {
  return [
    {
      label: "Today",
      get: () => {
        const n = new Date();
        return { from: n, to: n };
      },
    },
    {
      label: "Yesterday",
      get: () => {
        const y = subDays(new Date(), 1);
        return { from: y, to: y };
      },
    },
    {
      label: "This week",
      get: () => {
        const n = new Date();
        return {
          from: startOfWeek(n, { weekStartsOn: 1 }),
          to: endOfWeek(n, { weekStartsOn: 1 }),
        };
      },
    },
    {
      label: "Last week",
      get: () => {
        const n = subDays(new Date(), 7);
        return {
          from: startOfWeek(n, { weekStartsOn: 1 }),
          to: endOfWeek(n, { weekStartsOn: 1 }),
        };
      },
    },
    { label: "Last 7 days", get: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
    { label: "Last 30 days", get: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
    { label: "Month to date", get: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
    { label: "Year to date", get: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  ];
};

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
  align?: "start" | "center" | "end";
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
}

/**
 * Untitled UI-style Range Calendar Card. Preset rail on the left, calendar on
 * the right, apply/cancel footer. Wired to our design tokens.
 */
export function RangeCalendarCard({
  value,
  onChange,
  align = "end",
  className,
  buttonClassName,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const presets = useMemo(buildPresets, []);

  const activePresetIdx = useMemo(() => {
    return presets.findIndex((p) => {
      const r = p.get();
      return sameDay(r.from, draft.from) && sameDay(r.to, draft.to);
    });
  }, [presets, draft]);

  const commit = (r: DateRange) => {
    onChange(r);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(value);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-9 gap-2 font-medium", buttonClassName)}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn("text-sm", compact && "text-xs")}>
            {format(value.from, "MMM d")} – {format(value.to, "MMM d, yyyy")}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-auto p-0 pointer-events-auto overflow-hidden rounded-xl border shadow-xl bg-popover",
          className
        )}
        align={align}
      >
        <div className="flex flex-col md:flex-row">
          {/* Preset rail */}
          <div className="md:w-40 md:border-r border-b md:border-b-0 bg-muted/30 p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {presets.map((p, i) => {
              const active = i === activePresetIdx;
              return (
                <button
                  key={p.label}
                  onClick={() => setDraft(p.get())}
                  className={cn(
                    "text-left text-sm px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex-shrink-0",
                    active
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "text-foreground hover:bg-background"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Calendar + footer */}
          <div className="flex flex-col">
            <div className="p-2">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={{ from: draft.from, to: draft.to }}
                onSelect={(r: any) => {
                  if (r?.from && r?.to) setDraft({ from: r.from, to: r.to });
                  else if (r?.from) setDraft({ from: r.from, to: r.from });
                }}
                defaultMonth={draft.from}
                initialFocus
                className="p-0 pointer-events-auto"
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-muted/20">
              <div className="text-xs text-muted-foreground">
                {format(draft.from, "MMM d, yyyy")} – {format(draft.to, "MMM d, yyyy")}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="h-8"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => commit(draft)}
                  className="h-8"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
