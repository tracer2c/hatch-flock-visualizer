import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SetterTempRecord {
  id: number;
  type: string;
  setterNumber: string;
  timeOfDay?: string;
  leftTemps: {
    top: number;
    middle: number;
    bottom: number;
    average: number;
  };
  rightTemps: {
    top: number;
    middle: number;
    bottom: number;
    average: number;
  };
  checkDate: string;
}

interface SetterTempTableProps {
  data: SetterTempRecord[];
}

const SetterTempTable: React.FC<SetterTempTableProps> = ({ data }) => {
  // Organize data by time of day
  const organizeData = () => {
    const organized: {
      morning: { left: any; right: any };
      afternoon: { left: any; right: any };
      evening: { left: any; right: any };
    } = {
      morning: { left: null, right: null },
      afternoon: { left: null, right: null },
      evening: { left: null, right: null }
    };

    data.forEach(record => {
      const timeOfDay = (record.timeOfDay || 'morning').toLowerCase();
      if (timeOfDay === 'morning' || timeOfDay === 'afternoon' || timeOfDay === 'evening') {
        organized[timeOfDay as 'morning' | 'afternoon' | 'evening'].left = record.leftTemps;
        organized[timeOfDay as 'morning' | 'afternoon' | 'evening'].right = record.rightTemps;
      }
    });

    return organized;
  };

  const organized = organizeData();

  // Calculate averages across time periods
  const calculateAverage = (side: 'left' | 'right', position: 'top' | 'middle' | 'bottom') => {
    const values: number[] = [];
    ['morning', 'afternoon', 'evening'].forEach((time) => {
      const temp = organized[time as 'morning' | 'afternoon' | 'evening'][side];
      if (temp && temp[position]) {
        values.push(temp[position]);
      }
    });
    if (values.length === 0) return '-';
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return avg.toFixed(1);
  };

  const getTempColor = (temp: number | undefined) => {
    if (!temp) return '';
    if (temp >= 99.5 && temp <= 100.5) return 'text-green-600 font-semibold';
    if (temp >= 99.0 && temp < 99.5 || temp > 100.5 && temp <= 101.0) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const renderTemp = (temp: number | undefined) => {
    if (!temp) return '-';
    return <span className={getTempColor(temp)}>{temp.toFixed(1)}</span>;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No setter temperature records available. Add readings for different time periods.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="p-3 text-left font-semibold bg-muted/50">Position</th>
              <th className="p-3 text-center font-semibold bg-blue-50 border-x border-border" colSpan={3}>
                Left Side (°F)
              </th>
              <th className="p-3 text-center font-semibold bg-purple-50" colSpan={3}>
                Right Side (°F)
              </th>
            </tr>
            <tr className="border-b border-border">
              <th className="p-2 text-left text-sm bg-muted/30"></th>
              <th className="p-2 text-center text-sm bg-blue-50/50 border-l border-border">Morning</th>
              <th className="p-2 text-center text-sm bg-blue-50/50">Afternoon</th>
              <th className="p-2 text-center text-sm bg-blue-50/50 border-r border-border">Evening</th>
              <th className="p-2 text-center text-sm bg-purple-50/50">Morning</th>
              <th className="p-2 text-center text-sm bg-purple-50/50">Afternoon</th>
              <th className="p-2 text-center text-sm bg-purple-50/50">Evening</th>
            </tr>
          </thead>
          <tbody>
            {/* Top Row */}
            <tr className="border-b border-border hover:bg-muted/20">
              <td className="p-3 font-medium bg-muted/30">Top</td>
              <td className="p-3 text-center bg-blue-50/30 border-l border-border">
                {renderTemp(organized.morning.left?.top)}
              </td>
              <td className="p-3 text-center bg-blue-50/30">
                {renderTemp(organized.afternoon.left?.top)}
              </td>
              <td className="p-3 text-center bg-blue-50/30 border-r border-border">
                {renderTemp(organized.evening.left?.top)}
              </td>
              <td className="p-3 text-center bg-purple-50/30">
                {renderTemp(organized.morning.right?.top)}
              </td>
              <td className="p-3 text-center bg-purple-50/30">
                {renderTemp(organized.afternoon.right?.top)}
              </td>
              <td className="p-3 text-center bg-purple-50/30">
                {renderTemp(organized.evening.right?.top)}
              </td>
            </tr>

            {/* Middle Row */}
            <tr className="border-b border-border hover:bg-muted/20">
              <td className="p-3 font-medium bg-muted/30">Middle</td>
              <td className="p-3 text-center bg-blue-50/30 border-l border-border">
                {renderTemp(organized.morning.left?.middle)}
              </td>
              <td className="p-3 text-center bg-blue-50/30">
                {renderTemp(organized.afternoon.left?.middle)}
              </td>
              <td className="p-3 text-center bg-blue-50/30 border-r border-border">
                {renderTemp(organized.evening.left?.middle)}
              </td>
              <td className="p-3 text-center bg-purple-50/30">
                {renderTemp(organized.morning.right?.middle)}
              </td>
              <td className="p-3 text-center bg-purple-50/30">
                {renderTemp(organized.afternoon.right?.middle)}
              </td>
              <td className="p-3 text-center bg-purple-50/30">
                {renderTemp(organized.evening.right?.middle)}
              </td>
            </tr>

            {/* Bottom Row */}
            <tr className="border-b border-border hover:bg-muted/20">
              <td className="p-3 font-medium bg-muted/30">Bottom</td>
              <td className="p-3 text-center bg-blue-50/30 border-l border-border">
                {renderTemp(organized.morning.left?.bottom)}
              </td>
              <td className="p-3 text-center bg-blue-50/30">
                {renderTemp(organized.afternoon.left?.bottom)}
              </td>
              <td className="p-3 text-center bg-blue-50/30 border-r border-border">
                {renderTemp(organized.evening.left?.bottom)}
              </td>
              <td className="p-3 text-center bg-purple-50/30">
                {renderTemp(organized.morning.right?.bottom)}
              </td>
              <td className="p-3 text-center bg-purple-50/30">
                {renderTemp(organized.afternoon.right?.bottom)}
              </td>
              <td className="p-3 text-center bg-purple-50/30">
                {renderTemp(organized.evening.right?.bottom)}
              </td>
            </tr>

            {/* Average Row */}
            <tr className="bg-yellow-100 border-y-2 border-yellow-300 font-semibold">
              <td className="p-3 bg-yellow-200">Average</td>
              <td className="p-3 text-center border-l border-yellow-300" colSpan={3}>
                <div className="flex justify-around">
                  <span>{renderTemp(organized.morning.left?.average)}</span>
                  <span>{renderTemp(organized.afternoon.left?.average)}</span>
                  <span>{renderTemp(organized.evening.left?.average)}</span>
                </div>
              </td>
              <td className="p-3 text-center" colSpan={3}>
                <div className="flex justify-around">
                  <span>{renderTemp(organized.morning.right?.average)}</span>
                  <span>{renderTemp(organized.afternoon.right?.average)}</span>
                  <span>{renderTemp(organized.evening.right?.average)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 mt-4">
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-semibold">●</span> 
          <span>Optimal Range: 99.5–100.5°F</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-600 font-semibold">●</span> 
          <span>Acceptable: 99.0–99.5°F or 100.5–101.0°F</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-600 font-semibold">●</span> 
          <span>Outside Range: Below 99.0°F or Above 101.0°F</span>
        </div>
      </div>
    </div>
  );
};

export default SetterTempTable;
