import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmbrexHOITabProps {
  data: any[];
  searchTerm: string;
  onDataUpdate: () => void;
}

export const EmbrexHOITab = ({ data, searchTerm, onDataUpdate }: EmbrexHOITabProps) => {
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const filteredData = data.filter(item => {
    const searchStr = searchTerm.toLowerCase();
    return (
      item.flock_name?.toLowerCase().includes(searchStr) ||
      item.flock_number?.toString().includes(searchStr) ||
      item.batch_number?.toLowerCase().includes(searchStr) ||
      item.house_number?.toLowerCase().includes(searchStr)
    );
  });

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormData({
      eggs_cleared: record.eggs_cleared || 0,
      eggs_injected: record.eggs_injected || 0,
    });
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("batches")
        .update({
          eggs_cleared: parseInt(formData.eggs_cleared) || 0,
          eggs_injected: parseInt(formData.eggs_injected) || 0,
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
              <TableHead>Sample Size</TableHead>
              <TableHead>Clears</TableHead>
              <TableHead>Clear %</TableHead>
              <TableHead>Injected</TableHead>
              <TableHead>Injected %</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-muted-foreground">
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
              <Label>Batch: {editingRecord?.batch_number}</Label>
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
