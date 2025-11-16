import * as XLSX from 'xlsx';

export class ExportService {
  /**
   * Export data to CSV format
   */
  static exportToCSV(data: any[], filename: string, headers?: string[]) {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const actualHeaders = headers || Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      actualHeaders.join(','),
      ...data.map(row => 
        actualHeaders.map(header => {
          const value = row[header];
          // Handle null/undefined
          if (value === null || value === undefined) return '';
          // Escape values with commas or quotes
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadFile(blob, `${filename}.csv`);
  }

  /**
   * Export data to Excel format
   */
  static exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1', headers?: string[]) {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const actualHeaders = headers || Object.keys(data[0]);
    
    // Prepare data with headers
    const worksheetData = [
      actualHeaders,
      ...data.map(row => actualHeaders.map(header => row[header] ?? ''))
    ];

    // Create workbook and worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    this.downloadFile(blob, `${filename}.xlsx`);
  }

  /**
   * Download file to user's system
   */
  static downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Format data for export by selecting and renaming columns
   */
  static formatDataForExport(
    data: any[],
    columnMap: Record<string, string> // { displayName: fieldName }
  ): any[] {
    return data.map(row => {
      const formatted: any = {};
      Object.entries(columnMap).forEach(([displayName, fieldName]) => {
        formatted[displayName] = row[fieldName];
      });
      return formatted;
    });
  }
}
