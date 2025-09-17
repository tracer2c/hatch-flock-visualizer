import { format } from "date-fns";

export interface EmbrexCSVData {
  date: string;
  flockName: string;
  flockNumber: number;
  batchNumber: string;
  totalEggs: number;
  eggsCleared?: number;
  eggsInjected?: number;
  status?: string;
}

export const generateEmbrexTemplate = (): string => {
  const headers = [
    'Date',
    'Flock_Name',
    'Flock_Number',
    'Batch_Number',
    'Total_Eggs',
    'Eggs_Cleared',
    'Eggs_Injected',
    'Status'
  ];

  const sampleData = [
    '2024-01-15,Flock Alpha,1001,B001,5000,4500,500,completed',
    '2024-01-22,Flock Beta,1002,B002,4800,4300,480,completed',
    '2024-02-01,Flock Gamma,1003,B003,5200,4700,520,active'
  ];

  return [headers.join(','), ...sampleData].join('\n');
};

export const downloadCSVTemplate = () => {
  const csvContent = generateEmbrexTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `embrex-data-template-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseCSVContent = (csvText: string): EmbrexCSVData[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const data: EmbrexCSVData[] = [];

  // Expected headers mapping
  const headerMap = {
    'date': ['date', 'set_date', 'setdate'],
    'flockName': ['flock_name', 'flockname', 'flock'],
    'flockNumber': ['flock_number', 'flocknumber', 'flock_no'],
    'batchNumber': ['batch_number', 'batchnumber', 'batch'],
    'totalEggs': ['total_eggs', 'totaleggs', 'eggs_total'],
    'eggsCleared': ['eggs_cleared', 'eggscleared', 'cleared'],
    'eggsInjected': ['eggs_injected', 'eggsinjected', 'injected'],
    'status': ['status', 'batch_status']
  };

  // Find column indices
  const getColumnIndex = (field: keyof typeof headerMap): number => {
    const possibleNames = headerMap[field];
    return headers.findIndex(h => possibleNames.includes(h));
  };

  const dateIndex = getColumnIndex('date');
  const flockNameIndex = getColumnIndex('flockName');
  const flockNumberIndex = getColumnIndex('flockNumber');
  const batchNumberIndex = getColumnIndex('batchNumber');
  const totalEggsIndex = getColumnIndex('totalEggs');
  const eggsClearedIndex = getColumnIndex('eggsCleared');
  const eggsInjectedIndex = getColumnIndex('eggsInjected');
  const statusIndex = getColumnIndex('status');

  if (dateIndex === -1 || flockNameIndex === -1 || flockNumberIndex === -1 || 
      batchNumberIndex === -1 || totalEggsIndex === -1) {
    throw new Error('CSV must contain Date, Flock_Name, Flock_Number, Batch_Number, and Total_Eggs columns');
  }

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < headers.length) continue;

    try {
      const record: EmbrexCSVData = {
        date: values[dateIndex],
        flockName: values[flockNameIndex],
        flockNumber: parseInt(values[flockNumberIndex]) || 0,
        batchNumber: values[batchNumberIndex],
        totalEggs: parseInt(values[totalEggsIndex]) || 0,
        eggsCleared: eggsClearedIndex !== -1 ? parseInt(values[eggsClearedIndex]) || undefined : undefined,
        eggsInjected: eggsInjectedIndex !== -1 ? parseInt(values[eggsInjectedIndex]) || undefined : undefined,
        status: statusIndex !== -1 ? values[statusIndex] : undefined
      };

      // Validate date format
      const dateObj = new Date(record.date);
      if (isNaN(dateObj.getTime())) {
        console.warn(`Invalid date format in row ${i + 1}: ${record.date}`);
        continue;
      }

      data.push(record);
    } catch (error) {
      console.warn(`Error parsing row ${i + 1}:`, error);
    }
  }

  return data;
};

export const exportTimelineToCSV = (data: any[], filename: string = 'embrex-timeline') => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};