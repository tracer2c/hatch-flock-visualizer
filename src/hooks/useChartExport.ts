import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from './use-toast';

export interface ChartExportItem {
  id: string;
  title: string;
  description: string;
}

export const useChartExport = () => {
  const { toast } = useToast();

  const exportChartToPDF = async (chartId: string, filename: string, description?: string) => {
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
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add title
      pdf.setFontSize(18);
      pdf.setTextColor(30, 41, 59);
      pdf.text(filename.replace('.pdf', ''), 15, 20);

      // Add description if provided
      let yOffset = 30;
      if (description) {
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        const splitDesc = pdf.splitTextToSize(description, pageWidth - 30);
        pdf.text(splitDesc, 15, yOffset);
        yOffset += splitDesc.length * 5 + 5;
      }

      // Add chart image
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 30;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxImgHeight = pageHeight - yOffset - 20;
      const finalHeight = Math.min(imgHeight, maxImgHeight);
      const finalWidth = (finalHeight / imgHeight) * imgWidth;

      pdf.addImage(imgData, 'PNG', 15, yOffset, finalWidth, finalHeight);

      // Add footer
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 15, pageHeight - 10);

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

  const exportMultipleChartsWithDescriptions = async (
    charts: ChartExportItem[],
    filename: string,
    reportTitle?: string
  ) => {
    try {
      toast({
        title: "Generating PDF Report...",
        description: `Capturing ${charts.length} charts`,
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < charts.length; i++) {
        const chart = charts[i];
        const element = document.getElementById(chart.id);
        
        if (!element) {
          console.warn(`Chart element '${chart.id}' not found, skipping`);
          continue;
        }

        if (i > 0) pdf.addPage();

        // Add chart title
        pdf.setFontSize(16);
        pdf.setTextColor(30, 41, 59);
        pdf.text(chart.title, 15, 18);

        // Add description
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        const splitDesc = pdf.splitTextToSize(chart.description, pageWidth - 30);
        pdf.text(splitDesc, 15, 28);
        const descHeight = splitDesc.length * 5;

        // Capture and add chart
        const canvas = await html2canvas(element, {
          scale: 2,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const yOffset = 32 + descHeight;
        const imgWidth = pageWidth - 30;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const maxImgHeight = pageHeight - yOffset - 15;
        const finalHeight = Math.min(imgHeight, maxImgHeight);
        const finalWidth = (finalHeight / imgHeight) * imgWidth;

        pdf.addImage(imgData, 'PNG', 15, yOffset, finalWidth, finalHeight);

        // Add page footer
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Page ${i + 1} of ${charts.length}`, pageWidth - 30, pageHeight - 8);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, 15, pageHeight - 8);
      }

      pdf.save(filename);

      toast({
        title: "Report exported",
        description: `${filename} with ${charts.length} charts downloaded`,
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export report",
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
    exportMultipleChartsToPDF,
    exportMultipleChartsWithDescriptions
  };
};
