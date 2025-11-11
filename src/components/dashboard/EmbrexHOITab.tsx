import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DataSheetFilterSheet } from "./DataSheetFilterSheet";

interface EmbrexHOITabProps {
  data: any[];
  searchTerm: string;
  onDataUpdate: () => void;
}

export const EmbrexHOITab = ({ data, searchTerm, onDataUpdate }: EmbrexHOITabProps) => {
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  
  // Filter state
  const [filters, setFilters] = useState({
    sortBy: 'set_date' as string,
    sortOrder: 'desc' as 'asc' | 'desc',
    selectedHatcheries: [] as string[],
    selectedMachines: [] as string[],
    technicianSearch: '',
    dateFrom: '',
    dateTo: '',
  });

  // Load unique hatcheries and machines
  const [hatcheries, setHatcheries] = useState<{ id: string; name: string }[]>([]);
  const [machines, setMachines] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    const [hatcheriesRes, machinesRes] = await Promise.all([
      supabase.from('units').select('id, name').order('name'),
      supabase.from('machines').select('id, machine_number').order('machine_number'),
    ]);

    if (hatcheriesRes.data) {
      setHatcheries(hatcheriesRes.data.map(h => ({ id: h.id, name: h.name })));
    }
    if (machinesRes.data) {
      setMachines(machinesRes.data.map(m => ({ id: m.id, name: m.machine_number })));
    }
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
        item.hoi_technician_name?.toLowerCase().includes(techSearch) ||
        item.clears_technician_name?.toLowerCase().includes(techSearch) ||
        item.fertility_technician_name?.toLowerCase().includes(techSearch)
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
      else if (['flock_number', 'age_weeks', 'total_eggs_set', 'eggs_cleared', 'eggs_injected'].includes(sortBy)) {
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
      sortBy: 'set_date',
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

  const sortByOptions = [
    { value: 'set_date', label: 'Set Date' },
    { value: 'flock_number', label: 'Flock #' },
    { value: 'flock_name', label: 'Flock Name' },
    { value: 'house_number', label: 'House #' },
    { value: 'age_weeks', label: 'Age (weeks)' },
    { value: 'total_eggs_set', label: 'Total Eggs Set' },
    { value: 'eggs_cleared', label: 'Clears' },
    { value: 'eggs_injected', label: 'Injected' },
    { value: 'machine_number', label: 'Machine' },
    { value: 'status', label: 'Status' },
  ];

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({
      eggs_cleared: record.eggs_cleared || 0,
      eggs_injected: record.eggs_injected || 0,
      technician_name: record.hoi_technician_name || record.clears_technician_name || "",
      notes: record.hoi_notes || record.clears_notes || "",
    });
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("batches")
        .update({
          eggs_cleared: parseInt(formData.eggs_cleared) || 0,
          eggs_injected: parseInt(formData.eggs_injected) || 0,
          hoi_technician_name: formData.technician_name,
          hoi_notes: formData.notes,
          clears_technician_name: formData.technician_name,
          clears_notes: formData.notes,
        })
        .eq("id", editingRecord.id);

      if (error) throw error;

      toast.success("Record updated successfully");
      setEditingRecord(null);
      onDataUpdate();
    } catch (error: any) {
      toast.error("Failed to update record: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    try {
      const { error } = await supabase
        .from("batches")
        .update({ eggs_cleared: 0, eggs_injected: 0 })
        .eq("id", id);

      if (error) throw error;

      toast.success("Record cleared successfully");
      onDataUpdate();
    } catch (error: any) {
      toast.error("Failed to delete record: " + error.message);
    }
  };

  return (
    <>
      {/* Filters Section */}
      <div className="mb-4">
        <DataSheetFilterSheet
          filters={filters}
          setFilters={setFilters}
          hatcheries={hatcheries}
          machines={machines}
          sortByOptions={sortByOptions}
          activeFilterCount={activeFilterCount}
          onClearFilters={clearAllFilters}
          onToggleHatchery={toggleHatchery}
          onToggleMachine={toggleMachine}
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flock #</TableHead>
              <TableHead>Flock Name</TableHead>
              <TableHead>House #</TableHead>
              <TableHead>Age (weeks)</TableHead>
              <TableHead>Set Date</TableHead>
              <TableHead>Total Eggs Set</TableHead>
              <TableHead>Clears</TableHead>
              <TableHead>Clear %</TableHead>
              <TableHead>Injected</TableHead>
              <TableHead>Injected %</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Technician Name</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => {
                const clearPercent = item.total_eggs_set > 0 
                  ? ((item.eggs_cleared / item.total_eggs_set) * 100).toFixed(1)
                  : "0";
                const injectedPercent = item.total_eggs_set > 0
                  ? ((item.eggs_injected / item.total_eggs_set) * 100).toFixed(1)
                  : "0";

                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.flock_number || "-"}</TableCell>
                    <TableCell>{item.flock_name || "-"}</TableCell>
                    <TableCell>{item.house_number || "-"}</TableCell>
                    <TableCell>{item.age_weeks || "-"}</TableCell>
                    <TableCell>{item.set_date ? format(new Date(item.set_date), "MMM dd, yyyy") : "-"}</TableCell>
                    <TableCell>{item.total_eggs_set?.toLocaleString() || "0"}</TableCell>
                    <TableCell>{item.eggs_cleared?.toLocaleString() || "0"}</TableCell>
                    <TableCell>{clearPercent}%</TableCell>
                    <TableCell>{item.eggs_injected?.toLocaleString() || "0"}</TableCell>
                    <TableCell>{injectedPercent}%</TableCell>
                    <TableCell>{item.machine_number || "-"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.status === 'completed' ? 'bg-green-100 text-green-800' :
                        item.status === 'incubating' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell>{item.hoi_technician_name || item.clears_technician_name || item.fertility_technician_name || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.hoi_notes || item.clears_notes || "-"}</TableCell>
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
                          onClick={() => handleDelete(item.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Clears & Injected Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>House: {editingRecord?.batch_number}</Label>
              <p className="text-sm text-muted-foreground">
                {editingRecord?.flock_name} (Flock #{editingRecord?.flock_number})
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eggs_cleared">Clears</Label>
              <Input
                id="eggs_cleared"
                type="number"
                value={formData.eggs_cleared || ""}
                onChange={(e) => setFormData({ ...formData, eggs_cleared: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eggs_injected">Injected</Label>
              <Input
                id="eggs_injected"
                type="number"
                value={formData.eggs_injected || ""}
                onChange={(e) => setFormData({ ...formData, eggs_injected: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="technician_name">Technician Name</Label>
              <Input
                id="technician_name"
                value={formData.technician_name || ""}
                onChange={(e) => setFormData({ ...formData, technician_name: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 col-span-2">
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