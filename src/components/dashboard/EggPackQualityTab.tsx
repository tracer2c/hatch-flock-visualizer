import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EggPackQualityTabProps {
  data: any[];
  searchTerm: string;
  onDataUpdate: () => void;
}

export const EggPackQualityTab = ({ data, searchTerm, onDataUpdate }: EggPackQualityTabProps) => {
  const { showPercentages, formatValue } = usePercentageToggle();
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const filteredData = data.filter(item => {
    const searchStr = searchTerm.toLowerCase();
    return Object.values(item).some(value =>
      String(value).toLowerCase().includes(searchStr)
    );
  });

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({
      sample_size: record.epq_sample_size || 100,
      cracked: record.cracked || 0,
      dirty: record.dirty || 0,
      small: record.small || 0,
      large: record.large || 0,
      grade_a: record.grade_a || 0,
      grade_b: record.grade_b || 0,
      grade_c: record.grade_c || 0,
      weight_avg: record.weight_avg || "",
      shell_thickness_avg: record.shell_thickness_avg || "",
      inspector_name: record.inspector_name || "",
      notes: record.notes || "",
    });
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("egg_pack_quality")
        .update({
          sample_size: parseInt(formData.sample_size) || 100,
          cracked: parseInt(formData.cracked) || 0,
          dirty: parseInt(formData.dirty) || 0,
          small: parseInt(formData.small) || 0,
          large: parseInt(formData.large) || 0,
          grade_a: parseInt(formData.grade_a) || 0,
          grade_b: parseInt(formData.grade_b) || 0,
          grade_c: parseInt(formData.grade_c) || 0,
          weight_avg: formData.weight_avg ? parseFloat(formData.weight_avg) : null,
          shell_thickness_avg: formData.shell_thickness_avg ? parseFloat(formData.shell_thickness_avg) : null,
          inspector_name: formData.inspector_name,
          notes: formData.notes,
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
    if (!confirm("Are you sure you want to delete this egg pack quality record?")) return;

    try {
      const { error } = await supabase
        .from("egg_pack_quality")
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
              <TableHead>Sample Size</TableHead>
              <TableHead>{showPercentages ? "Cracked %" : "Cracked"}</TableHead>
              <TableHead>{showPercentages ? "Dirty %" : "Dirty"}</TableHead>
              <TableHead>{showPercentages ? "Small %" : "Small"}</TableHead>
              <TableHead>{showPercentages ? "Large %" : "Large"}</TableHead>
              <TableHead>Grade A</TableHead>
              <TableHead>Grade B</TableHead>
              <TableHead>Grade C</TableHead>
              <TableHead>Weight Avg (g)</TableHead>
              <TableHead>Shell Thickness (mm)</TableHead>
              <TableHead>Quality Score</TableHead>
              <TableHead>Inspector</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={18} className="text-center text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => {
                const sampleSize = item.epq_sample_size || 100;
                const qualityScore = sampleSize > 0
                  ? ((sampleSize - (item.grade_c || 0) - (item.cracked || 0) - (item.dirty || 0)) / sampleSize * 100).toFixed(1)
                  : "0";

                return (
                  <TableRow key={item.batch_id}>
                    <TableCell>{item.flock_number || "-"}</TableCell>
                    <TableCell>{item.flock_name || "-"}</TableCell>
                    <TableCell>{item.house_number || "-"}</TableCell>
                    <TableCell>{item.age_weeks || "-"}</TableCell>
                    <TableCell>{item.set_date ? format(new Date(item.set_date), "MMM dd, yyyy") : "-"}</TableCell>
                    <TableCell>{sampleSize}</TableCell>
                    <TableCell>{formatValue(item.cracked, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.dirty, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.small, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.large, sampleSize)}</TableCell>
                    <TableCell>{item.grade_a || "0"}</TableCell>
                    <TableCell>{item.grade_b || "0"}</TableCell>
                    <TableCell>{item.grade_c || "0"}</TableCell>
                    <TableCell>{item.weight_avg ? item.weight_avg.toFixed(1) : "-"}</TableCell>
                    <TableCell>{item.shell_thickness_avg ? item.shell_thickness_avg.toFixed(2) : "-"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        parseFloat(qualityScore) >= 95 ? 'bg-green-100 text-green-800' :
                        parseFloat(qualityScore) >= 90 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {qualityScore}%
                      </span>
                    </TableCell>
                    <TableCell>{item.inspector_name || "-"}</TableCell>
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Egg Pack Quality</DialogTitle>
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
                <Label htmlFor="cracked">Cracked</Label>
                <Input
                  id="cracked"
                  type="number"
                  value={formData.cracked || ""}
                  onChange={(e) => setFormData({ ...formData, cracked: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dirty">Dirty</Label>
                <Input
                  id="dirty"
                  type="number"
                  value={formData.dirty || ""}
                  onChange={(e) => setFormData({ ...formData, dirty: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="small">Small</Label>
                <Input
                  id="small"
                  type="number"
                  value={formData.small || ""}
                  onChange={(e) => setFormData({ ...formData, small: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="large">Large</Label>
                <Input
                  id="large"
                  type="number"
                  value={formData.large || ""}
                  onChange={(e) => setFormData({ ...formData, large: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade_a">Grade A</Label>
                <Input
                  id="grade_a"
                  type="number"
                  value={formData.grade_a || ""}
                  onChange={(e) => setFormData({ ...formData, grade_a: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade_b">Grade B</Label>
                <Input
                  id="grade_b"
                  type="number"
                  value={formData.grade_b || ""}
                  onChange={(e) => setFormData({ ...formData, grade_b: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade_c">Grade C</Label>
                <Input
                  id="grade_c"
                  type="number"
                  value={formData.grade_c || ""}
                  onChange={(e) => setFormData({ ...formData, grade_c: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight_avg">Weight Avg (g)</Label>
                <Input
                  id="weight_avg"
                  type="number"
                  step="0.1"
                  value={formData.weight_avg || ""}
                  onChange={(e) => setFormData({ ...formData, weight_avg: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shell_thickness_avg">Shell Thickness (mm)</Label>
                <Input
                  id="shell_thickness_avg"
                  type="number"
                  step="0.01"
                  value={formData.shell_thickness_avg || ""}
                  onChange={(e) => setFormData({ ...formData, shell_thickness_avg: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspector_name">Inspector Name</Label>
              <Input
                id="inspector_name"
                value={formData.inspector_name || ""}
                onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
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
    </>
  );
};
