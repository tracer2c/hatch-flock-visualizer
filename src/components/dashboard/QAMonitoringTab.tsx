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
  onDataUpdate: () => void;
}

export const QAMonitoringTab = ({ data, searchTerm, onDataUpdate }: QAMonitoringTabProps) => {
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    sortOrder: 'desc' as 'asc' | 'desc',
    selectedHatcheries: [] as string[],
    selectedMachines: [] as string[],
    technicianSearch: '',
    dateFrom: '',
    dateTo: '',
  });

  // Load unique hatcheries and machines
  const [hatcheries, setHatcheries] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    const [hatcheriesRes, machinesRes] = await Promise.all([
      supabase.from('units').select('*').order('name'),
      supabase.from('machines').select('*').order('machine_number'),
    ]);

    if (hatcheriesRes.data) setHatcheries(hatcheriesRes.data);
    if (machinesRes.data) setMachines(machinesRes.data);
  };

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

    // Apply sort order
    result.sort((a, b) => {
      const dateA = new Date(a.check_date).getTime();
      const dateB = new Date(b.check_date).getTime();
      return filters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [data, searchTerm, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.selectedHatcheries.length > 0) count++;
    if (filters.selectedMachines.length > 0) count++;
    if (filters.technicianSearch) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

  const clearAllFilters = () => {
    setFilters({
      sortOrder: 'desc',
      selectedHatcheries: [],
      selectedMachines: [],
      technicianSearch: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const toggleHatchery = (id: string) => {
    setFilters(prev => ({
      ...prev,
      selectedHatcheries: prev.selectedHatcheries.includes(id)
        ? prev.selectedHatcheries.filter(h => h !== id)
        : [...prev.selectedHatcheries, id]
    }));
  };

  const toggleMachine = (id: string) => {
    setFilters(prev => ({
      ...prev,
      selectedMachines: prev.selectedMachines.includes(id)
        ? prev.selectedMachines.filter(m => m !== id)
        : [...prev.selectedMachines, id]
    }));
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({
      day_of_incubation: record.day_of_incubation || 1,
      temperature: record.temperature || 0,
      humidity: record.humidity || 0,
      co2_level: record.co2_level || 0,
      ventilation_rate: record.ventilation_rate || 0,
      turning_frequency: record.turning_frequency || 0,
      mortality_count: record.mortality_count || 0,
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

    const { error } = await supabase
      .from('qa_monitoring')
      .update({
        day_of_incubation: parseInt(formData.day_of_incubation) || 1,
        temperature: parseFloat(formData.temperature) || 0,
        humidity: parseFloat(formData.humidity) || 0,
        co2_level: parseFloat(formData.co2_level) || 0,
        ventilation_rate: parseFloat(formData.ventilation_rate) || 0,
        turning_frequency: parseInt(formData.turning_frequency) || 0,
        mortality_count: parseInt(formData.mortality_count) || 0,
        angle_top_left: parseFloat(formData.angle_top_left) || 0,
        angle_mid_left: parseFloat(formData.angle_mid_left) || 0,
        angle_bottom_left: parseFloat(formData.angle_bottom_left) || 0,
        angle_top_right: parseFloat(formData.angle_top_right) || 0,
        angle_mid_right: parseFloat(formData.angle_mid_right) || 0,
        angle_bottom_right: parseFloat(formData.angle_bottom_right) || 0,
        inspector_name: formData.inspector_name,
        notes: formData.notes,
      })
      .eq('id', editingRecord.id);

    if (error) {
      toast.error("Failed to update record");
      console.error(error);
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
      {/* Filters Section */}
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount}</Badge>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>

        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="mt-4 p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sort Order */}
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Select value={filters.sortOrder} onValueChange={(value: 'asc' | 'desc') => setFilters(prev => ({ ...prev, sortOrder: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Technician Search */}
              <div className="space-y-2">
                <Label>Inspector Name</Label>
                <Input
                  placeholder="Search by inspector..."
                  value={filters.technicianSearch}
                  onChange={(e) => setFilters(prev => ({ ...prev, technicianSearch: e.target.value }))}
                />
              </div>

              {/* Date Range - Side by Side */}
              <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="From"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  />
                  <Input
                    type="date"
                    placeholder="To"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  />
                </div>
              </div>

              {/* Hatcheries */}
              <div className="space-y-2">
                <Label>Hatcheries</Label>
                <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-2">
                  {hatcheries.map(h => (
                    <div key={h.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={filters.selectedHatcheries.includes(h.id)}
                        onCheckedChange={() => toggleHatchery(h.id)}
                      />
                      <span className="text-sm">{h.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Machines */}
              <div className="space-y-2">
                <Label>Machines</Label>
                <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-2">
                  {machines.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={filters.selectedMachines.includes(m.id)}
                        onCheckedChange={() => toggleMachine(m.id)}
                      />
                      <span className="text-sm">{m.machine_number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="mt-4"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

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
            <TableHead>Mortality Count</TableHead>
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
              <TableCell colSpan={21} className="text-center text-muted-foreground">
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
                <TableCell>{item.mortality_count || "-"}</TableCell>
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
              <Label>Mortality Count</Label>
              <Input
                type="number"
                value={formData.mortality_count || ''}
                onChange={(e) => setFormData({ ...formData, mortality_count: e.target.value })}
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
