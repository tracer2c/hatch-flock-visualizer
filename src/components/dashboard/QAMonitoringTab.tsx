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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, Trash2, Filter, ChevronDown, X, Thermometer, Download, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getUserCompanyId } from "@/services/qaSubmissionService";
import { toast } from "sonner";
import Setter18PointDisplay from "./Setter18PointDisplay";
import { ExportService } from "@/services/exportService";
import { useVisualPreferences } from "@/hooks/useVisualPreferences";
import { DataSheetViewModeToggle } from "./DataSheetViewModeToggle";
import { aggregateQAByFlock } from "@/utils/dataSheetAggregation";


const SECTION = "qa_monitoring";

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
  readOnly?: boolean;
}

export const QAMonitoringTab = ({ data, searchTerm, filters, onDataUpdate, readOnly }: QAMonitoringTabProps) => {
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [view, setView] = useState<import("./DataSheetViewModeToggle").DataSheetViewMode>("rows");

  const { isColumnHidden } = useVisualPreferences();
  const show = (col: string) => !isColumnHidden(SECTION, col);

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
      else if (['flock_number', 'age_weeks', 'day_of_incubation', 'temperature', 'humidity', 'co2_level'].includes(sortBy)) {
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
      const companyId = await getUserCompanyId();
      const result = await supabase
        .from('qa_monitoring')
        .insert([{
          batch_id: editingRecord.batch_id,
          company_id: companyId,
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

  // Export handler — only includes columns the user has visible
  const handleExportQAData = () => {
    const exportData = filteredData.map(item => {
      const row: Record<string, any> = {};
      if (show("flock_number")) row['Flock #'] = item.flock_number || '';
      if (show("flock_name")) row['Flock Name'] = item.flock_name || '';
      if (show("house_number")) row['House #'] = item.house_number || '';
      if (show("age_weeks")) row['Age (wks)'] = item.age_weeks || '';
      if (show("check_date")) row['Check Date'] = item.check_date ? format(new Date(item.check_date), "yyyy-MM-dd") : '';
      if (show("day_of_incubation")) row['Day of Incubation'] = item.day_of_incubation || '';
      if (show("temperature")) row['Temperature (°F)'] = item.temperature || '';
      if (show("temp_avg_overall")) row['Temp Avg Overall'] = item.temp_avg_overall || '';
      if (show("temp_avg_front")) row['Temp Avg Front'] = item.temp_avg_front || '';
      if (show("temp_avg_middle")) row['Temp Avg Middle'] = item.temp_avg_middle || '';
      if (show("temp_avg_back")) row['Temp Avg Back'] = item.temp_avg_back || '';
      if (show("humidity")) row['Humidity (%)'] = item.humidity || '';
      if (show("co2_level")) row['CO2 Level (ppm)'] = item.co2_level || '';
      if (show("ventilation_rate")) row['Ventilation Rate'] = item.ventilation_rate || '';
      if (show("turning_frequency")) row['Turning Freq'] = item.turning_frequency || '';
      if (show("angle_top_left")) row['Angle Top L'] = item.angle_top_left || '';
      if (show("angle_mid_left")) row['Angle Mid L'] = item.angle_mid_left || '';
      if (show("angle_bottom_left")) row['Angle Bot L'] = item.angle_bottom_left || '';
      if (show("angle_top_right")) row['Angle Top R'] = item.angle_top_right || '';
      if (show("angle_mid_right")) row['Angle Mid R'] = item.angle_mid_right || '';
      if (show("angle_bottom_right")) row['Angle Bot R'] = item.angle_bottom_right || '';
      if (show("inspector_name")) row['Inspector'] = item.inspector_name || '';
      if (show("notes")) row['Notes'] = item.notes || '';
      return row;
    });
    ExportService.exportToExcel(exportData, 'qa-monitoring-data', 'QA Monitoring');
  };

  // QA Temperature alerts - count records with temp outside normal range
  const tempAlertCount = useMemo(() => {
    return filteredData.filter(item => {
      if (item.temp_avg_overall == null) return false;
      return item.temp_avg_overall < 99.5 || item.temp_avg_overall > 100.5;
    }).length;
  }, [filteredData]);

  const displayData = useMemo(
    () => (view === "flock-summary" ? aggregateQAByFlock(filteredData) : filteredData),
    [view, filteredData]
  );
  const isAggregated = view === "flock-summary";
  const showActions = !readOnly && !isAggregated;


  return (
    <>
      {/* Temperature Alert Banner */}
      {tempAlertCount > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>{tempAlertCount}</strong> QA record{tempAlertCount !== 1 ? 's' : ''} with temperature outside normal range (99.5-100.5°F)
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Export Button */}
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={handleExportQAData} disabled={filteredData.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export QA Data
        </Button>
      </div>

      <DataSheetViewModeToggle value={view} onChange={setView} />
      {view === "flock-summary" && (
        <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          Aggregated view — latest reading per flock across all houses & hatcheries. Edits are done on the <strong>By House</strong> view.
        </div>
      )}
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>

          <TableRow>
            {show("flock_number") && <TableHead>Flock #</TableHead>}
            {show("flock_name") && <TableHead>Flock Name</TableHead>}
            {show("house_number") && <TableHead>House #</TableHead>}
            {show("age_weeks") && <TableHead>Age (wks)</TableHead>}
            {show("check_date") && <TableHead>Check Date</TableHead>}
            {show("day_of_incubation") && <TableHead>Day of Incubation</TableHead>}
            {show("temperature") && <TableHead>Temperature (°F)</TableHead>}
            {show("temp_avg_overall") && <TableHead>Temp Avg Overall</TableHead>}
            {show("temp_avg_front") && <TableHead>Temp Avg Front</TableHead>}
            {show("temp_avg_middle") && <TableHead>Temp Avg Middle</TableHead>}
            {show("temp_avg_back") && <TableHead>Temp Avg Back</TableHead>}
            {show("humidity") && <TableHead>Humidity (%)</TableHead>}
            {show("co2_level") && <TableHead>CO2 Level (ppm)</TableHead>}
            {show("ventilation_rate") && <TableHead>Ventilation Rate</TableHead>}
            {show("turning_frequency") && <TableHead>Turning Freq</TableHead>}
            {show("angle_top_left") && <TableHead>Angle Top L</TableHead>}
            {show("angle_mid_left") && <TableHead>Angle Mid L</TableHead>}
            {show("angle_bottom_left") && <TableHead>Angle Bot L</TableHead>}
            {show("angle_top_right") && <TableHead>Angle Top R</TableHead>}
            {show("angle_mid_right") && <TableHead>Angle Mid R</TableHead>}
            {show("angle_bottom_right") && <TableHead>Angle Bot R</TableHead>}
            {show("inspector_name") && <TableHead>Inspector</TableHead>}
            {show("notes") && <TableHead>Notes</TableHead>}
            {showActions && <TableHead>Actions</TableHead>}
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
              <TableRow key={item.id}>
                {show("flock_number") && <TableCell>{item.flock_number || "-"}</TableCell>}
                {show("flock_name") && <TableCell>{item.flock_name || "-"}</TableCell>}
                {show("house_number") && (
                  <TableCell>
                    {item._flock_house_count > 1
                      ? <Badge variant="secondary">{item._flock_house_count} houses</Badge>
                      : (item.house_number || "-")}
                  </TableCell>
                )}

                {show("age_weeks") && <TableCell>{item.age_weeks || "-"}</TableCell>}
                {show("check_date") && (
                  <TableCell>
                    {item.check_date ? format(new Date(item.check_date), "M/d/yyyy") : "-"}
                  </TableCell>
                )}
                {show("day_of_incubation") && <TableCell>{item.day_of_incubation || "-"}</TableCell>}
                {show("temperature") && <TableCell>{item.temperature || "-"}</TableCell>}
                {show("temp_avg_overall") && (
                  <TableCell>
                    {item.temp_avg_overall != null ? (
                      <Badge variant="outline" className={
                        item.temp_avg_overall >= 99.5 && item.temp_avg_overall <= 100.5
                          ? 'bg-green-100 text-green-800'
                          : item.temp_avg_overall >= 99.0 && item.temp_avg_overall <= 101.0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }>
                        {item.temp_avg_overall.toFixed(1)}°F
                      </Badge>
                    ) : "-"}
                  </TableCell>
                )}
                {show("temp_avg_front") && <TableCell>{item.temp_avg_front?.toFixed(1) || "-"}</TableCell>}
                {show("temp_avg_middle") && <TableCell>{item.temp_avg_middle?.toFixed(1) || "-"}</TableCell>}
                {show("temp_avg_back") && <TableCell>{item.temp_avg_back?.toFixed(1) || "-"}</TableCell>}
                {show("humidity") && <TableCell>{item.humidity || "-"}</TableCell>}
                {show("co2_level") && <TableCell>{item.co2_level || "-"}</TableCell>}
                {show("ventilation_rate") && <TableCell>{item.ventilation_rate || "-"}</TableCell>}
                {show("turning_frequency") && <TableCell>{item.turning_frequency || "-"}</TableCell>}
                {show("angle_top_left") && <TableCell>{item.angle_top_left || "-"}</TableCell>}
                {show("angle_mid_left") && <TableCell>{item.angle_mid_left || "-"}</TableCell>}
                {show("angle_bottom_left") && <TableCell>{item.angle_bottom_left || "-"}</TableCell>}
                {show("angle_top_right") && <TableCell>{item.angle_top_right || "-"}</TableCell>}
                {show("angle_mid_right") && <TableCell>{item.angle_mid_right || "-"}</TableCell>}
                {show("angle_bottom_right") && <TableCell>{item.angle_bottom_right || "-"}</TableCell>}
                {show("inspector_name") && <TableCell>{item.inspector_name || "-"}</TableCell>}
                {show("notes") && <TableCell className="max-w-xs truncate">{item.notes || "-"}</TableCell>}
                {!readOnly && (
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
                )}
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
            {show("ventilation_rate") && (
              <div>
                <Label>Ventilation Rate</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.ventilation_rate || ''}
                  onChange={(e) => setFormData({ ...formData, ventilation_rate: e.target.value })}
                />
              </div>
            )}
            {show("turning_frequency") && (
              <div>
                <Label>Turning Frequency</Label>
                <Input
                  type="number"
                  value={formData.turning_frequency || ''}
                  onChange={(e) => setFormData({ ...formData, turning_frequency: e.target.value })}
                />
              </div>
            )}
            {show("angle_top_left") && (
              <div>
                <Label>Angle Top Left</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.angle_top_left || ''}
                  onChange={(e) => setFormData({ ...formData, angle_top_left: e.target.value })}
                />
              </div>
            )}
            {show("angle_mid_left") && (
              <div>
                <Label>Angle Mid Left</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.angle_mid_left || ''}
                  onChange={(e) => setFormData({ ...formData, angle_mid_left: e.target.value })}
                />
              </div>
            )}
            {show("angle_bottom_left") && (
              <div>
                <Label>Angle Bottom Left</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.angle_bottom_left || ''}
                  onChange={(e) => setFormData({ ...formData, angle_bottom_left: e.target.value })}
                />
              </div>
            )}
            {show("angle_top_right") && (
              <div>
                <Label>Angle Top Right</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.angle_top_right || ''}
                  onChange={(e) => setFormData({ ...formData, angle_top_right: e.target.value })}
                />
              </div>
            )}
            {show("angle_mid_right") && (
              <div>
                <Label>Angle Mid Right</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.angle_mid_right || ''}
                  onChange={(e) => setFormData({ ...formData, angle_mid_right: e.target.value })}
                />
              </div>
            )}
            {show("angle_bottom_right") && (
              <div>
                <Label>Angle Bottom Right</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.angle_bottom_right || ''}
                  onChange={(e) => setFormData({ ...formData, angle_bottom_right: e.target.value })}
                />
              </div>
            )}
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
            <Button onClick={handleSave} disabled={readOnly}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};
