import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { format } from "date-fns";

interface ResidueBreakoutTableProps {
  data: any[];
  searchTerm: string;
  onDataUpdate: () => void;
}

export const ResidueBreakoutTable = ({ data, searchTerm }: ResidueBreakoutTableProps) => {
  const { showPercentages, formatValue } = usePercentageToggle();

  const filteredData = data.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flock #</TableHead>
            <TableHead>Flock Name</TableHead>
            <TableHead>House #</TableHead>
            <TableHead>Age (wks)</TableHead>
            <TableHead>Set Date</TableHead>
            <TableHead>Sample</TableHead>
            <TableHead>Infertile</TableHead>
            <TableHead>Fertile</TableHead>
            <TableHead>Fert. %</TableHead>
            <TableHead>{showPercentages ? "Early Dead %" : "Early Dead"}</TableHead>
            <TableHead>{showPercentages ? "Mid Dead %" : "Mid Dead"}</TableHead>
            <TableHead>{showPercentages ? "Late Dead %" : "Late Dead"}</TableHead>
            <TableHead>Hatch</TableHead>
            <TableHead>Hatch %</TableHead>
            <TableHead>HOF %</TableHead>
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
            filteredData.map((item) => (
              <TableRow key={item.batch_id}>
                <TableCell>{item.flock_number || "-"}</TableCell>
                <TableCell>{item.flock_name || "-"}</TableCell>
                <TableCell>{item.house_number || "-"}</TableCell>
                <TableCell>{item.age_weeks || "-"}</TableCell>
                <TableCell>
                  {item.set_date ? format(new Date(item.set_date), "M/d/yyyy") : "-"}
                </TableCell>
                <TableCell>{item.residue_sample_size || item.sample_size || "-"}</TableCell>
                <TableCell>{item.infertile_eggs || "-"}</TableCell>
                <TableCell>{item.fertile_eggs || "-"}</TableCell>
                <TableCell>
                  {item.fertility_percent ? `${item.fertility_percent.toFixed(1)}%` : "-"}
                </TableCell>
                <TableCell>
                  {formatValue(item.early_dead, item.residue_sample_size || item.sample_size)}
                </TableCell>
                <TableCell>
                  {formatValue(item.mid_dead, item.residue_sample_size || item.sample_size)}
                </TableCell>
                <TableCell>
                  {formatValue(item.late_dead, item.residue_sample_size || item.sample_size)}
                </TableCell>
                <TableCell>{item.chicks_hatched || "-"}</TableCell>
                <TableCell>
                  {item.hatch_percent ? `${item.hatch_percent.toFixed(1)}%` : "-"}
                </TableCell>
                <TableCell>
                  {item.hof_percent ? `${item.hof_percent.toFixed(1)}%` : "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
