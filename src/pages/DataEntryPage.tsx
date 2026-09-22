import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import DataTypeSelection from "@/components/dashboard/DataTypeSelection";
import WeeklyRollupView from "@/components/dashboard/WeeklyRollupView";
import FlockDrillDown from "@/components/dashboard/FlockDrillDown";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";
import { endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { useWeeklyFlockRollup } from "@/hooks/useWeeklyFlockRollup";

const parseWeek = (raw: string | null): Date => {
  if (raw) {
    try {
      const d = parseISO(raw);
      if (!Number.isNaN(d.getTime())) return startOfWeek(d, { weekStartsOn: 1 });
    } catch {
      /* ignore */
    }
  }
  return startOfWeek(new Date(), { weekStartsOn: 1 });
};

const DataEntryPage = () => {
  const { houseId } = useParams<{ houseId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);

  const urlFlock = searchParams.get("flock");
  const urlWeek = searchParams.get("week");

  const weekStart = useMemo(() => parseWeek(urlWeek), [urlWeek]);
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const weekISO = format(weekStart, "yyyy-MM-dd");

  const { hasWriteAccess } = usePermissions();
  const readOnly = !hasWriteAccess('data_entry');

  // Fetch this week's flocks so we can resolve ?flock=<key> back to a row.
  const { data: rollupRows } = useWeeklyFlockRollup({ weekStart, weekEnd });
  const drilldownRow = useMemo(
    () => (urlFlock ? (rollupRows ?? []).find((r) => r.key === urlFlock) ?? null : null),
    [rollupRows, urlFlock]
  );

  useEffect(() => {
    if (houseId) setSelectedHouseId(houseId);
  }, [houseId]);

  const updateSearch = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  const handleHouseSelect = (id: string) => setSelectedHouseId(id);
  const handleBackToHouseSelection = () => setSelectedHouseId(null);

  if (selectedHouseId) {
    return (
      <div className="p-6">
        <ReadOnlyBanner show={readOnly} />
        <DataTypeSelection
          houseId={selectedHouseId}
          onBack={handleBackToHouseSelection}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <ReadOnlyBanner show={readOnly} />

      {drilldownRow ? (
        <FlockDrillDown
          flock={drilldownRow}
          weekStart={weekStart}
          onBack={() => updateSearch({ flock: null })}
          onOpenHouse={handleHouseSelect}
        />
      ) : (
        <WeeklyRollupView
          anchor={weekStart}
          onAnchorChange={(d) =>
            updateSearch({
              week: format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd"),
            })
          }
          onOpenFlock={(row) =>
            updateSearch({ flock: row.key, week: weekISO })
          }
        />
      )}
    </div>
  );
};

export default DataEntryPage;
