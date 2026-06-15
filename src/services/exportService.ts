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
   * Export multiple sheets into one Excel workbook.
   * Each entry becomes its own tab. Sheet names are sanitized and de-duplicated
   * to satisfy Excel's 31-char / no-special-char rules.
   */
  static exportMultiSheet(
    sheets: { name: string; data: any[]; headers?: string[] }[],
    filename: string
  ) {
    const validSheets = sheets.filter((s) => s.data && s.data.length > 0);
    if (validSheets.length === 0) {
      throw new Error('No data to export');
    }

    const workbook = XLSX.utils.book_new();
    const usedNames = new Set<string>();

    validSheets.forEach((sheet, idx) => {
      // Excel sheet names: max 31 chars, no : \ / ? * [ ]
      let safe = (sheet.name || `Sheet ${idx + 1}`)
        .replace(/[:\\/?*[\]]/g, ' ')
        .trim()
        .slice(0, 28);
      if (!safe) safe = `Sheet ${idx + 1}`;
      // De-dupe
      let candidate = safe;
      let suffix = 1;
      while (usedNames.has(candidate.toLowerCase())) {
        candidate = `${safe.slice(0, 25)} (${suffix++})`;
      }
      usedNames.add(candidate.toLowerCase());

      const headers = sheet.headers || Object.keys(sheet.data[0]);
      const worksheetData = [
        headers,
        ...sheet.data.map((row) => headers.map((h) => row[h] ?? '')),
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Auto-size columns to content (capped) for readability
      worksheet['!cols'] = headers.map((h, ci) => {
        const maxLen = Math.max(
          String(h).length,
          ...sheet.data.map((row) => String(row[h] ?? '').length)
        );
        return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
      });

      XLSX.utils.book_append_sheet(workbook, worksheet, candidate);
    });

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
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
