import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from './use-toast';

export const useChartExport = () => {
  const { toast } = useToast();

  const exportChartToPDF = async (chartId: string, filename: string) => {
    try {
      const element = document.getElementById(chartId);
      if (!element) {
        throw new Error(`Chart element with id '${chartId}' not found`);
      }

      toast({
        title: "Generating PDF...",
        description: "Please wait while we capture the chart",
      });

      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Convert to PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${filename}.pdf`);

      toast({
        title: "Export successful",
        description: `${filename}.pdf has been downloaded`,
      });
    } catch (error) {
      console.error('Error exporting chart to PDF:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export chart",
        variant: "destructive"
      });
    }
  };

  const exportMultipleChartsToPDF = async (chartIds: string[], filename: string) => {
    try {
      toast({
        title: "Generating PDF...",
        description: `Capturing ${chartIds.length} charts`,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < chartIds.length; i++) {
        const element = document.getElementById(chartIds[i]);
        if (!element) {
          console.warn(`Chart element with id '${chartIds[i]}' not found, skipping`);
          continue;
        }

        const canvas = await html2canvas(element, {
          scale: 2,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Add new page for each chart except the first
        if (i > 0) {
          pdf.addPage();
        }

        // Calculate dimensions to fit A4
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`${filename}.pdf`);

      toast({
        title: "Export successful",
        description: `${filename}.pdf with ${chartIds.length} charts has been downloaded`,
      });
    } catch (error) {
      console.error('Error exporting charts to PDF:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export charts",
        variant: "destructive"
      });
    }
  };

  return {
    exportChartToPDF,
    exportMultipleChartsToPDF
  };
};
