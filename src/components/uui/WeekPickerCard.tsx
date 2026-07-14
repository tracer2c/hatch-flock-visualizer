import { useMemo, useState } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  addMonths,
  isSameDay,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDatesWithBatches } from "@/hooks/useDatesWithBatches";
import { useLatestBatchDate } from "@/hooks/useLatestBatchDate";

interface Props {
  value: Date;
  onChange: (anchor: Date) => void;
  align?: "start" | "center" | "end";
  buttonClassName?: string;
}

interface Preset {
  label: string;
  get: () => Date | null;
}

export function WeekPickerCard({ value, onChange, align = "end", buttonClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value);
  const [displayMonth, setDisplayMonth] = useState<Date>(startOfMonth(value));

  const { data: latest } = useLatestBatchDate();

  // Fetch marked dates across the two visible months.
  const rangeFrom = useMemo(() => startOfMonth(displayMonth), [displayMonth]);
  const rangeTo = useMemo(() => endOfMonth(addMonths(displayMonth, 1)), [displayMonth]);
  const { data: markedDates } = useDatesWithBatches(rangeFrom, rangeTo);

  const presets: Preset[] = useMemo(
    () => [
      { label: "This week", get: () => new Date() },
      { label: "Last week", get: () => subDays(new Date(), 7) },
      { label: "2 weeks ago", get: () => subDays(new Date(), 14) },
      {
        label: "Most recent with data",
        get: () => (latest ? parseISO(latest) : null),
      },
      { label: "This month", get: () => startOfMonth(new Date()) },
    ],
    [latest]
  );

  const draftWeekStart = useMemo(() => startOfWeek(draft, { weekStartsOn: 1 }), [draft]);
  const draftWeekEnd = useMemo(() => endOfWeek(draft, { weekStartsOn: 1 }), [draft]);

  const commit = () => {
    onChange(draft);
    setOpen(false);
  };

  const valueWeekStart = startOfWeek(value, { weekStartsOn: 1 });
  const valueWeekEnd = endOfWeek(value, { weekStartsOn: 1 });

  const modifiers = {
    hasData: (d: Date) => !!markedDates?.has(format(d, "yyyy-MM-dd")),
    weekRange: (d: Date) =>
      isWithinInterval(d, { start: draftWeekStart, end: draftWeekEnd }) &&
      !isSameDay(d, draft),
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setDraft(value);
          setDisplayMonth(startOfMonth(value));
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-9 min-w-[240px] justify-start gap-2", buttonClassName)}>
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">
            {format(valueWeekStart, "MMM d")} – {format(valueWeekEnd, "MMM d, yyyy")}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto p-0 pointer-events-auto overflow-hidden rounded-xl border shadow-xl bg-popover"
      >
        <div className="flex flex-col md:flex-row">
          <div className="md:w-44 md:border-r border-b md:border-b-0 bg-muted/30 p-2 flex md:flex-col gap-1">
            {presets.map((p) => {
              const target = p.get();
              const disabled = !target;
              const active =
                !!target &&
                isSameDay(
                  startOfWeek(target, { weekStartsOn: 1 }),
                  startOfWeek(draft, { weekStartsOn: 1 })
                );
              return (
                <button
                  key={p.label}
                  disabled={disabled}
                  onClick={() => {
                    if (!target) return;
                    setDraft(target);
                    setDisplayMonth(startOfMonth(target));
                  }}
                  className={cn(
                    "text-left text-sm px-3 py-1.5 rounded-md transition-colors whitespace-nowrap",
                    disabled && "opacity-40 cursor-not-allowed",
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

          <div className="flex flex-col">
            <div className="p-2">
              <Calendar
                mode="single"
                selected={draft}
                onSelect={(d) => d && setDraft(d)}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                numberOfMonths={2}
                weekStartsOn={1}
                modifiers={modifiers}
                modifiersClassNames={{
                  hasData:
                    "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary",
                  weekRange: "bg-primary/10 text-foreground rounded-none",
                }}
                initialFocus
                className="p-0 pointer-events-auto"
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Week: {format(draftWeekStart, "MMM d")} – {format(draftWeekEnd, "MMM d, yyyy")}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-8">
                  Cancel
                </Button>
                <Button size="sm" onClick={commit} className="h-8">
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
