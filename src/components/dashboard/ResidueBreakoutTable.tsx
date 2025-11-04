import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, AlertCircle } from "lucide-react";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResidueBreakoutTableProps {
  data: any[];
  searchTerm: string;
  onDataUpdate: () => void;
}

export const ResidueBreakoutTable = ({ data, searchTerm, onDataUpdate }: ResidueBreakoutTableProps) => {
  const { showPercentages, formatValue } = usePercentageToggle();
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const filteredData = data.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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
      pip_number: record.pip_number || 0,
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

    const fertileEggs = Math.max(0, sampleSize - infertileEggs);
    const chicksHatched = Math.max(0, sampleSize - infertileEggs - earlyDead - midDead - lateDead - malformedChicks);
    
    const fertilityPercent = sampleSize > 0 ? (fertileEggs / sampleSize) * 100 : 0;
    const hatchPercent = sampleSize > 0 ? (chicksHatched / sampleSize) * 100 : 0;
    const hofPercent = fertileEggs > 0 ? (chicksHatched / fertileEggs) * 100 : 0;
    const hoiPercent = fertileEggs > 0 ? ((chicksHatched + malformedChicks) / fertileEggs) * 100 : 0;
    const ifDevPercent = hoiPercent - hofPercent;

    const { error } = await supabase
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
        pip_number: parseInt(formData.pip_number) || 0,
        hatch_percent: hatchPercent,
        hof_percent: hofPercent,
        hoi_percent: hoiPercent,
        if_dev_percent: ifDevPercent,
      })
      .eq('batch_id', editingRecord.batch_id);

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
              <TableHead>{showPercentages ? "Dead at Transfer %" : "Dead at Transfer"}</TableHead>
              <TableHead>{showPercentages ? "Mid Dead %" : "Mid Dead"}</TableHead>
              <TableHead>{showPercentages ? "Late Dead %" : "Late Dead"}</TableHead>
              <TableHead>{showPercentages ? "Cull Chicks %" : "Cull Chicks"}</TableHead>
              <TableHead>{showPercentages ? "Handling Cracks %" : "Handling Cracks"}</TableHead>
              <TableHead>{showPercentages ? "Transfer Crack %" : "Transfer Crack"}</TableHead>
              <TableHead>{showPercentages ? "Contamination %" : "Contamination"}</TableHead>
              <TableHead>{showPercentages ? "Mold %" : "Mold"}</TableHead>
              <TableHead>{showPercentages ? "Abnormal %" : "Abnormal"}</TableHead>
              <TableHead>{showPercentages ? "Brain Defects %" : "Brain Defects"}</TableHead>
              <TableHead>{showPercentages ? "Dry Egg %" : "Dry Egg"}</TableHead>
              <TableHead>{showPercentages ? "Malpositioned %" : "Malpositioned"}</TableHead>
              <TableHead>{showPercentages ? "Upside Down %" : "Upside Down"}</TableHead>
              <TableHead>PIP Number</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  HOF %
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">Hatch of Fertile (HOF)</p>
                      <p className="text-sm">Formula: (Chicks Hatched / Fertile Eggs) × 100</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  HOI %
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">Hatch of Incubated (HOI)</p>
                      <p className="text-sm">Formula: ((Chicks + Culls) / Fertile) × 100</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  I/F %
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">Infertile/Fertile Development</p>
                      <p className="text-sm">Formula: HOI % - HOF %</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={27} className="text-center text-muted-foreground">
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
                    <TableCell>{formatValue(item.pipped_not_hatched, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.mid_dead, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.late_dead, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.malformed_chicks, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.handling_cracks, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.transfer_crack, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.contaminated_eggs, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.mold, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.abnormal, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.brain_defects, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.dry_egg, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.malpositioned, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.upside_down, sampleSize)}</TableCell>
                    <TableCell>{item.pip_number || "-"}</TableCell>
                    <TableCell>
                      {item.hof_percent ? `${item.hof_percent.toFixed(1)}%` : "-"}
                    </TableCell>
                    <TableCell>
                      {item.hoi_percent ? `${item.hoi_percent.toFixed(1)}%` : "-"}
                    </TableCell>
                    <TableCell>
                      {item.if_dev_percent ? `${item.if_dev_percent.toFixed(1)}%` : "-"}
                    </TableCell>
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
                <Label>Early Dead (1-7 days)</Label>
                <Input
                  type="number"
                  value={formData.early_dead || ''}
                  onChange={(e) => setFormData({ ...formData, early_dead: e.target.value })}
                />
              </div>
              <div>
                <Label>Dead at Transfer</Label>
                <Input
                  type="number"
                  value={formData.pipped_not_hatched || ''}
                  onChange={(e) => setFormData({ ...formData, pipped_not_hatched: e.target.value })}
                />
              </div>
              <div>
                <Label>Mid Dead (7-14 days)</Label>
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
                <Label>Dry Egg</Label>
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
              <div>
                <Label>PIP Number</Label>
                <Input
                  type="number"
                  value={formData.pip_number || ''}
                  onChange={(e) => setFormData({ ...formData, pip_number: e.target.value })}
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
      </div>
    </TooltipProvider>
  );
};
