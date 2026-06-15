import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Download, FileSpreadsheet, Building2, Layers, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ExportService } from "@/services/exportService";
import { buildForecastTasks, useChecklistForecastData, type ForecastTask } from "@/hooks/useChecklistForecast";

interface ChecklistTaskExportProps {
  activeBatches: any[] | undefined;
  units: { id: string; name: string }[];
  hatcheryFilter: string;
  onHatcheryChange: (v: string) => void;
}

type GroupMode = 'house' | 'flock';

const HORIZONS = [
  { label: '3 Days', value: 3 },
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '21 Days', value: 21 },
];

const ChecklistTaskExport = ({
  activeBatches,
  units,
  hatcheryFilter,
  onHatcheryChange,
}: ChecklistTaskExportProps) => {
  const { toast } = useToast();
  const { items, completions, isLoading } = useChecklistForecastData();
  const [horizon, setHorizon] = useState(3);
  const [groupMode, setGroupMode] = useState<GroupMode>('house');

  const tasks = useMemo(
    () =>
      buildForecastTasks(
        { activeBatches, units, horizonDays: horizon, hatcheryFilter },
        items,
        completions
      ),
    [activeBatches, units, horizon, hatcheryFilter, items, completions]
  );

  // Group key + label depending on mode
  const groupKey = (t: ForecastTask) =>
    groupMode === 'house' ? t.batchNumber : `${t.flockNumber}|${t.flockName}`;
  const groupLabel = (t: ForecastTask) =>
    groupMode === 'house'
      ? `${t.batchNumber}${t.houseNumber ? ` · House ${t.houseNumber}` : ''}`
      : `Flock #${t.flockNumber} · ${t.flockName}`;

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; tasks: ForecastTask[] }>();
    for (const t of tasks) {
      const k = groupKey(t);
      if (!map.has(k)) map.set(k, { label: groupLabel(t), tasks: [] });
      map.get(k)!.tasks.push(t);
    }
    return Array.from(map.values());
  }, [tasks, groupMode]);

  const totalTasks = tasks.length;
  const requiredCount = tasks.filter((t) => t.isRequired).length;
  const pendingCount = tasks.filter((t) => t.status === 'Pending').length;

  const EXPORT_COLUMNS: Record<string, keyof ForecastTask> = {
    'Date': 'dayLabel',
    'Day of Incubation': 'dayOfIncubation',
    'House / Batch': 'batchNumber',
    'House #': 'houseNumber',
    'Flock #': 'flockNumber',
    'Flock': 'flockName',
    'Machine': 'machineNumber',
    'Hatchery': 'unitName',
    'Task': 'task',
    'Description': 'description',
    'Required': 'isRequired',
    'Status': 'status',
  };

  const toExportRows = (rows: ForecastTask[]) =>
    rows.map((t) => {
      const out: any = {};
      Object.entries(EXPORT_COLUMNS).forEach(([display, field]) => {
        let v: any = t[field];
        if (field === 'isRequired') v = v ? 'Required' : 'Optional';
        if (v === null || v === undefined) v = '';
        out[display] = v;
      });
      return out;
    });

  const handleExport = (multiSheet: boolean) => {
    if (tasks.length === 0) {
      toast({ title: 'Nothing to export', description: 'No tasks in the selected window.', variant: 'destructive' });
      return;
    }
    const scope = hatcheryFilter === 'all' ? 'all-hatcheries' : (units.find((u) => u.id === hatcheryFilter)?.name || 'hatchery').replace(/\s+/g, '-');
    const stamp = format(new Date(), 'yyyy-MM-dd');
    const fname = `daily-tasks_${scope}_${horizon}d_${stamp}`;

    try {
      if (multiSheet) {
        const sheets = grouped.map((g) => ({
          name: g.label,
          data: toExportRows(g.tasks),
          headers: Object.keys(EXPORT_COLUMNS),
        }));
        // Lead with a summary sheet
        sheets.unshift({
          name: 'Summary',
          data: grouped.map((g) => ({
            'Group': g.label,
            'Total Tasks': g.tasks.length,
            'Required': g.tasks.filter((t) => t.isRequired).length,
            'Pending': g.tasks.filter((t) => t.status === 'Pending').length,
          })),
          headers: ['Group', 'Total Tasks', 'Required', 'Pending'],
        } as any);
        ExportService.exportMultiSheet(sheets, fname);
      } else {
        ExportService.exportToExcel(toExportRows(tasks), fname, 'Daily Tasks', Object.keys(EXPORT_COLUMNS));
      }
      toast({ title: 'Export ready', description: `${tasks.length} tasks exported for the next ${horizon} days.` });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            Task Forecast & Export
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate the upcoming task list per house or flock and download it as Excel — filtered by hatchery and day range.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Hatchery */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Hatchery
              </Label>
              <Select value={hatcheryFilter} onValueChange={onHatcheryChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hatcheries</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Horizon */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Day Range
              </Label>
              <Select value={String(horizon)} onValueChange={(v) => setHorizon(parseInt(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HORIZONS.map((h) => (
                    <SelectItem key={h.value} value={String(h.value)}>{h.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grouping */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Group By
              </Label>
              <Tabs value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
                <TabsList className="grid grid-cols-2 h-9 w-full">
                  <TabsTrigger value="house" className="text-xs">Per House</TabsTrigger>
                  <TabsTrigger value="flock" className="text-xs">Per Flock</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Export */}
            <div className="space-y-1.5">
              <Label className="text-xs">Download Excel</Label>
              <div className="flex gap-2">
                <Button size="sm" className="h-9 flex-1" onClick={() => handleExport(true)} disabled={isLoading || tasks.length === 0}>
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                  By {groupMode === 'house' ? 'House' : 'Flock'}
                </Button>
                <Button size="sm" variant="outline" className="h-9" onClick={() => handleExport(false)} disabled={isLoading || tasks.length === 0} title="Single combined sheet">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="rounded-full">{totalTasks} total tasks</Badge>
            <Badge variant="outline" className="rounded-full text-red-600 border-red-300">{requiredCount} required</Badge>
            <Badge variant="outline" className="rounded-full text-amber-600 border-amber-300">{pendingCount} pending</Badge>
            <Badge variant="outline" className="rounded-full">{grouped.length} {groupMode === 'house' ? 'houses' : 'flocks'}</Badge>
            <Badge variant="outline" className="rounded-full">Next {horizon} days</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Loading tasks…</div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No tasks scheduled in this window for the selected hatchery.</p>
            </div>
          ) : (
            <ScrollArea className="h-[460px] pr-3">
              <div className="space-y-5">
                {grouped.map((g) => (
                  <div key={g.label}>
                    <div className="flex items-center justify-between mb-2 sticky top-0 bg-card py-1 z-10">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        {groupMode === 'house'
                          ? <Building2 className="h-4 w-4 text-primary/70" />
                          : <Layers className="h-4 w-4 text-primary/70" />}
                        {g.label}
                      </h4>
                      <Badge variant="secondary" className="text-xs rounded-full">{g.tasks.length} tasks</Badge>
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/60 text-muted-foreground">
                          <tr>
                            <th className="text-left font-medium px-3 py-2">Date</th>
                            <th className="text-left font-medium px-3 py-2">Day</th>
                            <th className="text-left font-medium px-3 py-2">Task</th>
                            <th className="text-left font-medium px-3 py-2 w-20">Type</th>
                            <th className="text-left font-medium px-3 py-2 w-24">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.tasks.map((t, i) => (
                            <tr key={`${t.itemId}-${t.date}-${i}`} className="border-t hover:bg-muted/30">
                              <td className="px-3 py-2 whitespace-nowrap">{t.dayLabel}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">Day {t.dayOfIncubation}</td>
                              <td className="px-3 py-2">{t.task}</td>
                              <td className="px-3 py-2">
                                {t.isRequired
                                  ? <Badge variant="destructive" className="text-[10px] px-1.5">Required</Badge>
                                  : <Badge variant="outline" className="text-[10px] px-1.5">Optional</Badge>}
                              </td>
                              <td className="px-3 py-2">
                                {t.status === 'Completed'
                                  ? <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> Done</span>
                                  : <span className="inline-flex items-center gap-1 text-muted-foreground"><Circle className="h-3 w-3" /> Pending</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChecklistTaskExport;
