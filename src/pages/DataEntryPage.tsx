import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import HouseManager from "@/components/dashboard/HouseManager";
import DataTypeSelection from "@/components/dashboard/DataTypeSelection";
import WeeklyRollupView from "@/components/dashboard/WeeklyRollupView";
import FlockDrillDown from "@/components/dashboard/FlockDrillDown";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WeeklyFlockRollupRow } from "@/hooks/useWeeklyFlockRollup";

type ViewMode = "weekly" | "houses";
const VIEW_KEY = "data-entry-view";

const DataEntryPage = () => {
  const { houseId } = useParams<{ houseId?: string }>();
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>(() => {
    try {
      const v = window.localStorage.getItem(VIEW_KEY);
      return v === "houses" ? "houses" : "weekly";
    } catch {
      return "weekly";
    }
  });
  const [drilldownFlock, setDrilldownFlock] = useState<WeeklyFlockRollupRow | null>(null);
  const { hasWriteAccess } = usePermissions();
  const readOnly = !hasWriteAccess('data_entry');

  useEffect(() => {
    if (houseId) setSelectedHouseId(houseId);
  }, [houseId]);

  const updateView = (v: ViewMode) => {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
    setDrilldownFlock(null);
  };

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

      <div className="flex justify-end">
        <Tabs value={view} onValueChange={(v) => updateView(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="weekly">Weekly Flock Rollup</TabsTrigger>
            <TabsTrigger value="houses">By House</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "weekly" ? (
        drilldownFlock ? (
          <FlockDrillDown
            flock={drilldownFlock}
            onBack={() => setDrilldownFlock(null)}
            onOpenHouse={handleHouseSelect}
          />
        ) : (
          <WeeklyRollupView onOpenFlock={(row) => setDrilldownFlock(row)} />
        )
      ) : (
        <HouseManager
          onHouseSelect={handleHouseSelect}
          selectedHouse={selectedHouseId}
        />
      )}
    </div>
  );
};

export default DataEntryPage;
