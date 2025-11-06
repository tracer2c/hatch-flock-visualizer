import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";
import { usePercentageToggle } from "@/hooks/usePercentageToggle";

interface HatchPerformanceTabProps {
  data: any[];
  searchTerm: string;
}

export const HatchPerformanceTab = ({ data, searchTerm }: HatchPerformanceTabProps) => {
  const { formatPercentage, formatValue } = usePercentageToggle();

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

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flock#</TableHead>
            <TableHead>Flock Name</TableHead>
            <TableHead className="text-right">Age (weeks)</TableHead>
            <TableHead>House#</TableHead>
            <TableHead>Set Date</TableHead>
            <TableHead className="text-right">Week</TableHead>
            <TableHead className="text-right">Sample Size</TableHead>
            <TableHead className="text-right">Hatch</TableHead>
            <TableHead className="text-right">Hatch %</TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                HOF %
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex" type="button">
                      <AlertCircle className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Hatch of Fertile (HOF)</p>
                    <p className="text-sm">Formula: (Chicks Hatched / Fertile Eggs) × 100</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                HOI %
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex" type="button">
                      <AlertCircle className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Hatch of Incubated (HOI)</p>
                    <p className="text-sm">Formula: ((Chicks + Culls) / Fertile) × 100</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                I/F %
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex" type="button">
                      <AlertCircle className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Infertile/Fertile Development</p>
                    <p className="text-sm">Formula: HOI % - HOF %</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="text-center text-muted-foreground">
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
                <TableCell>{item.set_date ? new Date(item.set_date).toLocaleDateString() : "-"}</TableCell>
                <TableCell className="text-right">{item.set_date ? calculateWeek(item.set_date) : "-"}</TableCell>
                <TableCell className="text-right">{item.sample_size || "-"}</TableCell>
                <TableCell className="text-right">
                  {item.chicks_hatched ? formatValue(item.chicks_hatched, item.sample_size) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {item.hatch_percent ? formatPercentage(item.hatch_percent) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {item.hof_percent ? formatPercentage(item.hof_percent) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {item.hoi_percent ? formatPercentage(item.hoi_percent) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {item.if_dev_percent ? formatPercentage(item.if_dev_percent) : "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
  );
};
