import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subDays,
  isSameDay,
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
  onChange: (d: Date) => void;
  align?: "start" | "center" | "end";
  buttonClassName?: string;
  maxDate?: Date;
  showDots?: boolean;
}

interface Preset {
  label: string;
  get: () => Date | null;
}

/**
 * Single-date picker — same UUI style as WeekPickerCard.
 * Shows a dot on days that have data (batches).
 */
export function DayPickerCard({
  value,
  onChange,
  align = "end",
  buttonClassName,
  maxDate = new Date(),
  showDots = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value);
  const [displayMonth, setDisplayMonth] = useState<Date>(startOfMonth(value));

  const { data: latest } = useLatestBatchDate();

  const rangeFrom = useMemo(() => startOfMonth(displayMonth), [displayMonth]);
  const rangeTo = useMemo(() => endOfMonth(addMonths(displayMonth, 1)), [displayMonth]);
  const { data: markedDates } = useDatesWithBatches(rangeFrom, rangeTo);

  const presets: Preset[] = useMemo(
    () => [
      { label: "Today", get: () => new Date() },
      { label: "Yesterday", get: () => subDays(new Date(), 1) },
      { label: "2 days ago", get: () => subDays(new Date(), 2) },
      { label: "1 week ago", get: () => subDays(new Date(), 7) },
      {
        label: "Most recent with data",
        get: () => (latest ? parseISO(latest) : null),
      },
    ],
    [latest]
  );

  const commit = () => {
    onChange(draft);
    setOpen(false);
  };

  const modifiers = showDots
    ? { hasData: (d: Date) => !!markedDates?.has(format(d, "yyyy-MM-dd")) }
    : undefined;

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
        <Button variant="outline" className={cn("h-9 min-w-[200px] justify-start gap-2", buttonClassName)}>
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{format(value, "MMM d, yyyy")}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto p-0 pointer-events-auto overflow-hidden rounded-xl border shadow-xl bg-popover"
      >
        <div className="flex flex-col md:flex-row">
          <div className="md:w-40 md:border-r border-b md:border-b-0 bg-muted/30 p-2 flex md:flex-col gap-1">
            {presets.map((p) => {
              const target = p.get();
              const disabled = !target;
              const active = !!target && isSameDay(target, draft);
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
                numberOfMonths={1}
                weekStartsOn={1}
                disabled={maxDate ? { after: maxDate } : undefined}
                modifiers={modifiers}
                modifiersClassNames={{
                  hasData:
                    "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary",
                }}
                initialFocus
                className="p-0 pointer-events-auto"
              />
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-muted/20">
              <div className="text-xs text-muted-foreground">{format(draft, "EEE, MMM d, yyyy")}</div>
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
