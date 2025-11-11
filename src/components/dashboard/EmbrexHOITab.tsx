import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Edit, Trash2, Filter, ChevronDown, X } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface EmbrexHOITabProps {
  data: any[];
  searchTerm: string;
  onDataUpdate: () => void;
}

export const EmbrexHOITab = ({ data, searchTerm, onDataUpdate }: EmbrexHOITabProps) => {
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showFilters, setShowFilters] = useState(false);
  
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
              {/* Sort By Column */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set_date">Set Date</SelectItem>
                    <SelectItem value="flock_number">Flock #</SelectItem>
                    <SelectItem value="flock_name">Flock Name</SelectItem>
                    <SelectItem value="house_number">House #</SelectItem>
                    <SelectItem value="age_weeks">Age (weeks)</SelectItem>
                    <SelectItem value="total_eggs_set">Total Eggs Set</SelectItem>
                    <SelectItem value="eggs_cleared">Clears</SelectItem>
                    <SelectItem value="eggs_injected">Injected</SelectItem>
                    <SelectItem value="machine_number">Machine</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Select value={filters.sortOrder} onValueChange={(value: 'asc' | 'desc') => setFilters(prev => ({ ...prev, sortOrder: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Technician Search */}
              <div className="space-y-2">
                <Label>Technician Name</Label>
                <Input
                  placeholder="Search by technician..."
                  value={filters.technicianSearch}
                  onChange={(e) => setFilters(prev => ({ ...prev, technicianSearch: e.target.value }))}
                />
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
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
              <Label>Hatchery: {editingRecord?.batch_number}</Label>
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