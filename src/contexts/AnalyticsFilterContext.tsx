import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { startOfWeek, endOfWeek } from "date-fns";

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
  reset: () => void;
}

const STORAGE_KEY = "analytics-filters-v1";

const defaultState = (): AnalyticsFilterState => {
  const now = new Date();
  return {
    dateFrom: startOfWeek(now, { weekStartsOn: 1 }),
    dateTo: endOfWeek(now, { weekStartsOn: 1 }),
    hatcheryIds: [],
    flockIds: [],
    houseIds: [],
    mode: "flock",
  };
};

const loadState = (): AnalyticsFilterState => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      dateFrom: new Date(parsed.dateFrom),
      dateTo: new Date(parsed.dateTo),
      hatcheryIds: parsed.hatcheryIds || [],
      flockIds: parsed.flockIds || [],
      houseIds: parsed.houseIds || [],
      mode: parsed.mode || "flock",
    };
  } catch {
    return defaultState();
  }
};

const Ctx = createContext<AnalyticsFilterContextValue | null>(null);

export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AnalyticsFilterState>(() => loadState());

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
      reset: () => setState(defaultState()),
    }),
    [state]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAnalyticsFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAnalyticsFilters must be used within AnalyticsFilterProvider");
  return ctx;
}
