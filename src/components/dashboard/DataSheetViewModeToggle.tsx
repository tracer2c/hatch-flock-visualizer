import { Button } from "@/components/ui/button";
import { LayoutGrid, Rows3 } from "lucide-react";

export type DataSheetViewMode = "rows" | "flock-summary";

interface Props {
  value: DataSheetViewMode;
  onChange: (v: DataSheetViewMode) => void;
  className?: string;
}

export const DataSheetViewModeToggle = ({ value, onChange, className }: Props) => (
  <div className={"flex justify-end mb-3 " + (className ?? "")}>
    <div className="inline-flex rounded-md border p-0.5">
      <Button
        variant={value === "rows" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 gap-1.5"
        onClick={() => onChange("rows")}
      >
        <Rows3 className="h-3.5 w-3.5" />
        By House
      </Button>
      <Button
        variant={value === "flock-summary" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 gap-1.5"
        onClick={() => onChange("flock-summary")}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        By Flock
      </Button>
    </div>
  </div>
);
