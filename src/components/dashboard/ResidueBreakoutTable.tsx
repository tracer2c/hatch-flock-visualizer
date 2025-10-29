import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";
import { format } from "date-fns";

interface ResidueBreakoutTableProps {
  data: any[];
  searchTerm: string;
}

export const ResidueBreakoutTable = ({ data, searchTerm }: ResidueBreakoutTableProps) => {
  const { showPercentages, formatValue } = usePercentageToggle();

  const filteredData = data.filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flock#</TableHead>
            <TableHead>Flock Name</TableHead>
            <TableHead className="text-right">Age (wks)</TableHead>
            <TableHead>House#</TableHead>
            <TableHead>Set Date</TableHead>
            <TableHead className="text-right">Sample</TableHead>
            <TableHead className="text-right">Infertile</TableHead>
            <TableHead className="text-right">Fertile</TableHead>
            <TableHead className="text-right">{showPercentages ? "Early Dead %" : "Early Dead"}</TableHead>
            <TableHead className="text-right">{showPercentages ? "Mid Dead %" : "Mid Dead"}</TableHead>
            <TableHead className="text-right">{showPercentages ? "Late Dead %" : "Late Dead"}</TableHead>
            <TableHead className="text-right">Fert. %</TableHead>
            <TableHead className="text-right">Hatch</TableHead>
            <TableHead className="text-right">Hatch %</TableHead>
            <TableHead className="text-right">HOF %</TableHead>
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
              <TableRow key={item.batch_id} className="hover:bg-muted/50">
                <TableCell>{item.flock_number || "-"}</TableCell>
                <TableCell>{item.flock_name || "-"}</TableCell>
                <TableCell className="text-right">{item.age_weeks || "-"}</TableCell>
                <TableCell>{item.house_number || "-"}</TableCell>
                <TableCell>
                  {item.set_date ? format(new Date(item.set_date), "M/d/yyyy") : "-"}
                </TableCell>
                <TableCell className="text-right">{item.residue_sample_size || "-"}</TableCell>
                <TableCell className="text-right">{item.infertile_eggs || "-"}</TableCell>
                <TableCell className="text-right">{item.fertile_eggs || "-"}</TableCell>
                <TableCell className="text-right">
                  {formatValue(item.early_dead, item.residue_sample_size)}
                </TableCell>
                <TableCell className="text-right">
                  {formatValue(item.mid_dead, item.residue_sample_size)}
                </TableCell>
                <TableCell className="text-right">
                  {formatValue(item.late_dead, item.residue_sample_size)}
                </TableCell>
                <TableCell className="text-right">
                  {item.fertility_percent ? `${item.fertility_percent.toFixed(1)}%` : "-"}
                </TableCell>
                <TableCell className="text-right">{item.chicks_hatched || "-"}</TableCell>
                <TableCell className="text-right">
                  {item.hatch_percent ? `${item.hatch_percent.toFixed(1)}%` : "-"}
                </TableCell>
                <TableCell className="text-right">
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
