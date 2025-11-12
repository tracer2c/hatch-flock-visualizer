import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, AlertCircle, Filter, ChevronDown, X } from "lucide-react";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  calculateHatchPercent, 
  calculateHOFPercent,
  calculateHOIPercent,
  calculateIFPercent,
  calculateChicksHatched,
  calculateFertileEggs,
  calculateFertilityPercent,
  calculateEmbryonicMortality
} from "@/utils/hatcheryFormulas";

interface ResidueBreakoutTableProps {
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

export const ResidueBreakoutTable = ({ data, searchTerm, filters, onDataUpdate }: ResidueBreakoutTableProps) => {
  const { showPercentages, formatValue } = usePercentageToggle();
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showFilters, setShowFilters] = useState(false);

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
        item.lab_technician?.toLowerCase().includes(techSearch)
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
      else if (['flock_number', 'age_weeks', 'residue_sample_size', 'sample_size', 'infertile_eggs', 'early_dead', 'mid_dead', 'late_dead', 'malformed_chicks'].includes(sortBy)) {
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
      sample_size: record.residue_sample_size || record.sample_size || 648,
      infertile_eggs: record.infertile_eggs || 0,
      early_dead: record.early_dead || 0,
      mid_dead: record.mid_dead || 0,
      late_dead: record.late_dead || 0,
      pipped_not_hatched: record.pipped_not_hatched || 0,
      contaminated_eggs: record.contaminated_eggs || 0,
      malformed_chicks: record.malformed_chicks || 0,
      malpositioned: record.malpositioned || 0,
      upside_down: record.upside_down || 0,
      dry_egg: record.dry_egg || 0,
      brain_defects: record.brain_defects || 0,
      transfer_crack: record.transfer_crack || 0,
      handling_cracks: record.handling_cracks || 0,
      abnormal: record.abnormal || 0,
      mold: record.mold || 0,
      live_pip_number: record.live_pip_number || 0,
      dead_pip_number: record.dead_pip_number || 0,
      mortality_count: record.mortality_count || 0,
      lab_technician: record.lab_technician || "",
      notes: record.residue_notes || "",
    });
  };

  const handleSave = async () => {
    if (!editingRecord) return;

    const sampleSize = parseInt(formData.sample_size) || 648;
    const infertileEggs = parseInt(formData.infertile_eggs) || 0;
    const earlyDead = parseInt(formData.early_dead) || 0;
    const midDead = parseInt(formData.mid_dead) || 0;
    const lateDead = parseInt(formData.late_dead) || 0;
    const malformedChicks = parseInt(formData.malformed_chicks) || 0;
    const livePipNumber = parseInt(formData.live_pip_number) || 0;
    const deadPipNumber = parseInt(formData.dead_pip_number) || 0;

    // Use standardized hatchery formulas
    const fertileEggs = calculateFertileEggs(sampleSize, infertileEggs);
    const chicksHatched = calculateChicksHatched(
      sampleSize, infertileEggs, earlyDead, midDead, lateDead, malformedChicks, livePipNumber, deadPipNumber
    );
    
    const fertilityPercent = calculateFertilityPercent(fertileEggs, sampleSize);
    const hatchPercent = calculateHatchPercent(chicksHatched, sampleSize);
    const hofPercent = calculateHOFPercent(chicksHatched, malformedChicks, fertileEggs);
    const hoiPercent = calculateHOIPercent(chicksHatched, editingRecord.eggs_injected || 0);
    const ifDevPercent = calculateIFPercent(infertileEggs, sampleSize);

    console.log("Residue - Attempting save:", {
      hasResidueId: !!editingRecord.residue_id,
      residueId: editingRecord.residue_id,
      batchId: editingRecord.batch_id,
      operation: editingRecord.residue_id ? "UPDATE" : "INSERT"
    });

    // Check if record exists (has residue_id) or needs to be created
    let error;
    if (editingRecord.residue_id) {
      // Update existing record
      const result = await supabase
        .from('residue_analysis')
        .update({
          sample_size: sampleSize,
          infertile_eggs: infertileEggs,
          fertile_eggs: fertileEggs,
          early_dead: earlyDead,
          mid_dead: midDead,
          late_dead: lateDead,
          pipped_not_hatched: parseInt(formData.pipped_not_hatched) || 0,
          contaminated_eggs: parseInt(formData.contaminated_eggs) || 0,
          malformed_chicks: malformedChicks,
          malpositioned: parseInt(formData.malpositioned) || 0,
          upside_down: parseInt(formData.upside_down) || 0,
          dry_egg: parseInt(formData.dry_egg) || 0,
          brain_defects: parseInt(formData.brain_defects) || 0,
          transfer_crack: parseInt(formData.transfer_crack) || 0,
          handling_cracks: parseInt(formData.handling_cracks) || 0,
          abnormal: parseInt(formData.abnormal) || 0,
          mold: parseInt(formData.mold) || 0,
          live_pip_number: livePipNumber,
          dead_pip_number: deadPipNumber,
          pip_number: livePipNumber + deadPipNumber,
          mortality_count: parseInt(formData.mortality_count) || 0,
          hatch_percent: hatchPercent,
          hof_percent: hofPercent,
          hoi_percent: hoiPercent,
          if_dev_percent: ifDevPercent,
          lab_technician: formData.lab_technician,
          notes: formData.notes,
        })
        .eq('id', editingRecord.residue_id);
      error = result.error;
      console.log("Residue - UPDATE result:", { error, data: result.data });
    } else {
      // Insert new record
      // Calculate total residue count
      const totalResidueCount = earlyDead + midDead + lateDead + malformedChicks + 
                                (parseInt(formData.pipped_not_hatched) || 0) + 
                                (parseInt(formData.contaminated_eggs) || 0);
      
      const result = await supabase
        .from('residue_analysis')
        .insert([{
          batch_id: editingRecord.batch_id,
          sample_size: sampleSize,
          total_residue_count: totalResidueCount,
          infertile_eggs: infertileEggs,
          fertile_eggs: fertileEggs,
          early_dead: earlyDead,
          mid_dead: midDead,
          late_dead: lateDead,
          pipped_not_hatched: parseInt(formData.pipped_not_hatched) || 0,
          contaminated_eggs: parseInt(formData.contaminated_eggs) || 0,
          malformed_chicks: malformedChicks,
          malpositioned: parseInt(formData.malpositioned) || 0,
          upside_down: parseInt(formData.upside_down) || 0,
          dry_egg: parseInt(formData.dry_egg) || 0,
          brain_defects: parseInt(formData.brain_defects) || 0,
          transfer_crack: parseInt(formData.transfer_crack) || 0,
          handling_cracks: parseInt(formData.handling_cracks) || 0,
          abnormal: parseInt(formData.abnormal) || 0,
          mold: parseInt(formData.mold) || 0,
          live_pip_number: livePipNumber,
          dead_pip_number: deadPipNumber,
          pip_number: livePipNumber + deadPipNumber,
          mortality_count: parseInt(formData.mortality_count) || 0,
          hatch_percent: hatchPercent,
          hof_percent: hofPercent,
          hoi_percent: hoiPercent,
          if_dev_percent: ifDevPercent,
          lab_technician: formData.lab_technician,
          notes: formData.notes,
        } as any]);
      error = result.error;
      console.log("Residue - INSERT result:", { error, data: result.data });
    }

    if (error) {
      const errorMessage = error.message || "Unknown error";
      const errorDetails = error.details || "";
      const errorHint = error.hint || "";
      toast.error(`Failed to update record: ${errorMessage}`);
      console.error("Residue - Full error:", { error, errorMessage, errorDetails, errorHint });
    } else {
      toast.success("Record updated successfully");
      setEditingRecord(null);
      onDataUpdate();
    }
  };

  const handleDelete = async (batchId: string) => {
    if (!confirm("Are you sure you want to delete this residue analysis record?")) return;

    const { error } = await supabase
      .from('residue_analysis')
      .delete()
      .eq('batch_id', batchId);

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
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flock #</TableHead>
              <TableHead>Flock Name</TableHead>
              <TableHead>House #</TableHead>
              <TableHead>Age (wks)</TableHead>
              <TableHead>Set Date</TableHead>
              <TableHead>Sample</TableHead>
              <TableHead>Infertile</TableHead>
              <TableHead>Chicks</TableHead>
              <TableHead>{showPercentages ? "Early Dead %" : "Early Dead"}</TableHead>
              <TableHead>{showPercentages ? "Mid Dead %" : "Mid Dead"}</TableHead>
              <TableHead>{showPercentages ? "Late Dead %" : "Late Dead"}</TableHead>
              <TableHead>{showPercentages ? "Cull Chicks %" : "Cull Chicks"}</TableHead>
              <TableHead>{showPercentages ? "Live Pips %" : "Live Pips"}</TableHead>
              <TableHead>{showPercentages ? "Dead Pips %" : "Dead Pips"}</TableHead>
              <TableHead>Total Pips</TableHead>
              <TableHead>{showPercentages ? "Embryonic Mortality %" : "Embryonic Mortality"}</TableHead>
              <TableHead>Mortality Count</TableHead>
              <TableHead>{showPercentages ? "Handling Cracks %" : "Handling Cracks"}</TableHead>
              <TableHead>{showPercentages ? "Transfer Crack %" : "Transfer Crack"}</TableHead>
              <TableHead>{showPercentages ? "Contamination %" : "Contamination"}</TableHead>
              <TableHead>{showPercentages ? "Mold %" : "Mold"}</TableHead>
              <TableHead>{showPercentages ? "Abnormal %" : "Abnormal"}</TableHead>
              <TableHead>{showPercentages ? "Brain Defects %" : "Brain Defects"}</TableHead>
              <TableHead>{showPercentages ? "DY Egg %" : "DY Egg"}</TableHead>
              <TableHead>{showPercentages ? "Malpositioned %" : "Malpositioned"}</TableHead>
              <TableHead>{showPercentages ? "Upside Down %" : "Upside Down"}</TableHead>
              <TableHead>Technician Name</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={25} className="text-center text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => {
                const sampleSize = item.residue_sample_size || item.sample_size || 648;
                return (
                  <TableRow key={item.batch_id}>
                    <TableCell>{item.flock_number || "-"}</TableCell>
                    <TableCell>{item.flock_name || "-"}</TableCell>
                    <TableCell>{item.house_number || "-"}</TableCell>
                    <TableCell>{item.age_weeks || "-"}</TableCell>
                    <TableCell>
                      {item.set_date ? format(new Date(item.set_date), "M/d/yyyy") : "-"}
                    </TableCell>
                    <TableCell>{sampleSize}</TableCell>
                    <TableCell>{formatValue(item.infertile_eggs, sampleSize)}</TableCell>
                    <TableCell>{item.chicks_hatched || "-"}</TableCell>
                    <TableCell>{formatValue(item.early_dead, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.mid_dead, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.late_dead, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.malformed_chicks, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.live_pip_number, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.dead_pip_number, sampleSize)}</TableCell>
                    <TableCell>{item.pip_number || 0}</TableCell>
                    <TableCell>
                      {(() => {
                        const embryonicMortality = calculateEmbryonicMortality(
                          item.early_dead || 0,
                          item.mid_dead || 0,
                          item.late_dead || 0,
                          item.live_pip_number || 0,
                          item.dead_pip_number || 0
                        );
                        return formatValue(embryonicMortality, sampleSize);
                      })()}
                    </TableCell>
                    <TableCell>{item.mortality_count || "-"}</TableCell>
                    <TableCell>{formatValue(item.handling_cracks, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.transfer_crack, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.contaminated_eggs, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.mold, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.abnormal, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.brain_defects, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.dry_egg, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.malpositioned, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.upside_down, sampleSize)}</TableCell>
                    <TableCell>{item.lab_technician || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.batch_id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

        <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Residue Analysis</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label>Sample Size</Label>
                <Input
                  type="number"
                  value={formData.sample_size || ''}
                  onChange={(e) => setFormData({ ...formData, sample_size: e.target.value })}
                />
              </div>
              <div>
                <Label>Infertile</Label>
                <Input
                  type="number"
                  value={formData.infertile_eggs || ''}
                  onChange={(e) => setFormData({ ...formData, infertile_eggs: e.target.value })}
                />
              </div>
              <div>
                <Label>Early Dead (0-7 days)</Label>
                <Input
                  type="number"
                  value={formData.early_dead || ''}
                  onChange={(e) => setFormData({ ...formData, early_dead: e.target.value })}
                />
              </div>
              <div>
                <Label>Mid Dead (8-14 days)</Label>
                <Input
                  type="number"
                  value={formData.mid_dead || ''}
                  onChange={(e) => setFormData({ ...formData, mid_dead: e.target.value })}
                />
              </div>
              <div>
                <Label>Late Dead (15-21 days)</Label>
                <Input
                  type="number"
                  value={formData.late_dead || ''}
                  onChange={(e) => setFormData({ ...formData, late_dead: e.target.value })}
                />
              </div>
              <div>
                <Label>Cull Chicks</Label>
                <Input
                  type="number"
                  value={formData.malformed_chicks || ''}
                  onChange={(e) => setFormData({ ...formData, malformed_chicks: e.target.value })}
                />
              </div>
              <div>
                <Label>Live Pips</Label>
                <Input
                  type="number"
                  value={formData.live_pip_number || ''}
                  onChange={(e) => setFormData({ ...formData, live_pip_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Dead Pips</Label>
                <Input
                  type="number"
                  value={formData.dead_pip_number || ''}
                  onChange={(e) => setFormData({ ...formData, dead_pip_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Total Pips (auto-calc)</Label>
                <Input
                  type="number"
                  disabled
                  value={(parseInt(formData.live_pip_number) || 0) + (parseInt(formData.dead_pip_number) || 0)}
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label>Embryonic Mortality (auto-calc)</Label>
                <Input
                  type="number"
                  value={(() => {
                    const earlyDead = parseInt(formData.early_dead) || 0;
                    const midDead = parseInt(formData.mid_dead) || 0;
                    const lateDead = parseInt(formData.late_dead) || 0;
                    const livePips = parseInt(formData.live_pip_number) || 0;
                    const deadPips = parseInt(formData.dead_pip_number) || 0;
                    return calculateEmbryonicMortality(earlyDead, midDead, lateDead, livePips, deadPips);
                  })()}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label>Mortality Count</Label>
                <Input
                  type="number"
                  value={formData.mortality_count || ''}
                  onChange={(e) => setFormData({ ...formData, mortality_count: e.target.value })}
                />
              </div>
              <div>
                <Label>Handling Cracks</Label>
                <Input
                  type="number"
                  value={formData.handling_cracks || ''}
                  onChange={(e) => setFormData({ ...formData, handling_cracks: e.target.value })}
                />
              </div>
              <div>
                <Label>Transfer Crack</Label>
                <Input
                  type="number"
                  value={formData.transfer_crack || ''}
                  onChange={(e) => setFormData({ ...formData, transfer_crack: e.target.value })}
                />
              </div>
              <div>
                <Label>Contamination</Label>
                <Input
                  type="number"
                  value={formData.contaminated_eggs || ''}
                  onChange={(e) => setFormData({ ...formData, contaminated_eggs: e.target.value })}
                />
              </div>
              <div>
                <Label>Mold</Label>
                <Input
                  type="number"
                  value={formData.mold || ''}
                  onChange={(e) => setFormData({ ...formData, mold: e.target.value })}
                />
              </div>
              <div>
                <Label>Abnormal</Label>
                <Input
                  type="number"
                  value={formData.abnormal || ''}
                  onChange={(e) => setFormData({ ...formData, abnormal: e.target.value })}
                />
              </div>
              <div>
                <Label>Brain Defects</Label>
                <Input
                  type="number"
                  value={formData.brain_defects || ''}
                  onChange={(e) => setFormData({ ...formData, brain_defects: e.target.value })}
                />
              </div>
              <div>
                <Label>DY Egg</Label>
                <Input
                  type="number"
                  value={formData.dry_egg || ''}
                  onChange={(e) => setFormData({ ...formData, dry_egg: e.target.value })}
                />
              </div>
              <div>
                <Label>Malpositioned</Label>
                <Input
                  type="number"
                  value={formData.malpositioned || ''}
                  onChange={(e) => setFormData({ ...formData, malpositioned: e.target.value })}
                />
              </div>
              <div>
                <Label>Upside Down</Label>
                <Input
                  type="number"
                  value={formData.upside_down || ''}
                  onChange={(e) => setFormData({ ...formData, upside_down: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditingRecord(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
};
