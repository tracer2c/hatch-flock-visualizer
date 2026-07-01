import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Archive, Info } from "lucide-react";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useArchive } from "@/hooks/useArchive";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatLocalDate, calculateWeekLocal } from "@/utils/localDate";
import { aggregateByFlockHouse } from "@/utils/dataSheetAggregation";

interface AllDataTabProps {
  data: any[];
  searchTerm: string;
  onDataUpdate: () => void;
}

type ViewMode = "flock" | "machine";

export const AllDataTab = ({ data, searchTerm, onDataUpdate }: AllDataTabProps) => {
  const { showPercentages, formatValue } = usePercentageToggle();
  const { archive: archiveBatch } = useArchive("batches");
  const { archive: archiveFertility } = useArchive("fertility_analysis");
  const { archive: archiveResidue } = useArchive("residue_analysis");
  const { archive: archiveQa } = useArchive("qa_monitoring");
  const { archive: archiveEggPack } = useArchive("egg_pack_quality");

  const [viewMode, setViewMode] = useState<ViewMode>("flock");

  const handleArchive = async (item: any) => {
    if (item._aggregated_count && item._aggregated_count > 1) {
      toast.info("Switch to Machine View to archive individual machine rows.");
      return;
    }
    const isRow = !!item.data_type && item.data_type !== 'embrex';
    const what = isRow ? `${item.data_type} record` : 'house';
    if (!confirm(`Archive this ${what}? It will be hidden from the data sheet but kept for the audit trail and restorable from Management → Archived Items.`)) return;
    try {
      if (item.data_type === 'fertility') await archiveFertility(item.id);
      else if (item.data_type === 'residue') await archiveResidue(item.id);
      else if (item.data_type === 'qa') await archiveQa(item.id);
      else if (item.data_type === 'egg_pack') await archiveEggPack(item.id);
      else await archiveBatch(item.batch_id);
      onDataUpdate();
    } catch {
      /* toast handled in hook */
    }
  };

  const displayData = useMemo(() => {
    const filtered = data.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    return viewMode === "flock" ? aggregateByFlockHouse(filtered) : filtered;
  }, [data, searchTerm, viewMode]);

  const handleEdit = (item: any) => {
    if (item._aggregated_count && item._aggregated_count > 1) {
      toast.info("This is a flock-level total. Switch to Machine View to edit individual machine rows.");
      return;
    }
    if (item.data_type === 'fertility') {
      toast.info("Please use the Hatch Results tab to edit fertility records");
    } else if (item.data_type === 'egg_pack') {
      toast.info("Please use the Egg Quality tab to edit egg pack records");
    } else if (item.data_type === 'residue') {
      toast.info("Please use the Residue Analysis tab to edit residue records");
    } else if (item.data_type === 'qa') {
      toast.info("Please use the Quality Assurance tab to edit QA records");
    } else {
      toast.info("Please use the Embrex/HOI tab to edit house records");
    }
  };

  const handleDelete = async (item: any) => {
    if (item._aggregated_count && item._aggregated_count > 1) {
      toast.info("Switch to Machine View to delete individual machine rows.");
      return;
    }
    if (!confirm(`Are you sure you want to delete this ${item.data_type || 'house'} record?`)) return;

    let error;
    if (item.data_type === 'fertility') {
      ({ error } = await supabase.from('fertility_analysis').delete().eq('id', item.id));
    } else if (item.data_type === 'egg_pack') {
      ({ error } = await supabase.from('egg_pack_quality').delete().eq('id', item.id));
    } else if (item.data_type === 'residue') {
      ({ error } = await supabase.from('residue_analysis').delete().eq('id', item.id));
    } else if (item.data_type === 'qa') {
      ({ error } = await supabase.from('qa_monitoring').delete().eq('id', item.id));
    } else {
      ({ error } = await supabase.from('batches').delete().eq('id', item.batch_id));
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
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="flock">Flock View</TabsTrigger>
            <TabsTrigger value="machine">Machine View</TabsTrigger>
          </TabsList>
        </Tabs>
        {viewMode === "flock" && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 border">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Totals are summed from all machine allocations for each house — no need
              to re-enter the flock total. Switch to <strong>Machine View</strong> to
              see per-machine detail.
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table key={`${viewMode}-${showPercentages ? 'percentage' : 'count'}`}>
          <TableHeader>
            <TableRow>
              <TableHead>Data Type</TableHead>
              <TableHead>Flock #</TableHead>
              <TableHead>Flock Name</TableHead>
              <TableHead>House #</TableHead>
              {viewMode === "machine" && <TableHead>Machine</TableHead>}
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
              <TableHead>{showPercentages ? "Mid Dead %" : "Mid Dead"}</TableHead>
              <TableHead>{showPercentages ? "Late Dead %" : "Late Dead"}</TableHead>
              <TableHead>Chicks</TableHead>
              <TableHead>{showPercentages ? "Pipped %" : "Pipped"}</TableHead>
              <TableHead>{showPercentages ? "Contaminated %" : "Contaminated"}</TableHead>
              <TableHead>{showPercentages ? "Malformed %" : "Malformed"}</TableHead>
              <TableHead>HOF %</TableHead>
              <TableHead>HOI %</TableHead>
              <TableHead>I/F %</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={viewMode === "machine" ? 25 : 24} className="text-center text-muted-foreground">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((item, index) => {
                const sampleSize = item.sample_size || item.total_eggs_set || 648;
                const week = calculateWeekLocal(item.set_date);
                return (
                  <TableRow key={`${item.batch_id || item.id}-${index}`}>
                    <TableCell className="capitalize font-medium">
                      <div className="flex items-center gap-2">
                        <span>
                          {item.data_type === 'batch' ? 'Embrex/HOI' :
                           item.data_type === 'fertility' ? 'Hatch Results' :
                           item.data_type === 'egg_pack' ? 'Egg Quality' :
                           item.data_type === 'residue' ? 'Residue' :
                           item.data_type === 'qa' ? 'QA' : item.data_type || 'Embrex/HOI'}
                        </span>
                        {item._aggregated_count > 1 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {item._aggregated_count} machines
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.flock_number || "-"}</TableCell>
                    <TableCell>{item.flock_name || "-"}</TableCell>
                    <TableCell>{item.house_number || "-"}</TableCell>
                    {viewMode === "machine" && (
                      <TableCell>{item.machine_number || "-"}</TableCell>
                    )}
                    <TableCell>{item.age_weeks || "-"}</TableCell>
                    <TableCell>{formatLocalDate(item.set_date)}</TableCell>
                    <TableCell>{week ?? "-"}</TableCell>
                    <TableCell>{item.total_eggs_set || "-"}</TableCell>
                    <TableCell>
                      {item.eggs_cleared ? formatValue(item.eggs_cleared, item.total_eggs_set) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.eggs_injected ? formatValue(item.eggs_injected, item.total_eggs_set) : "-"}
                    </TableCell>
                    <TableCell>{sampleSize || "-"}</TableCell>
                    <TableCell>
                      {item.infertile_eggs != null ? formatValue(item.infertile_eggs, sampleSize) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.fertile_eggs != null ? formatValue(item.fertile_eggs, sampleSize) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.early_dead != null ? formatValue(item.early_dead, sampleSize) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.mid_dead != null ? formatValue(item.mid_dead, sampleSize) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.late_dead != null ? formatValue(item.late_dead, sampleSize) : "-"}
                    </TableCell>
                    <TableCell>{item.chicks_hatched || item.chicks || "-"}</TableCell>
                    <TableCell>
                      {item.pipped_not_hatched != null ? formatValue(item.pipped_not_hatched, sampleSize) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.contaminated_eggs != null ? formatValue(item.contaminated_eggs, sampleSize) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.malformed_chicks != null ? formatValue(item.malformed_chicks, sampleSize) : "-"}
                    </TableCell>
                    <TableCell>
                      {item.hof_percent != null ? `${Number(item.hof_percent).toFixed(1)}%` : "-"}
                    </TableCell>
                    <TableCell>
                      {item.hoi_percent != null ? `${Number(item.hoi_percent).toFixed(1)}%` : "-"}
                    </TableCell>
                    <TableCell>
                      {item.if_dev_percent != null ? `${Number(item.if_dev_percent).toFixed(1)}%` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleArchive(item)}
                          title="Archive (keeps audit trail, restorable)"
                        >
                          <Archive className="h-4 w-4" />
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
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
