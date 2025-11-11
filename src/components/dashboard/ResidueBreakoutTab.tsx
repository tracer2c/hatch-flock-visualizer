import { ResidueBreakoutTable } from "./ResidueBreakoutTable";

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
}

export const ResidueBreakoutTab = ({ data, searchTerm, filters, onDataUpdate }: ResidueBreakoutTabProps) => {
  return <ResidueBreakoutTable data={data} searchTerm={searchTerm} filters={filters} onDataUpdate={onDataUpdate} />;
};
