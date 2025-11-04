import { ResidueBreakoutTable } from "./ResidueBreakoutTable";

interface ResidueBreakoutTabProps {
  data: any[];
  searchTerm: string;
  onDataUpdate: () => void;
}

export const ResidueBreakoutTab = ({ data, searchTerm, onDataUpdate }: ResidueBreakoutTabProps) => {
  return <ResidueBreakoutTable data={data} searchTerm={searchTerm} onDataUpdate={onDataUpdate} />;
};
