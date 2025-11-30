import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Thermometer, AlertTriangle, Plus, Settings } from "lucide-react";
import { usePositionOccupancy } from '@/hooks/usePositionOccupancy';
import { 
  POSITION_MAPPING, 
  getFlockColor, 
  ALL_POSITION_KEYS,
  type OccupancyInfo 
} from '@/utils/setterPositionMapping';

interface TempGridValues {
  temp_front_top_left: string;
  temp_front_top_right: string;
  temp_front_mid_left: string;
  temp_front_mid_right: string;
  temp_front_bottom_left: string;
  temp_front_bottom_right: string;
  temp_middle_top_left: string;
  temp_middle_top_right: string;
  temp_middle_mid_left: string;
  temp_middle_mid_right: string;
  temp_middle_bottom_left: string;
  temp_middle_bottom_right: string;
  temp_back_top_left: string;
  temp_back_top_right: string;
  temp_back_mid_left: string;
  temp_back_mid_right: string;
  temp_back_bottom_left: string;
  temp_back_bottom_right: string;
}

interface Averages {
  overall: number | null;
  front: number | null;
  middle: number | null;
  back: number | null;
}

interface MultiSetterQAEntryProps {
  machine: { id: string; machine_number: string };
  technicianName: string;
  notes: string;
  onSubmit: (data: {
    temperatures: Record<string, number>;
    averages: Averages;
    checkDate: string;
    positionOccupancy: Map<string, OccupancyInfo>;
  }) => void;
}

const initialValues: TempGridValues = {
  temp_front_top_left: '',
  temp_front_top_right: '',
  temp_front_mid_left: '',
  temp_front_mid_right: '',
  temp_front_bottom_left: '',
  temp_front_bottom_right: '',
  temp_middle_top_left: '',
  temp_middle_top_right: '',
  temp_middle_mid_left: '',
  temp_middle_mid_right: '',
  temp_middle_bottom_left: '',
  temp_middle_bottom_right: '',
  temp_back_top_left: '',
  temp_back_top_right: '',
  temp_back_mid_left: '',
  temp_back_mid_right: '',
  temp_back_bottom_left: '',
  temp_back_bottom_right: '',
};

const MultiSetterQAEntry: React.FC<MultiSetterQAEntryProps> = ({
  machine,
  technicianName,
  notes,
  onSubmit
}) => {
  const [values, setValues] = useState<TempGridValues>(initialValues);
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [averages, setAverages] = useState<Averages>({ overall: null, front: null, middle: null, back: null });

  // Get position occupancy for the selected machine and date
  const { 
    occupancyMap, 
    isLoading, 
    unoccupiedPositions, 
    uniqueFlocks,
    occupiedCount,
    unoccupiedCount
  } = usePositionOccupancy(machine.id, checkDate);

  // Calculate averages whenever values change
  useEffect(() => {
    const parseVal = (v: string): number | null => {
      const num = parseFloat(v);
      return isNaN(num) ? null : num;
    };

    const frontVals = [
      values.temp_front_top_left, values.temp_front_top_right,
      values.temp_front_mid_left, values.temp_front_mid_right,
      values.temp_front_bottom_left, values.temp_front_bottom_right
    ].map(parseVal).filter((v): v is number => v !== null);

    const middleVals = [
      values.temp_middle_top_left, values.temp_middle_top_right,
      values.temp_middle_mid_left, values.temp_middle_mid_right,
      values.temp_middle_bottom_left, values.temp_middle_bottom_right
    ].map(parseVal).filter((v): v is number => v !== null);

    const backVals = [
      values.temp_back_top_left, values.temp_back_top_right,
      values.temp_back_mid_left, values.temp_back_mid_right,
      values.temp_back_bottom_left, values.temp_back_bottom_right
    ].map(parseVal).filter((v): v is number => v !== null);

    const calcAvg = (arr: number[]): number | null => {
      if (arr.length === 0) return null;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    };

    setAverages({
      overall: calcAvg([...frontVals, ...middleVals, ...backVals]),
      front: calcAvg(frontVals),
      middle: calcAvg(middleVals),
      back: calcAvg(backVals)
    });
  }, [values]);

  const handleInputChange = (field: keyof TempGridValues, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const getTempColor = (temp: string | null): string => {
    if (!temp) return '';
    const num = parseFloat(temp);
    if (isNaN(num)) return '';
    if (num >= 99.5 && num <= 100.5) return 'border-green-500 bg-green-50 text-green-700';
    if ((num >= 99.0 && num < 99.5) || (num > 100.5 && num <= 101.0)) return 'border-yellow-500 bg-yellow-50 text-yellow-700';
    return 'border-red-500 bg-red-50 text-red-700';
  };

  const getAvgBadgeColor = (avg: number | null): string => {
    if (avg === null) return 'bg-muted text-muted-foreground';
    if (avg >= 99.5 && avg <= 100.5) return 'bg-green-100 text-green-800 border-green-300';
    if ((avg >= 99.0 && avg < 99.5) || (avg > 100.5 && avg <= 101.0)) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const handleSubmit = () => {
    // Validate all 18 fields
    const hasEmpty = Object.values(values).some(v => v === '');
    if (hasEmpty) return;

    const numericValues: Record<string, number> = {};
    for (const [key, val] of Object.entries(values)) {
      numericValues[key] = parseFloat(val);
    }

    onSubmit({
      temperatures: numericValues,
      averages,
      checkDate,
      positionOccupancy: occupancyMap
    });

    // Reset form
    setValues(initialValues);
  };

  const getOccupancyLabel = (positionKey: string): { text: string; color: string } | null => {
    const occupancy = occupancyMap.get(positionKey);
    if (!occupancy) {
      return { text: 'No set mapped', color: 'text-orange-600' };
    }
    const flockColor = getFlockColor(occupancy.flock_id, uniqueFlocks);
    return { 
      text: `${occupancy.flock_name} (${occupancy.flock_number})`, 
      color: flockColor.split(' ')[0].replace('bg-', 'text-').replace('-100', '-700')
    };
  };

  const levels = ['Top', 'Mid', 'Bottom'] as const;

  const getFieldName = (zone: string, level: string, side: string): keyof TempGridValues => {
    const zoneKey = zone.includes('Front') ? 'front' : zone.includes('Middle') ? 'middle' : 'back';
    const levelKey = level.toLowerCase();
    const sideKey = side.toLowerCase();
    return `temp_${zoneKey}_${levelKey}_${sideKey}` as keyof TempGridValues;
  };

  const getPositionKey = (zone: string, level: string, side: string): string => {
    const zoneKey = zone.includes('Front') ? 'front' : zone.includes('Middle') ? 'middle' : 'back';
    const levelKey = level.toLowerCase();
    const sideKey = side.toLowerCase();
    return `${zoneKey}_${levelKey}_${sideKey}`;
  };

  const renderTempInput = (field: keyof TempGridValues, positionKey: string) => {
    const occupancy = occupancyMap.get(positionKey);
    const occupancyLabel = getOccupancyLabel(positionKey);
    const bgColor = occupancy ? getFlockColor(occupancy.flock_id, uniqueFlocks).split(' ')[0] : '';

    return (
      <div className="flex flex-col items-center gap-1">
        <Input
          type="number"
          step="0.1"
          value={values[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder="100.0"
          className={`text-center h-9 w-16 ${getTempColor(values[field])} ${bgColor}`}
        />
        {occupancyLabel && (
          <span className={`text-[10px] font-medium ${occupancyLabel.color} truncate max-w-[70px]`}>
            {occupancyLabel.text}
          </span>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Multi-Setter 18-Point Temperature Grid
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10">
            Machine: {machine.machine_number}
          </Badge>
          <p className="text-sm text-muted-foreground">Ideal range: 99.5–100.5°F</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Banner for Unoccupied Positions */}
        {unoccupiedCount > 0 && (
          <Alert variant="destructive" className="bg-orange-50 border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {unoccupiedCount} of 18 positions have no mapped flock/house for this date. 
              QA data for these positions will be saved without flock linkage.
            </AlertDescription>
          </Alert>
        )}

        {/* Check Date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Check Date</Label>
            <Input
              type="date"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Position Occupancy</Label>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {occupiedCount} occupied
              </Badge>
              {unoccupiedCount > 0 && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  {unoccupiedCount} empty
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Flock Legend */}
        {uniqueFlocks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground">Flocks:</span>
            {uniqueFlocks.map(flockId => {
              const occupancy = Array.from(occupancyMap.values()).find(o => o.flock_id === flockId);
              if (!occupancy) return null;
              return (
                <Badge 
                  key={flockId} 
                  variant="outline" 
                  className={getFlockColor(flockId, uniqueFlocks)}
                >
                  {occupancy.flock_name} ({occupancy.flock_number})
                </Badge>
              );
            })}
          </div>
        )}

        {/* 18-Point Grid with Flock Labels */}
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
                  <td className="p-2 font-medium bg-muted/30">{level}</td>
                  {/* Front Zone */}
                  <td className="p-2 text-center bg-blue-50/30 border-l">
                    {renderTempInput(getFieldName('Front', level, 'Left'), getPositionKey('Front', level, 'Left'))}
                  </td>
                  <td className="p-2 text-center bg-blue-50/30">
                    {renderTempInput(getFieldName('Front', level, 'Right'), getPositionKey('Front', level, 'Right'))}
                  </td>
                  {/* Middle Zone */}
                  <td className="p-2 text-center bg-green-50/30 border-l">
                    {renderTempInput(getFieldName('Middle', level, 'Left'), getPositionKey('Middle', level, 'Left'))}
                  </td>
                  <td className="p-2 text-center bg-green-50/30">
                    {renderTempInput(getFieldName('Middle', level, 'Right'), getPositionKey('Middle', level, 'Right'))}
                  </td>
                  {/* Back Zone */}
                  <td className="p-2 text-center bg-purple-50/30 border-l">
                    {renderTempInput(getFieldName('Back', level, 'Left'), getPositionKey('Back', level, 'Left'))}
                  </td>
                  <td className="p-2 text-center bg-purple-50/30">
                    {renderTempInput(getFieldName('Back', level, 'Right'), getPositionKey('Back', level, 'Right'))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Zone Averages */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <span className="font-medium text-sm">Averages:</span>
          <Badge variant="outline" className={getAvgBadgeColor(averages.front)}>
            Front: {averages.front?.toFixed(1) || '-'}°F
          </Badge>
          <Badge variant="outline" className={getAvgBadgeColor(averages.middle)}>
            Middle: {averages.middle?.toFixed(1) || '-'}°F
          </Badge>
          <Badge variant="outline" className={getAvgBadgeColor(averages.back)}>
            Back: {averages.back?.toFixed(1) || '-'}°F
          </Badge>
          <Badge variant="default" className={getAvgBadgeColor(averages.overall)}>
            Overall: {averages.overall?.toFixed(1) || '-'}°F
          </Badge>
        </div>

        {/* Legend */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            <span>Optimal: 99.5–100.5°F</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-yellow-500"></span>
            <span>Acceptable: 99.0–99.5°F or 100.5–101.0°F</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-500"></span>
            <span>Outside Range: Below 99.0°F or Above 101.0°F</span>
          </div>
        </div>

        <Button onClick={handleSubmit} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Save Machine-Level QA Reading
        </Button>
      </CardContent>
    </Card>
  );
};

export default MultiSetterQAEntry;
