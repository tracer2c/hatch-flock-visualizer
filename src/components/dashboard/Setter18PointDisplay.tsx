import React from 'react';
import { Badge } from "@/components/ui/badge";

interface Setter18PointDisplayProps {
  data: {
    temp_front_top_left?: number | null;
    temp_front_top_right?: number | null;
    temp_front_mid_left?: number | null;
    temp_front_mid_right?: number | null;
    temp_front_bottom_left?: number | null;
    temp_front_bottom_right?: number | null;
    temp_middle_top_left?: number | null;
    temp_middle_top_right?: number | null;
    temp_middle_mid_left?: number | null;
    temp_middle_mid_right?: number | null;
    temp_middle_bottom_left?: number | null;
    temp_middle_bottom_right?: number | null;
    temp_back_top_left?: number | null;
    temp_back_top_right?: number | null;
    temp_back_mid_left?: number | null;
    temp_back_mid_right?: number | null;
    temp_back_bottom_left?: number | null;
    temp_back_bottom_right?: number | null;
    temp_avg_overall?: number | null;
    temp_avg_front?: number | null;
    temp_avg_middle?: number | null;
    temp_avg_back?: number | null;
  };
  compact?: boolean;
}

const Setter18PointDisplay: React.FC<Setter18PointDisplayProps> = ({ data, compact = false }) => {
  const getTempColor = (temp: number | null | undefined): string => {
    if (temp === null || temp === undefined) return 'text-muted-foreground';
    if (temp >= 99.5 && temp <= 100.5) return 'text-green-600 font-semibold';
    if ((temp >= 99.0 && temp < 99.5) || (temp > 100.5 && temp <= 101.0)) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const getAvgBadgeColor = (avg: number | null | undefined): string => {
    if (avg === null || avg === undefined) return 'bg-muted text-muted-foreground';
    if (avg >= 99.5 && avg <= 100.5) return 'bg-green-100 text-green-800 border-green-300';
    if ((avg >= 99.0 && avg < 99.5) || (avg > 100.5 && avg <= 101.0)) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const renderTemp = (temp: number | null | undefined): React.ReactNode => {
    if (temp === null || temp === undefined) return '-';
    return <span className={getTempColor(temp)}>{temp.toFixed(1)}</span>;
  };

  if (compact) {
    // Compact view - just show zone averages
    return (
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className={`text-xs ${getAvgBadgeColor(data.temp_avg_front)}`}>
          F: {data.temp_avg_front?.toFixed(1) || '-'}
        </Badge>
        <Badge variant="outline" className={`text-xs ${getAvgBadgeColor(data.temp_avg_middle)}`}>
          M: {data.temp_avg_middle?.toFixed(1) || '-'}
        </Badge>
        <Badge variant="outline" className={`text-xs ${getAvgBadgeColor(data.temp_avg_back)}`}>
          B: {data.temp_avg_back?.toFixed(1) || '-'}
        </Badge>
      </div>
    );
  }

  // Check if any 18-point data exists
  const hasData = data.temp_front_top_left !== null && data.temp_front_top_left !== undefined;

  if (!hasData) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No 18-point temperature data available.
      </div>
    );
  }

  const levels = ['top', 'mid', 'bottom'] as const;
  const levelLabels = { top: 'Top', mid: 'Mid', bottom: 'Bottom' };

  return (
    <div className="space-y-3">
      {/* Zone Averages */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded-lg">
        <span className="font-medium text-sm">Zone Averages:</span>
        <Badge variant="outline" className={getAvgBadgeColor(data.temp_avg_front)}>
          Front: {data.temp_avg_front?.toFixed(1) || '-'}°F
        </Badge>
        <Badge variant="outline" className={getAvgBadgeColor(data.temp_avg_middle)}>
          Middle: {data.temp_avg_middle?.toFixed(1) || '-'}°F
        </Badge>
        <Badge variant="outline" className={getAvgBadgeColor(data.temp_avg_back)}>
          Back: {data.temp_avg_back?.toFixed(1) || '-'}°F
        </Badge>
        <Badge variant="default" className={getAvgBadgeColor(data.temp_avg_overall)}>
          Overall: {data.temp_avg_overall?.toFixed(1) || '-'}°F
        </Badge>
      </div>

      {/* Full Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="p-2 text-left font-semibold bg-muted/50">Level</th>
              <th className="p-2 text-center font-semibold bg-blue-50 border-l" colSpan={2}>Front (A)</th>
              <th className="p-2 text-center font-semibold bg-green-50 border-l" colSpan={2}>Middle (B)</th>
              <th className="p-2 text-center font-semibold bg-purple-50 border-l" colSpan={2}>Back (C)</th>
            </tr>
            <tr className="border-b border-border">
              <th className="p-2 text-left text-xs bg-muted/30"></th>
              <th className="p-2 text-center text-xs bg-blue-50/50 border-l">Left</th>
              <th className="p-2 text-center text-xs bg-blue-50/50">Right</th>
              <th className="p-2 text-center text-xs bg-green-50/50 border-l">Left</th>
              <th className="p-2 text-center text-xs bg-green-50/50">Right</th>
              <th className="p-2 text-center text-xs bg-purple-50/50 border-l">Left</th>
              <th className="p-2 text-center text-xs bg-purple-50/50">Right</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level) => (
              <tr key={level} className="border-b hover:bg-muted/20">
                <td className="p-2 font-medium bg-muted/30">{levelLabels[level]}</td>
                <td className="p-2 text-center bg-blue-50/30 border-l">
                  {renderTemp(data[`temp_front_${level}_left` as keyof typeof data] as number | null)}
                </td>
                <td className="p-2 text-center bg-blue-50/30">
                  {renderTemp(data[`temp_front_${level}_right` as keyof typeof data] as number | null)}
                </td>
                <td className="p-2 text-center bg-green-50/30 border-l">
                  {renderTemp(data[`temp_middle_${level}_left` as keyof typeof data] as number | null)}
                </td>
                <td className="p-2 text-center bg-green-50/30">
                  {renderTemp(data[`temp_middle_${level}_right` as keyof typeof data] as number | null)}
                </td>
                <td className="p-2 text-center bg-purple-50/30 border-l">
                  {renderTemp(data[`temp_back_${level}_left` as keyof typeof data] as number | null)}
                </td>
                <td className="p-2 text-center bg-purple-50/30">
                  {renderTemp(data[`temp_back_${level}_right` as keyof typeof data] as number | null)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Setter18PointDisplay;
