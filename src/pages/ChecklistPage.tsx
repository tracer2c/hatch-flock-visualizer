import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Wrench, CalendarDays, Settings2, ListChecks } from "lucide-react";
import MachineDailyChecklist from "@/components/dashboard/MachineDailyChecklist";
import ChecklistTaskExport from "@/components/dashboard/ChecklistTaskExport";
import SOPManager from "@/components/dashboard/SOPManager";
import { usePermissions } from "@/hooks/usePermissions";
import { ReadOnlyBanner } from "@/components/ui/read-only-banner";
import { useActiveBatches } from "@/hooks/useHouseData";
import { supabase } from "@/integrations/supabase/client";

const ChecklistPage = () => {
  const { houseId, machineId } = useParams();
  const { hasWriteAccess } = usePermissions();
  const readOnly = !hasWriteAccess('checklist');
  const canConfigure = hasWriteAccess('sop_manager');

  const { data: activeBatches } = useActiveBatches();
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [hatcheryFilter, setHatcheryFilter] = useState<string>('all');
  const [tab, setTab] = useState<string>('machine');

  useEffect(() => {
    document.title = "Daily Tasks | Hatchery Pro";
    const loadUnits = async () => {
      const { data } = await supabase.from('units').select('id, name').order('name');
      setUnits(data || []);
    };
    loadUnits();
  }, []);

  // Active house count for the selected hatchery (header chip)
  const houseCount = useMemo(() => {
    if (!activeBatches) return 0;
    return hatcheryFilter === 'all'
      ? activeBatches.length
      : activeBatches.filter((b: any) => b.unit_id === hatcheryFilter).length;
  }, [activeBatches, hatcheryFilter]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <ReadOnlyBanner show={readOnly} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center border border-primary/20">
            <ListChecks className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Daily Tasks</h1>
            <p className="text-sm text-muted-foreground">
              Run today's checklists, forecast upcoming work, and manage task configuration — all in one place.
            </p>
          </div>
        </div>

        {/* Global hatchery filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">{houseCount} active houses</span>
          <Select value={hatcheryFilter} onValueChange={setHatcheryFilter}>
            <SelectTrigger className="w-[180px] h-9 bg-background">
              <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="All Hatcheries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Hatcheries</SelectItem>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className={`grid w-full ${canConfigure ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="machine" className="flex items-center gap-1.5">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Machine Tasks</span>
            <span className="sm:hidden">Machine</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Forecast & Export</span>
            <span className="sm:hidden">Export</span>
          </TabsTrigger>
          {canConfigure && (
            <TabsTrigger value="config" className="flex items-center gap-1.5">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Configuration</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="machine" className="mt-6">
          <MachineDailyChecklist selectedMachineId={machineId} />
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <ChecklistTaskExport
            activeBatches={activeBatches}
            units={units}
            hatcheryFilter={hatcheryFilter}
            onHatcheryChange={setHatcheryFilter}
          />
        </TabsContent>

        {canConfigure && (
          <TabsContent value="config" className="mt-6">
            <SOPManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ChecklistPage;
