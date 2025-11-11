import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Edit, Trash2 } from "lucide-react";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HatchPerformanceTabProps {
  data: any[];
  searchTerm: string;
  onDataUpdate: () => void;
}

export const HatchPerformanceTab = ({ data, searchTerm, onDataUpdate }: HatchPerformanceTabProps) => {
  const { formatPercentage, formatValue } = usePercentageToggle();
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const filteredData = data.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const calculateWeek = (setDate: string) => {
    const date = new Date(setDate);
    const oneJan = new Date(date.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({
      sample_size: record.sample_size || 648,
      fertile_eggs: record.fertile_eggs || 0,
      infertile_eggs: record.infertile_eggs || 0,
      early_dead: record.early_dead || 0,
      late_dead: record.late_dead || 0,
      cull_chicks: record.cull_chicks || 0,
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
    const cullChicks = parseInt(formData.cull_chicks) || 0;

    const chicksHatched = Math.max(0, fertileEggs - earlyDead - lateDead - cullChicks);
    const fertilityPercent = sampleSize > 0 ? (fertileEggs / sampleSize) * 100 : 0;
    const hatchPercent = fertileEggs > 0 ? (chicksHatched / fertileEggs) * 100 : 0;
    const hofPercent = fertileEggs > 0 ? (chicksHatched / fertileEggs) * 100 : 0;
    const hoiPercent = fertileEggs > 0 ? ((chicksHatched + cullChicks) / fertileEggs) * 100 : 0;
    const ifDevPercent = hoiPercent - hofPercent;

    const { error } = await supabase
      .from("fertility_analysis")
      .update({
        sample_size: sampleSize,
        fertile_eggs: fertileEggs,
        infertile_eggs: infertileEggs,
        early_dead: earlyDead,
        late_dead: lateDead,
        cull_chicks: cullChicks,
        fertility_percent: fertilityPercent,
        hatch_percent: hatchPercent,
        hof_percent: hofPercent,
        hoi_percent: hoiPercent,
        if_dev_percent: ifDevPercent,
        technician_name: formData.technician_name,
        notes: formData.notes,
      })
      .eq("batch_id", editingRecord.batch_id);

    if (error) {
      toast.error("Failed to update record");
      console.error(error);
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
      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flock#</TableHead>
            <TableHead>Flock Name</TableHead>
            <TableHead className="text-right">Age (weeks)</TableHead>
            <TableHead>House#</TableHead>
            <TableHead>Set Date</TableHead>
            <TableHead className="text-right">Week</TableHead>
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
                Hatch of Incubated %
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex" type="button">
                      <AlertCircle className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Hatch of Incubated</p>
                    <p className="text-sm">Formula: ((Chicks + Culls) / Fertile) × 100</p>
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
                    <p className="text-sm">Formula: (Hatch / Injected) × 100</p>
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
                    <p className="font-semibold">Infertile/Fertile Development</p>
                    <p className="text-sm">Formula: HOI % - HOF %</p>
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
                <TableCell className="text-right">{item.set_date ? calculateWeek(item.set_date) : "-"}</TableCell>
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
                  {item.hoi_percent ? formatPercentage(item.hoi_percent) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {item.chicks_hatched && item.eggs_injected 
                    ? formatPercentage((item.chicks_hatched / item.eggs_injected) * 100)
                    : "-"}
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
              <Label>Batch: {editingRecord?.batch_number}</Label>
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
              <div className="space-y-2">
                <Label htmlFor="cull_chicks">Cull Chicks</Label>
                <Input
                  id="cull_chicks"
                  type="number"
                  value={formData.cull_chicks || ""}
                  onChange={(e) => setFormData({ ...formData, cull_chicks: e.target.value })}
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
    </TooltipProvider>
  );
};
