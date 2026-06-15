import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { format, subDays } from "date-fns";
import { CalendarRange, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const RANGE_DAYS = 730; // 2 years of history

function offsetToDate(offset: number): Date {
  return subDays(new Date(), RANGE_DAYS - offset);
}

interface DateRangeSliderProps {
  value: { from?: Date; to?: Date };
  onChange: (range: { from?: Date; to?: Date }) => void;
  className?: string;
}

export function DateRangeSlider({ value, onChange, className }: DateRangeSliderProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [popoverStyle, setPopoverStyle] = React.useState<React.CSSProperties>({});

  const dateToOffset = (d?: Date): number => {
    if (!d) return RANGE_DAYS;
    const copy = new Date(d);
    const now = new Date();
    copy.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((now.getTime() - copy.getTime()) / 86400000);
    return Math.max(0, Math.min(RANGE_DAYS, RANGE_DAYS - diff));
  };

  const [sliderValues, setSliderValues] = React.useState<[number, number]>([
    dateToOffset(value.from),
    dateToOffset(value.to),
  ]);

  React.useEffect(() => {
    if (!value.from && !value.to) {
      setSliderValues([0, RANGE_DAYS]);
    }
  }, [value.from, value.to]);

  // Compute position from trigger button bounding rect when opening
  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left: rect.left,
        zIndex: 9999,
      });
    }
    setOpen((p) => !p);
  };

  const fromDate = offsetToDate(sliderValues[0]);
  const toDate = offsetToDate(sliderValues[1]);

  const isActive = value.from || value.to;
  const label = isActive
    ? `${format(fromDate, "MMM d")} – ${format(toDate, "MMM d")}`
    : "All dates";

  const handleSliderChange = (vals: number[]) => {
    const [a, b] = vals as [number, number];
    setSliderValues([a, b]);
    onChange({ from: offsetToDate(a), to: offsetToDate(b) });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSliderValues([0, RANGE_DAYS]);
    onChange({ from: undefined, to: undefined });
    setOpen(false);
  };

  const popover = open
    ? ReactDOM.createPortal(
        <>
          {/* Backdrop — closes on outside click */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />

          {/* Popover panel */}
          <div
            style={popoverStyle}
            className={cn(
              "w-72 p-4 rounded-xl",
              "bg-card border border-border/60 shadow-2xl",
              "animate-in fade-in-0 zoom-in-95"
            )}
          >
            {/* Date labels */}
            <div className="flex justify-between items-center mb-3">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">From</div>
                <div className="text-sm font-semibold">{format(fromDate, "MMM d, yyyy")}</div>
              </div>
              <div className="h-px w-6 bg-border/60 self-center" />
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">To</div>
                <div className="text-sm font-semibold">{format(toDate, "MMM d, yyyy")}</div>
              </div>
            </div>

            {/* Dual-handle slider */}
            <SliderPrimitive.Root
              min={0}
              max={RANGE_DAYS}
              step={1}
              value={sliderValues}
              onValueChange={handleSliderChange}
              className="relative flex w-full touch-none select-none items-center my-4"
            >
              <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
                <SliderPrimitive.Range className="absolute h-full bg-primary" />
              </SliderPrimitive.Track>
              <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-md cursor-grab active:cursor-grabbing" />
              <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-md cursor-grab active:cursor-grabbing" />
            </SliderPrimitive.Root>

            {/* Axis ticks — quarterly markers */}
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>{format(subDays(new Date(), RANGE_DAYS), "MMM yy")}</span>
              <span>{format(subDays(new Date(), RANGE_DAYS * 0.75), "MMM yy")}</span>
              <span>{format(subDays(new Date(), RANGE_DAYS * 0.5), "MMM yy")}</span>
              <span>{format(subDays(new Date(), RANGE_DAYS * 0.25), "MMM yy")}</span>
              <span>Today</span>
            </div>

            {/* Quick presets */}
            <div className="flex gap-1.5 mt-4 flex-wrap">
              {[
                { label: "Last 7d", days: 7 },
                { label: "Last 30d", days: 30 },
                { label: "Last 90d", days: 90 },
                { label: "Last 6m", days: 180 },
                { label: "Last 1y", days: 365 },
                { label: "All", days: RANGE_DAYS },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    const from = RANGE_DAYS - days;
                    setSliderValues([from, RANGE_DAYS]);
                    onChange({ from: offsetToDate(from), to: offsetToDate(RANGE_DAYS) });
                  }}
                  className="text-xs px-2.5 py-1 rounded-md border border-border/50 bg-muted/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <Button
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          "flex items-center gap-2 h-9 px-3 rounded-md border text-sm transition-colors",
          "bg-background border-border/50 hover:bg-muted/60",
          isActive && "border-primary/50 text-primary bg-primary/5"
        )}
      >
        <CalendarRange className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
        {isActive && (
          <span
            role="button"
            onClick={handleClear}
            className="ml-1 rounded-full hover:bg-primary/20 p-0.5"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {popover}
    </div>
  );
}
