import { ResidueBreakoutTable } from "./ResidueBreakoutTable";

interface ResidueBreakoutTabProps {
  data: any[];
  searchTerm: string;
}

export const ResidueBreakoutTab = ({ data, searchTerm }: ResidueBreakoutTabProps) => {
  return <ResidueBreakoutTable data={data} searchTerm={searchTerm} />;
};
