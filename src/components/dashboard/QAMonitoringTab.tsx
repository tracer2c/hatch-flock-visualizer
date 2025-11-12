import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Filter, ChevronDown, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QAMonitoringTabProps {
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

export const QAMonitoringTab = ({ data, searchTerm, filters, onDataUpdate }: QAMonitoringTabProps) => {
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
      result = result.filter(item => item.check_date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      result = result.filter(item => item.check_date <= filters.dateTo);
    }

    // Apply sorting
    result.sort((a, b) => {
      const sortBy = filters.sortBy;
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle dates
      if (sortBy === 'check_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      // Handle numbers
      else if (['flock_number', 'age_weeks', 'day_of_incubation', 'temperature', 'humidity', 'co2_level', 'ventilation_rate', 'turning_frequency'].includes(sortBy)) {
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
      day_of_incubation: record.day_of_incubation || 1,
      temperature: record.temperature || 0,
      humidity: record.humidity || 0,
      co2_level: record.co2_level || 0,
      ventilation_rate: record.ventilation_rate || 0,
      turning_frequency: record.turning_frequency || 0,
      angle_top_left: record.angle_top_left || 0,
      angle_mid_left: record.angle_mid_left || 0,
      angle_bottom_left: record.angle_bottom_left || 0,
      angle_top_right: record.angle_top_right || 0,
      angle_mid_right: record.angle_mid_right || 0,
      angle_bottom_right: record.angle_bottom_right || 0,
      inspector_name: record.inspector_name || '',
      notes: record.notes || '',
    });
  };

  const handleSave = async () => {
    if (!editingRecord) return;

    console.log("QA Monitoring - Attempting save:", {
      hasQaId: !!editingRecord.qa_id,
      qaId: editingRecord.qa_id,
      batchId: editingRecord.batch_id,
      operation: editingRecord.qa_id ? "UPDATE" : "INSERT"
    });

    // Check if record exists (has qa_id) or needs to be created
    let error;
    if (editingRecord.qa_id) {
      // Update existing record
      const result = await supabase
        .from('qa_monitoring')
        .update({
          day_of_incubation: parseInt(formData.day_of_incubation) || 1,
          temperature: parseFloat(formData.temperature) || 0,
          humidity: parseFloat(formData.humidity) || 0,
          co2_level: parseFloat(formData.co2_level) || 0,
          ventilation_rate: parseFloat(formData.ventilation_rate) || 0,
          turning_frequency: parseInt(formData.turning_frequency) || 0,
          angle_top_left: parseFloat(formData.angle_top_left) || 0,
          angle_mid_left: parseFloat(formData.angle_mid_left) || 0,
          angle_bottom_left: parseFloat(formData.angle_bottom_left) || 0,
          angle_top_right: parseFloat(formData.angle_top_right) || 0,
          angle_mid_right: parseFloat(formData.angle_mid_right) || 0,
          angle_bottom_right: parseFloat(formData.angle_bottom_right) || 0,
          inspector_name: formData.inspector_name,
          notes: formData.notes,
        })
        .eq('id', editingRecord.qa_id);
      error = result.error;
      console.log("QA Monitoring - UPDATE result:", { error, data: result.data });
    } else {
      // Insert new record
      const result = await supabase
        .from('qa_monitoring')
        .insert([{
          batch_id: editingRecord.batch_id,
          day_of_incubation: parseInt(formData.day_of_incubation) || 1,
          temperature: parseFloat(formData.temperature) || 0,
          humidity: parseFloat(formData.humidity) || 0,
          co2_level: parseFloat(formData.co2_level) || 0,
          ventilation_rate: parseFloat(formData.ventilation_rate) || 0,
          turning_frequency: parseInt(formData.turning_frequency) || 0,
          angle_top_left: parseFloat(formData.angle_top_left) || 0,
          angle_mid_left: parseFloat(formData.angle_mid_left) || 0,
          angle_bottom_left: parseFloat(formData.angle_bottom_left) || 0,
          angle_top_right: parseFloat(formData.angle_top_right) || 0,
          angle_mid_right: parseFloat(formData.angle_mid_right) || 0,
          angle_bottom_right: parseFloat(formData.angle_bottom_right) || 0,
          inspector_name: formData.inspector_name,
          notes: formData.notes,
        } as any]);
      error = result.error;
      console.log("QA Monitoring - INSERT result:", { error, data: result.data });
    }

    if (error) {
      const errorMessage = error.message || "Unknown error";
      const errorDetails = error.details || "";
      const errorHint = error.hint || "";
      toast.error(`Failed to update record: ${errorMessage}`);
      console.error("QA Monitoring - Full error:", { error, errorMessage, errorDetails, errorHint });
    } else {
      toast.success("Record updated successfully");
      setEditingRecord(null);
      onDataUpdate();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this QA monitoring record?")) return;

    const { error } = await supabase
      .from('qa_monitoring')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete record");
      console.error(error);
    } else {
      toast.success("Record deleted successfully");
      onDataUpdate();
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
            <TableHead>Age (wks)</TableHead>
            <TableHead>Check Date</TableHead>
            <TableHead>Day of Incubation</TableHead>
            <TableHead>Temperature (°F)</TableHead>
            <TableHead>Humidity (%)</TableHead>
            <TableHead>CO2 Level (ppm)</TableHead>
            <TableHead>Ventilation Rate</TableHead>
            <TableHead>Turning Freq</TableHead>
            <TableHead>Angle Top L</TableHead>
            <TableHead>Angle Mid L</TableHead>
            <TableHead>Angle Bot L</TableHead>
            <TableHead>Angle Top R</TableHead>
            <TableHead>Angle Mid R</TableHead>
            <TableHead>Angle Bot R</TableHead>
            <TableHead>Inspector</TableHead>
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
              <TableRow key={item.id}>
                <TableCell>{item.flock_number || "-"}</TableCell>
                <TableCell>{item.flock_name || "-"}</TableCell>
                <TableCell>{item.house_number || "-"}</TableCell>
                <TableCell>{item.age_weeks || "-"}</TableCell>
                <TableCell>
                  {item.check_date ? format(new Date(item.check_date), "M/d/yyyy") : "-"}
                </TableCell>
                <TableCell>{item.day_of_incubation || "-"}</TableCell>
                <TableCell>{item.temperature || "-"}</TableCell>
                <TableCell>{item.humidity || "-"}</TableCell>
                <TableCell>{item.co2_level || "-"}</TableCell>
                <TableCell>{item.ventilation_rate || "-"}</TableCell>
                <TableCell>{item.turning_frequency || "-"}</TableCell>
                <TableCell>{item.angle_top_left || "-"}</TableCell>
                <TableCell>{item.angle_mid_left || "-"}</TableCell>
                <TableCell>{item.angle_bottom_left || "-"}</TableCell>
                <TableCell>{item.angle_top_right || "-"}</TableCell>
                <TableCell>{item.angle_mid_right || "-"}</TableCell>
                <TableCell>{item.angle_bottom_right || "-"}</TableCell>
                <TableCell>{item.inspector_name || "-"}</TableCell>
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
                      onClick={() => handleDelete(item.id)}
                      className="text-destructive hover:text-destructive"
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit QA Monitoring Record</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Day of Incubation</Label>
              <Input
                type="number"
                value={formData.day_of_incubation || ''}
                onChange={(e) => setFormData({ ...formData, day_of_incubation: e.target.value })}
              />
            </div>
            <div>
              <Label>Temperature (°F)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.temperature || ''}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
              />
            </div>
            <div>
              <Label>Humidity (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.humidity || ''}
                onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
              />
            </div>
            <div>
              <Label>CO2 Level (ppm)</Label>
              <Input
                type="number"
                value={formData.co2_level || ''}
                onChange={(e) => setFormData({ ...formData, co2_level: e.target.value })}
              />
            </div>
            <div>
              <Label>Ventilation Rate</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.ventilation_rate || ''}
                onChange={(e) => setFormData({ ...formData, ventilation_rate: e.target.value })}
              />
            </div>
            <div>
              <Label>Turning Frequency</Label>
              <Input
                type="number"
                value={formData.turning_frequency || ''}
                onChange={(e) => setFormData({ ...formData, turning_frequency: e.target.value })}
              />
            </div>
            <div>
              <Label>Angle Top Left</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.angle_top_left || ''}
                onChange={(e) => setFormData({ ...formData, angle_top_left: e.target.value })}
              />
            </div>
            <div>
              <Label>Angle Mid Left</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.angle_mid_left || ''}
                onChange={(e) => setFormData({ ...formData, angle_mid_left: e.target.value })}
              />
            </div>
            <div>
              <Label>Angle Bottom Left</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.angle_bottom_left || ''}
                onChange={(e) => setFormData({ ...formData, angle_bottom_left: e.target.value })}
              />
            </div>
            <div>
              <Label>Angle Top Right</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.angle_top_right || ''}
                onChange={(e) => setFormData({ ...formData, angle_top_right: e.target.value })}
              />
            </div>
            <div>
              <Label>Angle Mid Right</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.angle_mid_right || ''}
                onChange={(e) => setFormData({ ...formData, angle_mid_right: e.target.value })}
              />
            </div>
            <div>
              <Label>Angle Bottom Right</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.angle_bottom_right || ''}
                onChange={(e) => setFormData({ ...formData, angle_bottom_right: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Inspector Name</Label>
              <Input
                value={formData.inspector_name || ''}
                onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
              />
            </div>
            <div className="col-span-3">
              <Label>Notes</Label>
              <Input
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
    </>
  );
};
