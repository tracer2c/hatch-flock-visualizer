import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface AllDataTabProps {
  data: any[];
  searchTerm: string;
  onDataUpdate: () => void;
}

export const AllDataTab = ({ data, searchTerm, onDataUpdate }: AllDataTabProps) => {
  const { showPercentages, formatValue } = usePercentageToggle();

  const filteredData = data.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const calculateWeek = (setDate: string) => {
    const date = new Date(setDate);
    const oneJan = new Date(date.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  };

  const handleEdit = (item: any) => {
    // Determine which sheet this data belongs to and open appropriate edit dialog
    if (item.data_type === 'fertility') {
      // Trigger fertility edit
      toast.info("Please use the Hatch Results tab to edit fertility records");
    } else if (item.data_type === 'egg_pack') {
      toast.info("Please use the Egg Quality tab to edit egg pack records");
    } else if (item.data_type === 'residue') {
      toast.info("Please use the Residue Analysis tab to edit residue records");
    } else if (item.data_type === 'qa') {
      toast.info("Please use the Quality Assurance tab to edit QA records");
    } else {
      // Embrex/HOI data (batches table)
      toast.info("Please use the Embrex/HOI tab to edit batch records");
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Are you sure you want to delete this ${item.data_type || 'batch'} record?`)) return;

    let error;
    
    if (item.data_type === 'fertility') {
      const result = await supabase.from('fertility_analysis').delete().eq('id', item.id);
      error = result.error;
    } else if (item.data_type === 'egg_pack') {
      const result = await supabase.from('egg_pack_quality').delete().eq('id', item.id);
      error = result.error;
    } else if (item.data_type === 'residue') {
      const result = await supabase.from('residue_analysis').delete().eq('id', item.id);
      error = result.error;
    } else if (item.data_type === 'qa') {
      const result = await supabase.from('qa_monitoring').delete().eq('id', item.id);
      error = result.error;
    } else {
      const result = await supabase.from('batches').delete().eq('id', item.batch_id);
      error = result.error;
    }

    if (error) {
      toast.error("Failed to delete record");
      console.error(error);
    } else {
      toast.success("Record deleted successfully");
      onDataUpdate();
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data Type</TableHead>
            <TableHead>Flock #</TableHead>
            <TableHead>Flock Name</TableHead>
            <TableHead>House #</TableHead>
            <TableHead>Age (wks)</TableHead>
            <TableHead>Set Date</TableHead>
            <TableHead>Week</TableHead>
            <TableHead>Total Eggs</TableHead>
            <TableHead>{showPercentages ? "Clears %" : "Clears"}</TableHead>
            <TableHead>{showPercentages ? "Injected %" : "Injected"}</TableHead>
            <TableHead>Sample</TableHead>
            <TableHead>{showPercentages ? "Infertile %" : "Infertile"}</TableHead>
            <TableHead>{showPercentages ? "Fertile %" : "Fertile"}</TableHead>
            <TableHead>{showPercentages ? "Early Dead %" : "Early Dead"}</TableHead>
            <TableHead>{showPercentages ? "Late Dead %" : "Late Dead"}</TableHead>
            <TableHead>HOF %</TableHead>
            <TableHead>HOI %</TableHead>
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
            filteredData.map((item, index) => (
              <TableRow key={`${item.batch_id || item.id}-${index}`}>
                <TableCell className="capitalize">{item.data_type || "Batch"}</TableCell>
                <TableCell>{item.flock_number || "-"}</TableCell>
                <TableCell>{item.flock_name || "-"}</TableCell>
                <TableCell>{item.house_number || "-"}</TableCell>
                <TableCell>{item.age_weeks || "-"}</TableCell>
                <TableCell>
                  {item.set_date ? format(new Date(item.set_date), "M/d/yyyy") : "-"}
                </TableCell>
                <TableCell>{item.set_date ? calculateWeek(item.set_date) : "-"}</TableCell>
                <TableCell>{item.total_eggs_set || "-"}</TableCell>
                <TableCell>
                  {formatValue(item.eggs_cleared, item.total_eggs_set)}
                </TableCell>
                <TableCell>
                  {formatValue(item.eggs_injected, item.total_eggs_set)}
                </TableCell>
                <TableCell>{item.sample_size || "-"}</TableCell>
                <TableCell>
                  {formatValue(item.infertile_eggs, item.sample_size)}
                </TableCell>
                <TableCell>
                  {formatValue(item.fertile_eggs, item.sample_size)}
                </TableCell>
                <TableCell>
                  {formatValue(item.early_dead, item.sample_size)}
                </TableCell>
                <TableCell>
                  {formatValue(item.late_dead, item.sample_size)}
                </TableCell>
                <TableCell>
                  {item.hof_percent ? `${item.hof_percent.toFixed(1)}%` : "-"}
                </TableCell>
                <TableCell>
                  {item.hoi_percent ? `${item.hoi_percent.toFixed(1)}%` : "-"}
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
                      onClick={() => handleDelete(item)}
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
    </div>
  );
};
