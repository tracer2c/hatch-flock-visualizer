import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Archive, Rows3, LayoutGrid } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVisualPreferences } from "@/hooks/useVisualPreferences";
import { useArchive } from "@/hooks/useArchive";
import { FlockSummaryView } from "@/components/dashboard/FlockSummaryView";
import { aggregateByHouse, proportionalSplit } from "@/utils/dataSheetAggregation";
import { formatLocalDate } from "@/utils/localDate";

const SECTION = "embrex_hoi";

interface EmbrexHOITabProps {
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

export const EmbrexHOITab = ({ data, searchTerm, filters, onDataUpdate, readOnly }: EmbrexHOITabProps) => {
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [view, setView] = useState<"rows" | "flock-summary">("rows");
  const { archive: archiveHouse } = useArchive("batches");

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this house? It will be hidden from the data sheet but kept for the audit trail and restorable from Management → Archived Items → Houses.")) return;
    try {
      await archiveHouse(id);
      onDataUpdate();
    } catch {
      /* toast handled in hook */
    }
  };
  const [formData, setFormData] = useState<any>({});
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

  // Collapse per-machine batches into one row per house. Kept behind a
  // "By House" toggle-esque default so a house appears once with its full
  // 87k total instead of split across TROY-15/20/18.
  const houseData = useMemo(() => aggregateByHouse(filteredData), [filteredData]);

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
      const cleared = parseInt(formData.eggs_cleared) || 0;
      const injected = parseInt(formData.eggs_injected) || 0;
      const slices: Array<{ id: string; total_eggs_set: number }> =
        editingRecord?._batch_slices || [{ id: editingRecord.id, total_eggs_set: editingRecord.total_eggs_set || 0 }];

      const clearedSplit = proportionalSplit(cleared, slices);
      const injectedSplit = proportionalSplit(injected, slices);

      // Distribute clears/injected across the house's underlying batches
      // proportionally by egg share. Technician/notes copy to every slice.
      const results = await Promise.all(
        slices.map((s, i) =>
          Promise.resolve(
            supabase
              .from("batches")
              .update({
                eggs_cleared: clearedSplit[i].value,
                eggs_injected: injectedSplit[i].value ?? 0,
                hoi_technician_name: formData.technician_name,
                hoi_notes: formData.notes,
                clears_technician_name: formData.technician_name,
                clears_notes: formData.notes,
              })
              .eq("id", s.id)
          )
        )
      );
      for (const r of results) if (r.error) throw r.error;

      toast.success(
        slices.length > 1
          ? `Updated across ${slices.length} machine allocations`
          : "Record updated successfully"
      );
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
      <div className="flex justify-end mb-3">
        <div className="inline-flex rounded-md border p-0.5">
          <Button
            variant={view === "rows" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5"
            onClick={() => setView("rows")}
          >
            <Rows3 className="h-3.5 w-3.5" />
            By House
          </Button>
          <Button
            variant={view === "flock-summary" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5"
            onClick={() => setView("flock-summary")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            By Flock
          </Button>
        </div>
      </div>

      {view === "flock-summary" ? (
        <FlockSummaryView
          data={filteredData}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          readOnly={readOnly}
          onDataUpdate={onDataUpdate}
        />

      ) : (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {show("flock_number") && <TableHead>Flock #</TableHead>}
              {show("flock_name") && <TableHead>Flock Name</TableHead>}
              {show("house_number") && <TableHead>House #</TableHead>}
              {show("age_weeks") && <TableHead>Age (weeks)</TableHead>}
              {show("set_date") && <TableHead>Set Date</TableHead>}
              {show("total_eggs_set") && <TableHead>Total Eggs Set</TableHead>}
              {show("eggs_cleared") && <TableHead>Clears</TableHead>}
              {show("clear_percent") && <TableHead>Clear %</TableHead>}
              {show("eggs_injected") && <TableHead>Injected</TableHead>}
              {show("injected_percent") && <TableHead>Injected %</TableHead>}
              {show("machine_number") && <TableHead>Machine</TableHead>}
              {show("status") && <TableHead>Status</TableHead>}
              {show("technician_name") && <TableHead>Technician Name</TableHead>}
              {show("notes") && <TableHead>Notes</TableHead>}
              {!readOnly && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {houseData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={99} className="text-center text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              houseData.map((item) => {
                const clearPercent = item.total_eggs_set > 0
                  ? ((item.eggs_cleared / item.total_eggs_set) * 100).toFixed(1)
                  : "0";
                const injectedPercent = item.total_eggs_set > 0
                  ? ((item.eggs_injected / item.total_eggs_set) * 100).toFixed(1)
                  : "0";
                const aggregated = (item._aggregated_count ?? 1) > 1;

                return (
                  <TableRow key={item.id}>
                    {show("flock_number") && <TableCell>{item.flock_number || "-"}</TableCell>}
                    {show("flock_name") && <TableCell>{item.flock_name || "-"}</TableCell>}
                    {show("house_number") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{item.house_number || "-"}</span>
                          {aggregated && (
                            <Badge variant="secondary" className="text-[10px]">
                              {item._aggregated_count} machines
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {show("age_weeks") && <TableCell>{item.age_weeks || "-"}</TableCell>}
                    {show("set_date") && <TableCell>{formatLocalDate(item.set_date)}</TableCell>}
                    {show("total_eggs_set") && <TableCell>{item.total_eggs_set?.toLocaleString() || "0"}</TableCell>}
                    {show("eggs_cleared") && <TableCell>{item.eggs_cleared?.toLocaleString() || "0"}</TableCell>}
                    {show("clear_percent") && <TableCell>{clearPercent}%</TableCell>}
                    {show("eggs_injected") && <TableCell>{item.eggs_injected?.toLocaleString() || "0"}</TableCell>}
                    {show("injected_percent") && <TableCell>{injectedPercent}%</TableCell>}
                    {show("machine_number") && (
                      <TableCell>
                        {aggregated ? (
                          <span className="text-muted-foreground text-xs">
                            {item._aggregated_count} machines
                          </span>
                        ) : (
                          item.machine_number || "-"
                        )}
                      </TableCell>
                    )}
                    {show("status") && (
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.status === 'completed' ? 'bg-green-100 text-green-800' :
                          item.status === 'incubating' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      </TableCell>
                    )}
                    {show("technician_name") && <TableCell>{item.hoi_technician_name || item.clears_technician_name || item.fertility_technician_name || "-"}</TableCell>}
                    {show("notes") && <TableCell className="max-w-xs truncate">{item.hoi_notes || item.clears_notes || "-"}</TableCell>}
                    {!readOnly && (
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
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (aggregated) {
                                toast.info("This row aggregates multiple machine allocations. Archive from Management → Houses for full control.");
                                return;
                              }
                              handleArchive(item.id);
                            }}
                            title="Archive house (keeps audit trail, restorable)"
                            className="text-amber-700 border-amber-300 hover:bg-amber-50"
                          >
                            <Archive className="h-4 w-4 mr-1" />
                            Archive
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (aggregated) {
                                toast.info("This row aggregates multiple machine allocations. Delete from Management → Houses.");
                                return;
                              }
                              handleDelete(item.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      )}

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
              <Button onClick={handleSave} disabled={readOnly}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};