import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { startOfWeek, endOfWeek } from "date-fns";
import { parseLocalDate } from "@/utils/localDate";
import { useLatestBatchDate } from "@/hooks/useLatestBatchDate";

export type FilterMode = "flock" | "house";

export interface AnalyticsFilterState {
  dateFrom: Date;
  dateTo: Date;
  hatcheryIds: string[]; // empty = all
  flockIds: string[]; // empty = all
  houseIds: string[]; // empty = all
  mode: FilterMode;
}

interface AnalyticsFilterContextValue extends AnalyticsFilterState {
  setDateRange: (from: Date, to: Date) => void;
  setHatcheryIds: (ids: string[]) => void;
  setFlockIds: (ids: string[]) => void;
  setHouseIds: (ids: string[]) => void;
  setMode: (m: FilterMode) => void;
  jumpToWeekContaining: (date: Date) => void;
  reset: () => void;
  latestDataDate: string | null;
}

const STORAGE_KEY = "analytics-filters-v1";

const weekRange = (d: Date) => ({
  dateFrom: startOfWeek(d, { weekStartsOn: 1 }),
  dateTo: endOfWeek(d, { weekStartsOn: 1 }),
});

const defaultState = (): AnalyticsFilterState => {
  const { dateFrom, dateTo } = weekRange(new Date());
  return {
    dateFrom,
    dateTo,
    hatcheryIds: [],
    flockIds: [],
    houseIds: [],
    mode: "flock",
  };
};

const loadState = (): { state: AnalyticsFilterState; hadSaved: boolean } => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: defaultState(), hadSaved: false };
    const parsed = JSON.parse(raw);
    return {
      state: {
        dateFrom: new Date(parsed.dateFrom),
        dateTo: new Date(parsed.dateTo),
        hatcheryIds: parsed.hatcheryIds || [],
        flockIds: parsed.flockIds || [],
        houseIds: parsed.houseIds || [],
        mode: parsed.mode || "flock",
      },
      hadSaved: true,
    };
  } catch {
    return { state: defaultState(), hadSaved: false };
  }
};

const Ctx = createContext<AnalyticsFilterContextValue | null>(null);

export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadState());
  const [state, setState] = useState<AnalyticsFilterState>(initial.current.state);
  const { data: latestDate } = useLatestBatchDate();
  const autoAppliedRef = useRef(false);

  // If the user had no saved filter and their default "this week" range
  // contains no data, jump to the most recent week that does.
  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (initial.current.hadSaved) return;
    if (!latestDate) return;
    const latest = parseLocalDate(latestDate);
    if (!latest) return;
    if (latest >= state.dateFrom && latest <= state.dateTo) {
      autoAppliedRef.current = true;
      return;
    }
    const { dateFrom, dateTo } = weekRange(latest);
    setState((s) => ({ ...s, dateFrom, dateTo }));
    autoAppliedRef.current = true;
  }, [latestDate, state.dateFrom, state.dateTo]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          dateFrom: state.dateFrom.toISOString(),
          dateTo: state.dateTo.toISOString(),
        })
      );
    } catch {
      /* ignore */
    }
  }, [state]);

  const value = useMemo<AnalyticsFilterContextValue>(
    () => ({
      ...state,
      setDateRange: (from, to) => setState((s) => ({ ...s, dateFrom: from, dateTo: to })),
      setHatcheryIds: (ids) => setState((s) => ({ ...s, hatcheryIds: ids })),
      setFlockIds: (ids) => setState((s) => ({ ...s, flockIds: ids })),
      setHouseIds: (ids) => setState((s) => ({ ...s, houseIds: ids })),
      setMode: (m) => setState((s) => ({ ...s, mode: m })),
      jumpToWeekContaining: (date) => {
        const { dateFrom, dateTo } = weekRange(date);
        setState((s) => ({ ...s, dateFrom, dateTo }));
      },
      reset: () => setState(defaultState()),
      latestDataDate: latestDate ?? null,
    }),
    [state, latestDate]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAnalyticsFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAnalyticsFilters must be used within AnalyticsFilterProvider");
  return ctx;
}
