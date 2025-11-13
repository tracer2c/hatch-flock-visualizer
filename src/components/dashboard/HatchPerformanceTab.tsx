import { useState, useEffect, useMemo } from "react";
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
import { 
  calculateHatchPercent, 
  calculateHOFPercent, 
  calculateHOIPercent,
  calculateIFPercent,
  calculateFertilityPercent
} from "@/utils/hatcheryFormulas";

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
}

export const HatchPerformanceTab = ({ data, searchTerm, filters, onDataUpdate }: HatchPerformanceTabProps) => {
  const { formatPercentage, formatValue } = usePercentageToggle();
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

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

  return (
    <TooltipProvider>
      <>
        <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flock#</TableHead>
            <TableHead>Flock Name</TableHead>
            <TableHead className="text-right">Age (weeks)</TableHead>
            <TableHead>House#</TableHead>
            <TableHead>Set Date</TableHead>
            <TableHead className="text-right">Sample Size</TableHead>
            <TableHead className="text-right">Hatch</TableHead>
            <TableHead className="text-right">Hatch %</TableHead>
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
            <TableHead>Technician Name</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={17} className="text-center text-muted-foreground">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((item) => (
              <TableRow key={item.batch_id} className="hover:bg-muted/50">
                <TableCell>{item.flock_number || "-"}</TableCell>
                <TableCell>{item.flock_name || "-"}</TableCell>
                <TableCell className="text-right">{item.age_weeks || "-"}</TableCell>
                <TableCell>{item.house_number || "-"}</TableCell>
                <TableCell>{item.set_date ? new Date(item.set_date).toLocaleDateString() : "-"}</TableCell>
                <TableCell className="text-right">{item.sample_size || "-"}</TableCell>
                <TableCell className="text-right">
                  {item.chicks_hatched ? formatValue(item.chicks_hatched, item.sample_size) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {item.hatch_percent ? formatPercentage(item.hatch_percent) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {item.hof_percent ? formatPercentage(item.hof_percent) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {item.eggs_injected > 0 && item.chicks_hatched >= 0
                    ? formatPercentage(calculateHOIPercent(item.chicks_hatched, item.eggs_injected))
                    : "N/A"}
                </TableCell>
                <TableCell className="text-right">
                  {item.if_dev_percent ? formatPercentage(item.if_dev_percent) : "-"}
                </TableCell>
                <TableCell>{item.technician_name || "-"}</TableCell>
                <TableCell className="max-w-xs truncate">{item.notes || "-"}</TableCell>
                <TableCell>
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
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
    </TooltipProvider>
  );
};
