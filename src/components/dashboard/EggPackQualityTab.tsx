import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Filter, ChevronDown, X } from "lucide-react";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EggPackQualityTabProps {
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

export const EggPackQualityTab = ({ data, searchTerm, filters, onDataUpdate }: EggPackQualityTabProps) => {
  const { showPercentages, formatValue } = usePercentageToggle();
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
        item.inspector_name?.toLowerCase().includes(techSearch)
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
      else if (['flock_number', 'age_weeks', 'epq_sample_size', 'cracked', 'dirty', 'small', 'large', 'grade_a', 'grade_b', 'grade_c'].includes(sortBy)) {
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

  // Helper functions to extract values from notes
  const extractFromNotes = (notes: string | null, field: string): number => {
    if (!notes) return 0;
    const match = notes.match(new RegExp(`${field}:\\s*(\\d+)`));
    return match ? parseInt(match[1]) : 0;
  };

  const extractStringFromNotes = (notes: string | null, field: string): string => {
    if (!notes) return '';
    const match = notes.match(new RegExp(`${field}:\\s*([^,]+)`));
    return match ? match[1].trim() : '';
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    const stained = extractFromNotes(record.notes, 'Stained');
    const abnormal = extractFromNotes(record.notes, 'Abnormal');
    const contaminated = extractFromNotes(record.notes, 'Contaminated');
    const usd = extractFromNotes(record.notes, 'USD');
    const setWeek = extractStringFromNotes(record.notes, 'Set Week');
    
    setFormData({
      sample_size: record.epq_sample_size || 648,
      stained: stained,
      cracked: record.cracked || 0,
      dirty: record.dirty || 0,
      small: record.small || 0,
      abnormal: abnormal,
      contaminated: contaminated,
      usd: usd,
      set_week: setWeek,
      large: record.large || 0,
      grade_a: record.grade_a || 0,
      grade_b: record.grade_b || 0,
      grade_c: record.grade_c || 0,
      weight_avg: record.weight_avg || "",
      shell_thickness_avg: record.shell_thickness_avg || "",
      inspector_name: record.inspector_name || "",
    });
  };

  const handleSave = async () => {
    try {
      const sampleSize = parseInt(formData.sample_size) || 648;
      const stained = parseInt(formData.stained) || 0;
      const abnormal = parseInt(formData.abnormal) || 0;
      const contaminated = parseInt(formData.contaminated) || 0;
      const usd = parseInt(formData.usd) || 0;
      const setWeek = formData.set_week || '';

      // Build notes string with all extra fields
      const notes = `Stained: ${stained}, Abnormal: ${abnormal}, Contaminated: ${contaminated}, USD: ${usd}${setWeek ? `, Set Week: ${setWeek}` : ''}`;

      // Check if record exists (has egg_pack_id) or needs to be created
      let error;
      if (editingRecord.egg_pack_id) {
        // Update existing record
        const result = await supabase
          .from("egg_pack_quality")
          .update({
            sample_size: sampleSize,
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
            notes: notes,
          })
          .eq("id", editingRecord.egg_pack_id);
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from("egg_pack_quality")
          .insert([{
            batch_id: editingRecord.batch_id,
            sample_size: sampleSize,
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
            notes: notes,
          } as any]);
        error = result.error;
      }

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
              <TableHead>Flock Name</TableHead>
              <TableHead>Flock #</TableHead>
              <TableHead>House #</TableHead>
              <TableHead>Age (wks)</TableHead>
              <TableHead>Set Date</TableHead>
              <TableHead>Sample Size</TableHead>
              <TableHead>Total Pulled</TableHead>
              <TableHead>{showPercentages ? "Stained %" : "Stained"}</TableHead>
              <TableHead>{showPercentages ? "Dirty %" : "Dirty"}</TableHead>
              <TableHead>{showPercentages ? "Small %" : "Small"}</TableHead>
              <TableHead>{showPercentages ? "Cracked %" : "Cracked"}</TableHead>
              <TableHead>{showPercentages ? "Abnormal %" : "Abnormal"}</TableHead>
              <TableHead>{showPercentages ? "Contaminated %" : "Contaminated"}</TableHead>
              <TableHead>{showPercentages ? "USD %" : "USD"}</TableHead>
              <TableHead>Set Week</TableHead>
              <TableHead>Inspector Name</TableHead>
              <TableHead>Notes</TableHead>
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
                const sampleSize = item.epq_sample_size || 648;
                const stained = extractFromNotes(item.notes, 'Stained');
                const abnormal = extractFromNotes(item.notes, 'Abnormal');
                const contaminated = extractFromNotes(item.notes, 'Contaminated');
                const usd = extractFromNotes(item.notes, 'USD');
                const setWeek = extractStringFromNotes(item.notes, 'Set Week');

                return (
                  <TableRow key={item.batch_id}>
                    <TableCell>{item.flock_name || "-"}</TableCell>
                    <TableCell>{item.flock_number || "-"}</TableCell>
                    <TableCell>{item.house_number || "-"}</TableCell>
                    <TableCell>{item.age_weeks || "-"}</TableCell>
                    <TableCell>{item.set_date ? format(new Date(item.set_date), "M/d/yyyy") : "-"}</TableCell>
                    <TableCell>{sampleSize}</TableCell>
                    <TableCell>{sampleSize}</TableCell>
                    <TableCell>{formatValue(stained, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.dirty, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.small, sampleSize)}</TableCell>
                    <TableCell>{formatValue(item.cracked, sampleSize)}</TableCell>
                    <TableCell>{formatValue(abnormal, sampleSize)}</TableCell>
                    <TableCell>{formatValue(contaminated, sampleSize)}</TableCell>
                    <TableCell>{formatValue(usd, sampleSize)}</TableCell>
                    <TableCell>{setWeek || "-"}</TableCell>
                    <TableCell>{item.inspector_name || "-"}</TableCell>
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
              <Label>House: {editingRecord?.batch_number}</Label>
              <p className="text-sm text-muted-foreground">
                {editingRecord?.flock_name} (Flock #{editingRecord?.flock_number})
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sample_size">Sample Size / Total Pulled</Label>
                <Input
                  id="sample_size"
                  type="number"
                  value={formData.sample_size || ""}
                  onChange={(e) => setFormData({ ...formData, sample_size: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stained">Stained</Label>
                <Input
                  id="stained"
                  type="number"
                  value={formData.stained || ""}
                  onChange={(e) => setFormData({ ...formData, stained: e.target.value })}
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
                <Label htmlFor="cracked">Cracked</Label>
                <Input
                  id="cracked"
                  type="number"
                  value={formData.cracked || ""}
                  onChange={(e) => setFormData({ ...formData, cracked: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abnormal">Abnormal</Label>
                <Input
                  id="abnormal"
                  type="number"
                  value={formData.abnormal || ""}
                  onChange={(e) => setFormData({ ...formData, abnormal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contaminated">Contaminated</Label>
                <Input
                  id="contaminated"
                  type="number"
                  value={formData.contaminated || ""}
                  onChange={(e) => setFormData({ ...formData, contaminated: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usd">USD (Unsettable)</Label>
                <Input
                  id="usd"
                  type="number"
                  value={formData.usd || ""}
                  onChange={(e) => setFormData({ ...formData, usd: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="set_week">Set Week</Label>
                <Input
                  id="set_week"
                  value={formData.set_week || ""}
                  onChange={(e) => setFormData({ ...formData, set_week: e.target.value })}
                  placeholder="Week 1"
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
