import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Image } from "lucide-react";

interface ExportDropdownProps {
  onExportCSV?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  availableFormats?: ('csv' | 'excel' | 'pdf')[];
  disabled?: boolean;
}

export const ExportDropdown = ({
  onExportCSV,
  onExportExcel,
  onExportPDF,
  availableFormats = ['csv', 'excel', 'pdf'],
  disabled = false
}: ExportDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableFormats.includes('csv') && onExportCSV && (
          <DropdownMenuItem onClick={onExportCSV}>
            <FileText className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
        )}
        {availableFormats.includes('excel') && onExportExcel && (
          <DropdownMenuItem onClick={onExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export as Excel
          </DropdownMenuItem>
        )}
        {availableFormats.includes('pdf') && onExportPDF && (
          <DropdownMenuItem onClick={onExportPDF}>
            <Image className="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
