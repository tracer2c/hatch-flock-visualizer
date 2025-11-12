import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  calculateHatchPercent, 
  calculateHOFPercent, 
  calculateIFPercent,
  calculateFertilityPercent
} from "@/utils/hatcheryFormulas";

interface FertilityAnalysisTabProps {
  data: any[];
  searchTerm: string;
  onDataUpdate: () => void;
}

export const FertilityAnalysisTab = ({ data, searchTerm, onDataUpdate }: FertilityAnalysisTabProps) => {
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const filteredData = data.filter(item => {
    const searchStr = searchTerm.toLowerCase();
    return (
      item.flock_name?.toLowerCase().includes(searchStr) ||
      item.flock_number?.toString().includes(searchStr) ||
      item.batch_number?.toLowerCase().includes(searchStr) ||
      item.house_number?.toLowerCase().includes(searchStr)
    );
  });

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({
      sample_size: record.sample_size || 648,
      fertile_eggs: record.fertile_eggs || 0,
      infertile_eggs: record.infertile_eggs || 0,
      early_dead: record.early_dead || 0,
      late_dead: record.late_dead || 0,
      technician_name: record.technician_name || '',
      notes: record.fertility_notes || '',
    });
  };

  const handleSave = async () => {
    try {
      const sampleSize = parseInt(formData.sample_size) || 648;
      const fertileEggs = parseInt(formData.fertile_eggs) || 0;
      const infertileEggs = parseInt(formData.infertile_eggs) || 0;
      const earlyDead = parseInt(formData.early_dead) || 0;
      const lateDead = parseInt(formData.late_dead) || 0;

      // Use standardized hatchery formulas
      const chicksHatched = Math.max(0, fertileEggs - earlyDead - lateDead);
      const fertilityPercent = calculateFertilityPercent(fertileEggs, sampleSize);
      const hatchPercent = calculateHatchPercent(chicksHatched, sampleSize);
      const hofPercent = calculateHOFPercent(chicksHatched, 0, fertileEggs);
      const hoiPercent = calculateHOFPercent(chicksHatched, 0, fertileEggs);
      const ifDevPercent = calculateIFPercent(infertileEggs, sampleSize);

      const { error } = await supabase
        .from("fertility_analysis")
        .update({
          sample_size: sampleSize,
          fertile_eggs: fertileEggs,
          infertile_eggs: infertileEggs,
          early_dead: earlyDead,
          late_dead: lateDead,
          fertility_percent: Number(fertilityPercent.toFixed(2)),
          hatch_percent: Number(hatchPercent.toFixed(2)),
          hof_percent: Number(hofPercent.toFixed(2)),
          hoi_percent: Number(hoiPercent.toFixed(2)),
          if_dev_percent: Number(ifDevPercent.toFixed(2)),
          technician_name: formData.technician_name || null,
          notes: formData.notes || null,
        })
        .eq("batch_id", editingRecord.batch_id);

      if (error) throw error;

      toast.success("Record updated successfully");
      setEditingRecord(null);
      onDataUpdate();
    } catch (error: any) {
      toast.error("Failed to update record: " + error.message);
    }
  };

  const handleDelete = async (batchId: string) => {
    if (!confirm("Are you sure you want to delete this fertility analysis record?")) return;

    try {
      const { error } = await supabase
        .from("fertility_analysis")
        .delete()
        .eq("batch_id", batchId);

      if (error) throw error;

      toast.success("Record deleted successfully");
      onDataUpdate();
    } catch (error: any) {
      toast.error("Failed to delete record: " + error.message);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flock #</TableHead>
              <TableHead>Flock Name</TableHead>
              <TableHead>House #</TableHead>
              <TableHead>Age (weeks)</TableHead>
              <TableHead>Set Date</TableHead>
              <TableHead>Analysis Date</TableHead>
              <TableHead>Sample Size</TableHead>
              <TableHead>Fertile</TableHead>
              <TableHead>Infertile</TableHead>
              <TableHead>Fertility %</TableHead>
              <TableHead>Early Dead</TableHead>
              <TableHead>Late Dead</TableHead>
              <TableHead>Hatch %</TableHead>
              <TableHead>HOF %</TableHead>
              <TableHead>HOI %</TableHead>
              <TableHead>I/F Dev %</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={20} className="text-center text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.batch_id}>
                  <TableCell>{item.flock_number || "-"}</TableCell>
                  <TableCell>{item.flock_name || "-"}</TableCell>
                  <TableCell>{item.house_number || "-"}</TableCell>
                  <TableCell>{item.age_weeks || "-"}</TableCell>
                  <TableCell>{item.set_date ? format(new Date(item.set_date), "MMM dd, yyyy") : "-"}</TableCell>
                  <TableCell>{item.analysis_date ? format(new Date(item.analysis_date), "MMM dd, yyyy") : "-"}</TableCell>
                  <TableCell>{item.sample_size || "-"}</TableCell>
                  <TableCell>{item.fertile_eggs || "0"}</TableCell>
                  <TableCell>{item.infertile_eggs || "0"}</TableCell>
                  <TableCell>{item.fertility_percent?.toFixed(1) || "0"}%</TableCell>
                  <TableCell>{item.early_dead || "0"}</TableCell>
                  <TableCell>{item.late_dead || "0"}</TableCell>
                  <TableCell>{item.hatch_percent?.toFixed(1) || "0"}%</TableCell>
                  <TableCell>{item.hof_percent?.toFixed(1) || "0"}%</TableCell>
                  <TableCell>{item.hoi_percent?.toFixed(1) || "0"}%</TableCell>
                  <TableCell>{item.if_dev_percent?.toFixed(1) || "0"}%</TableCell>
                  <TableCell>{item.technician_name || "-"}</TableCell>
                  <TableCell>{item.fertility_notes || "-"}</TableCell>
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
      </div>

      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Fertility Analysis</DialogTitle>
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
              <div className="space-y-2 col-span-2">
                <Label htmlFor="technician_name">Technician Name</Label>
                <Input
                  id="technician_name"
                  type="text"
                  value={formData.technician_name || ""}
                  onChange={(e) => setFormData({ ...formData, technician_name: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  type="text"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
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
    </>
  );
};
