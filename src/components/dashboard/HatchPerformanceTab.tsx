import { useState, useEffect, useMemo } from "react";
import { formatLocalDate } from "@/utils/localDate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Edit, Trash2, Filter, ChevronDown, X } from "lucide-react";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DataSheetViewModeToggle, type DataSheetViewMode } from "./DataSheetViewModeToggle";
import { aggregateHatchByFlock } from "@/utils/dataSheetAggregation";
import { FlockDetailEditor } from "@/components/data-sheet/FlockDetailEditor";

import {
  calculateHatchPercent,
  calculateHOFPercent,
  calculateHOIPercent,
  calculateIFPercent,
  calculateFertilityPercent
} from "@/utils/hatcheryFormulas";
import { useVisualPreferences } from "@/hooks/useVisualPreferences";

const SECTION = "hatch_results";

interface HatchPerformanceTabProps {
  data: any[];
  searchTerm: string;
  filters: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    selectedHatcheries: string[];
    selectedMachines: string[];
    technicianSearch: string;
    dateFrom: string;
    dateTo: string;
  };
  onDataUpdate: () => void;
  readOnly?: boolean;
  viewMode?: DataSheetViewMode;
  onViewModeChange?: (v: DataSheetViewMode) => void;
}

export const HatchPerformanceTab = ({ data, searchTerm, filters, onDataUpdate, readOnly, viewMode, onViewModeChange }: HatchPerformanceTabProps) => {
  const { formatPercentage, formatValue } = usePercentageToggle();
  const { isColumnHidden } = useVisualPreferences();
  const show = (col: string) => !isColumnHidden(SECTION, col);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [internalView, setInternalView] = useState<DataSheetViewMode>("rows");
  const view = viewMode ?? internalView;
  const setView = onViewModeChange ?? setInternalView;
  const [flockEditRow, setFlockEditRow] = useState<any>(null);


  // Apply filters to data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search term
    if (searchTerm) {
      const searchStr = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.flock_name?.toLowerCase().includes(searchStr) ||
        item.flock_number?.toString().includes(searchStr) ||
        item.batch_number?.toLowerCase().includes(searchStr) ||
        item.house_number?.toLowerCase().includes(searchStr)
      );
    }

    // Apply hatchery filter
    if (filters.selectedHatcheries.length > 0) {
      result = result.filter(item => 
        item.unit_id && filters.selectedHatcheries.includes(item.unit_id)
      );
    }

    // Apply machine filter
    if (filters.selectedMachines.length > 0) {
      result = result.filter(item => 
        item.machine_id && filters.selectedMachines.includes(item.machine_id)
      );
    }

    // Apply technician search
    if (filters.technicianSearch) {
      const techSearch = filters.technicianSearch.toLowerCase();
      result = result.filter(item => 
        item.technician_name?.toLowerCase().includes(techSearch)
      );
    }

    // Apply date range filter
    if (filters.dateFrom) {
      result = result.filter(item => item.set_date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      result = result.filter(item => item.set_date <= filters.dateTo);
    }

    // Apply sorting
    result.sort((a, b) => {
      const sortBy = filters.sortBy;
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle dates
      if (sortBy === 'set_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      // Handle numbers
      else if (['flock_number', 'age_weeks', 'sample_size', 'chicks_hatched', 'hatch_percent', 'hof_percent', 'hoi_percent', 'if_dev_percent'].includes(sortBy)) {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      // Handle strings (case insensitive)
      else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchTerm, filters]);

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({
      sample_size: record.sample_size || 648,
      fertile_eggs: record.fertile_eggs || 0,
      infertile_eggs: record.infertile_eggs || 0,
      early_dead: record.early_dead || 0,
      late_dead: record.late_dead || 0,
      technician_name: record.technician_name || "",
      notes: record.notes || "",
    });
  };

  const handleSave = async () => {
    if (!editingRecord) return;

    const sampleSize = parseInt(formData.sample_size) || 648;
    const fertileEggs = parseInt(formData.fertile_eggs) || 0;
    const infertileEggs = parseInt(formData.infertile_eggs) || 0;
    const earlyDead = parseInt(formData.early_dead) || 0;
    const lateDead = parseInt(formData.late_dead) || 0;

    // Use standardized hatchery formulas
    const chicksHatched = Math.max(0, fertileEggs - earlyDead - lateDead);
    const fertilityPercent = calculateFertilityPercent(fertileEggs, sampleSize);
    const hatchPercent = calculateHatchPercent(chicksHatched, sampleSize);
      const hofPercent = calculateHOFPercent(chicksHatched, fertileEggs);
      const hoiPercent = calculateHOFPercent(chicksHatched, fertileEggs);
    const ifDevPercent = calculateIFPercent(infertileEggs, fertileEggs);

    console.log("Hatch Performance - Attempting save:", {
      hasFertilityId: !!editingRecord.fertility_id,
      fertilityId: editingRecord.fertility_id,
      batchId: editingRecord.batch_id,
      operation: editingRecord.fertility_id ? "UPDATE" : "INSERT"
    });

    // Check if record exists (has fertility_id) or needs to be created
    let error;
    
    if (editingRecord.fertility_id) {
      // Update existing record
      const result = await supabase
        .from("fertility_analysis")
        .update({
          sample_size: sampleSize,
          fertile_eggs: fertileEggs,
          infertile_eggs: infertileEggs,
          early_dead: earlyDead,
          late_dead: lateDead,
          fertility_percent: fertilityPercent,
          hatch_percent: hatchPercent,
          hof_percent: hofPercent,
          hoi_percent: hoiPercent,
          if_dev_percent: ifDevPercent,
          technician_name: formData.technician_name,
          notes: formData.notes,
        })
        .eq("id", editingRecord.fertility_id);
      error = result.error;
      console.log("Hatch Performance - UPDATE result:", { error, data: result.data });
    } else {
      // Insert new record
      const result = await supabase
        .from("fertility_analysis")
        .insert([{
          batch_id: editingRecord.batch_id,
          sample_size: sampleSize,
          fertile_eggs: fertileEggs,
          infertile_eggs: infertileEggs,
          early_dead: earlyDead,
          late_dead: lateDead,
          fertility_percent: fertilityPercent,
          hatch_percent: hatchPercent,
          hof_percent: hofPercent,
          hoi_percent: hoiPercent,
          if_dev_percent: ifDevPercent,
          technician_name: formData.technician_name,
          notes: formData.notes,
        } as any]);
      error = result.error;
      console.log("Hatch Performance - INSERT result:", { error, data: result.data });
    }

    if (error) {
      const errorMessage = error.message || "Unknown error";
      const errorDetails = error.details || "";
      const errorHint = error.hint || "";
      toast.error(`Failed to update record: ${errorMessage}`);
      console.error("Hatch Performance - Full error:", { error, errorMessage, errorDetails, errorHint });
    } else {
      toast.success("Record updated successfully");
      setEditingRecord(null);
      onDataUpdate();
    }
  };

  const handleDelete = async (batchId: string) => {
    if (!confirm("Are you sure you want to delete this fertility analysis record?")) return;

    const { error } = await supabase
      .from("fertility_analysis")
      .delete()
      .eq("batch_id", batchId);

    if (error) {
      toast.error("Failed to delete record");
      console.error(error);
    } else {
      toast.success("Record deleted successfully");
      onDataUpdate();
    }
  };

  const displayData = useMemo(
    () => (view === "flock-summary" ? aggregateHatchByFlock(filteredData) : filteredData),
    [view, filteredData]
  );
  const isAggregated = view === "flock-summary";
  const showActions = !readOnly && !isAggregated;
  const showFlockActions = !readOnly && isAggregated;

  return (
    <TooltipProvider>
      <>
        {!onViewModeChange && <DataSheetViewModeToggle value={view} onChange={setView} />}
        {isAggregated && (
          <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            Aggregated view — one row per flock across all houses & hatcheries. Click <strong>Edit</strong> to maintain flock-level values, or switch to <strong>By House</strong> to edit per-house records.
          </div>
        )}
        <div className="rounded-md border">
        <Table>

        <TableHeader>
          <TableRow>
            {show("flock_number") && <TableHead>Flock#</TableHead>}
            {show("flock_name") && <TableHead>Flock Name</TableHead>}
            {show("age_weeks") && <TableHead className="text-right">Age (weeks)</TableHead>}
            {show("house_number") && <TableHead>House#</TableHead>}
            {show("set_date") && <TableHead>Set Date</TableHead>}
            {show("sample_size") && <TableHead className="text-right">Sample Size</TableHead>}
            {show("fertility_percent") && (
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  Fertility %
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="inline-flex" type="button">
                        <AlertCircle className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">Fertility Percentage</p>
                      <p className="text-sm">Formula: (Fertile Eggs / Sample Size) × 100</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
            )}
            {show("hatch") && <TableHead className="text-right">Hatch</TableHead>}
            {show("hatch_percent") && <TableHead className="text-right">Hatch %</TableHead>}
            {show("hof_percent") && (
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  HOF %
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="inline-flex" type="button">
                        <AlertCircle className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">Hatch of Fertile (HOF)</p>
                      <p className="text-sm">Formula: (Chicks Hatched / Fertile Eggs) × 100</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
            )}
            {show("hoi_percent") && (
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  HOI %
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="inline-flex" type="button">
                        <AlertCircle className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">Hatch of Injection (HOI)</p>
                      <p className="text-sm">Formula: (Chicks Hatched / Eggs Injected) × 100</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
            )}
            {show("if_percent") && (
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  I/F %
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="inline-flex" type="button">
                        <AlertCircle className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">Infertile Percentage (I/F)</p>
                      <p className="text-sm">Formula: (Infertile Eggs / Fertile Eggs) × 100</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
            )}
            {show("technician_name") && <TableHead>Technician Name</TableHead>}
            {show("notes") && <TableHead>Notes</TableHead>}
            {showActions && <TableHead>Actions</TableHead>}
            {showFlockActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={99} className="text-center text-muted-foreground">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            displayData.map((item) => (
              <TableRow
                key={item.batch_id}
                className={showActions ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/50"}
                onClick={showActions ? () => handleEdit(item) : undefined}
              >

                {show("flock_number") && <TableCell>{item.flock_number || "-"}</TableCell>}
                {show("flock_name") && <TableCell>{item.flock_name || "-"}</TableCell>}
                {show("age_weeks") && <TableCell className="text-right">{item.age_weeks || "-"}</TableCell>}
                {show("house_number") && (
                  <TableCell>
                    {item._flock_house_count > 1
                      ? <Badge variant="secondary">{item._flock_house_count} houses</Badge>
                      : (item.house_number || "-")}
                  </TableCell>
                )}

                {show("set_date") && <TableCell>{item.set_date ? formatLocalDate(item.set_date) : "-"}</TableCell>}
                {show("sample_size") && <TableCell className="text-right">{item.sample_size || "-"}</TableCell>}
                {show("fertility_percent") && (
                  <TableCell className="text-right">
                    {item.fertility_percent ? formatPercentage(item.fertility_percent) : "-"}
                  </TableCell>
                )}
                {show("hatch") && (
                  <TableCell className="text-right">
                    {item.chicks_hatched ? formatValue(item.chicks_hatched, item.sample_size) : "-"}
                  </TableCell>
                )}
                {show("hatch_percent") && (
                  <TableCell className="text-right">
                    {item.hatch_percent ? formatPercentage(item.hatch_percent) : "-"}
                  </TableCell>
                )}
                {show("hof_percent") && (
                  <TableCell className="text-right">
                    {item.hof_percent ? formatPercentage(item.hof_percent) : "-"}
                  </TableCell>
                )}
                {show("hoi_percent") && (
                  <TableCell className="text-right">
                    {item.eggs_injected > 0 && item.chicks_hatched >= 0
                      ? formatPercentage(calculateHOIPercent(item.chicks_hatched, item.eggs_injected))
                      : "N/A"}
                  </TableCell>
                )}
                {show("if_percent") && (
                  <TableCell className="text-right">
                    {item.if_dev_percent ? formatPercentage(item.if_dev_percent) : "-"}
                  </TableCell>
                )}
                {show("technician_name") && <TableCell>{item.technician_name || "-"}</TableCell>}
                {show("notes") && <TableCell className="max-w-xs truncate">{item.notes || "-"}</TableCell>}
                {showActions && (
                  <TableCell onClick={(e) => e.stopPropagation()}>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.batch_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
                {showFlockActions && (
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFlockEditRow(item)}
                      disabled={!item.flock_id || !item.set_date_week_start}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit Flock
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
        </Table>

        <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Fertility Analysis / Hatch Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>House: {editingRecord?.batch_number}</Label>
              <p className="text-sm text-muted-foreground">
                {editingRecord?.flock_name} (Flock #{editingRecord?.flock_number})
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sample_size">Sample Size</Label>
                <Input
                  id="sample_size"
                  type="number"
                  value={formData.sample_size || ""}
                  onChange={(e) => setFormData({ ...formData, sample_size: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fertile_eggs">Fertile Eggs</Label>
                <Input
                  id="fertile_eggs"
                  type="number"
                  value={formData.fertile_eggs || ""}
                  onChange={(e) => setFormData({ ...formData, fertile_eggs: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="infertile_eggs">Infertile Eggs</Label>
                <Input
                  id="infertile_eggs"
                  type="number"
                  value={formData.infertile_eggs || ""}
                  onChange={(e) => setFormData({ ...formData, infertile_eggs: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="early_dead">Early Dead</Label>
                <Input
                  id="early_dead"
                  type="number"
                  value={formData.early_dead || ""}
                  onChange={(e) => setFormData({ ...formData, early_dead: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="late_dead">Late Dead</Label>
                <Input
                  id="late_dead"
                  type="number"
                  value={formData.late_dead || ""}
                  onChange={(e) => setFormData({ ...formData, late_dead: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="technician_name">Technician Name</Label>
              <Input
                id="technician_name"
                value={formData.technician_name || ""}
                onChange={(e) => setFormData({ ...formData, technician_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingRecord(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={readOnly}>Save Changes</Button>
            </div>
          </div>
          </DialogContent>
        </Dialog>
      </div>

      <FlockDetailEditor
        open={!!flockEditRow}
        onOpenChange={(o) => !o && setFlockEditRow(null)}
        worksheetType="hatch_fertility"
        flock={
          flockEditRow
            ? {
                flock_id: flockEditRow.flock_id ?? null,
                flock_number: flockEditRow.flock_number,
                flock_name: flockEditRow.flock_name,
                set_date_week_start: flockEditRow.set_date_week_start ?? null,
                set_date: flockEditRow.set_date,
              }
            : null
        }
        aggregatedRow={flockEditRow}
        houseRows={flockEditRow?._house_rows ?? []}
        onSaved={onDataUpdate}
      />
    </>
    </TooltipProvider>
  );
};
