import { useMemo, useState } from "react";
import { Building2, Egg, Home, Check, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext";
import { useUnitsData, useHousesData } from "@/hooks/useHousesData";
import { RangeCalendarCard } from "@/components/uui/RangeCalendarCard";


function useFlocks() {
  return useQuery({
    queryKey: ["filters-flocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flocks")
        .select("id, flock_number, flock_name")
        .is("archived_at", null)
        .order("flock_number", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

interface MultiSelectProps {
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  allLabel: string;
}

function MultiSelect({ label, icon, options, selected, onChange, allLabel }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? "1 selected"
      : `${selected.length} selected`;
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 justify-between gap-2 min-w-[160px]">
          <span className="flex items-center gap-2 text-sm">
            {icon}
            <span className="truncate">{summary}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 pointer-events-auto" align="end">
        <div className="text-xs font-medium text-muted-foreground px-2 py-1">{label}</div>
        <div className="max-h-64 overflow-y-auto">
          <button
            className={cn(
              "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2",
              selected.length === 0 && "font-medium"
            )}
            onClick={() => {
              onChange([]);
              setOpen(false);
            }}
          >
            <Check className={cn("h-3.5 w-3.5", selected.length === 0 ? "opacity-100" : "opacity-0")} />
            {allLabel}
          </button>
          {options.map((opt) => {
            const isSel = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center gap-2"
                onClick={() => toggle(opt.value)}
              >
                <Check className={cn("h-3.5 w-3.5", isSel ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  showMode?: boolean;
  compact?: boolean;
}

export function AnalyticsFilters({ showMode = true, compact = false }: Props) {
  const filters = useAnalyticsFilters();
  const { data: units = [] } = useUnitsData();
  const { data: flocks = [] } = useFlocks();
  const { data: houses = [] } = useHousesData();

  const filteredHouses = useMemo(() => {
    if (filters.hatcheryIds.length === 0) return houses;
    return houses.filter((h: any) => h.unit_id && filters.hatcheryIds.includes(h.unit_id));
  }, [houses, filters.hatcheryIds]);

  const hatcheryOptions = units.map((u: any) => ({ value: u.id, label: u.name }));
  const flockOptions = flocks.map((f: any) => ({
    value: f.id,
    label: `#${f.flock_number}${f.flock_name ? ` — ${f.flock_name}` : ""}`,
  }));
  const houseOptions = filteredHouses.map((h: any) => ({
    value: h.id,
    label: `${h.batch_number}${h.house_number ? ` · H${h.house_number}` : ""}`,
  }));

  const activeCount =
    filters.hatcheryIds.length + filters.flockIds.length + filters.houseIds.length;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "text-xs")}>
      <RangeCalendarCard
        value={{ from: filters.dateFrom, to: filters.dateTo }}
        onChange={(r) => filters.setDateRange(r.from, r.to)}
        compact={compact}
      />


      <MultiSelect
        label="Hatcheries"
        icon={<Building2 className="h-3.5 w-3.5" />}
        options={hatcheryOptions}
        selected={filters.hatcheryIds}
        onChange={filters.setHatcheryIds}
        allLabel="All hatcheries"
      />

      {showMode && (
        <ToggleGroup
          type="single"
          size="sm"
          value={filters.mode}
          onValueChange={(v) => v && filters.setMode(v as any)}
          className="border rounded-md"
        >
          <ToggleGroupItem value="flock" className="h-9 px-3 text-xs">
            <Egg className="h-3 w-3 mr-1" /> Flock
          </ToggleGroupItem>
          <ToggleGroupItem value="house" className="h-9 px-3 text-xs">
            <Home className="h-3 w-3 mr-1" /> House
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      {filters.mode === "flock" ? (
        <MultiSelect
          label="Flocks"
          icon={<Egg className="h-3.5 w-3.5" />}
          options={flockOptions}
          selected={filters.flockIds}
          onChange={filters.setFlockIds}
          allLabel="All flocks"
        />
      ) : (
        <MultiSelect
          label="Houses"
          icon={<Home className="h-3.5 w-3.5" />}
          options={houseOptions}
          selected={filters.houseIds}
          onChange={filters.setHouseIds}
          allLabel="All houses"
        />
      )}

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={filters.reset}>
          Clear
          <Badge variant="secondary" className="ml-1 h-4 px-1.5">
            {activeCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}
