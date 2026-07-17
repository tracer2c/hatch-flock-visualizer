import { ResidueBreakoutTable } from "./ResidueBreakoutTable";
import type { DataSheetViewMode } from "./DataSheetViewModeToggle";

interface ResidueBreakoutTabProps {
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
  viewMode?: DataSheetViewMode;
  onViewModeChange?: (v: DataSheetViewMode) => void;
}

export const ResidueBreakoutTab = ({ data, searchTerm, filters, onDataUpdate, readOnly, viewMode, onViewModeChange }: ResidueBreakoutTabProps) => {
  return <ResidueBreakoutTable data={data} searchTerm={searchTerm} filters={filters} onDataUpdate={onDataUpdate} readOnly={readOnly} viewMode={viewMode} onViewModeChange={onViewModeChange} />;
};
