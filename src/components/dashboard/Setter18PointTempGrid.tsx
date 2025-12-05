import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Plus } from "lucide-react";

interface TempGridValues {
  // Front Zone (A)
  temp_front_top_left: string;
  temp_front_top_right: string;
  temp_front_mid_left: string;
  temp_front_mid_right: string;
  temp_front_bottom_left: string;
  temp_front_bottom_right: string;
  // Middle Zone (B)
  temp_middle_top_left: string;
  temp_middle_top_right: string;
  temp_middle_mid_left: string;
  temp_middle_mid_right: string;
  temp_middle_bottom_left: string;
  temp_middle_bottom_right: string;
  // Back Zone (C)
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

interface Setter18PointTempGridProps {
  onSubmit: (data: {
    values: Record<string, number>;
    averages: Averages;
  }) => void;
  checkDate: string;
  onCheckDateChange: (date: string) => void;
  setterNumber: string;
  onSetterNumberChange: (num: string) => void;
  setterMachines: Array<{ id: string; machine_number: string; location: string; status: string }>;
  currentMachine?: { machine_number: string } | null;
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

const Setter18PointTempGrid: React.FC<Setter18PointTempGridProps> = ({
  onSubmit,
  checkDate,
  onCheckDateChange,
  setterNumber,
  onSetterNumberChange,
  setterMachines,
  currentMachine
}) => {
  const [values, setValues] = useState<TempGridValues>(initialValues);
  const [averages, setAverages] = useState<Averages>({ overall: null, front: null, middle: null, back: null });

  // Calculate averages whenever values change
  useEffect(() => {
    const parseVal = (v: string): number | null => {
      const num = parseFloat(v);
      return isNaN(num) ? null : num;
    };

    // Front zone
    const frontVals = [
      values.temp_front_top_left, values.temp_front_top_right,
      values.temp_front_mid_left, values.temp_front_mid_right,
      values.temp_front_bottom_left, values.temp_front_bottom_right
    ].map(parseVal).filter((v): v is number => v !== null);

    // Middle zone
    const middleVals = [
      values.temp_middle_top_left, values.temp_middle_top_right,
      values.temp_middle_mid_left, values.temp_middle_mid_right,
      values.temp_middle_bottom_left, values.temp_middle_bottom_right
    ].map(parseVal).filter((v): v is number => v !== null);

    // Back zone
    const backVals = [
      values.temp_back_top_left, values.temp_back_top_right,
      values.temp_back_mid_left, values.temp_back_mid_right,
      values.temp_back_bottom_left, values.temp_back_bottom_right
    ].map(parseVal).filter((v): v is number => v !== null);

    const calcAvg = (arr: number[]): number | null => {
      if (arr.length === 0) return null;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    };

    const frontAvg = calcAvg(frontVals);
    const middleAvg = calcAvg(middleVals);
    const backAvg = calcAvg(backVals);
    
    const allVals = [...frontVals, ...middleVals, ...backVals];
    const overallAvg = calcAvg(allVals);

    setAverages({
      overall: overallAvg,
      front: frontAvg,
      middle: middleAvg,
      back: backAvg
    });
  }, [values]);

  const handleInputChange = (field: keyof TempGridValues, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const getTempColor = (temp: number | string | null): string => {
    if (temp === null || temp === '') return '';
    const num = typeof temp === 'string' ? parseFloat(temp) : temp;
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
    const allFields = Object.values(values);
    const hasEmpty = allFields.some(v => v === '');
    
    if (hasEmpty) {
      return; // Let the parent handle the toast
    }

    const numericValues: Record<string, number> = {};
    for (const [key, val] of Object.entries(values)) {
      numericValues[key] = parseFloat(val);
    }

    onSubmit({
      values: numericValues,
      averages
    });

    // Reset form
    setValues(initialValues);
  };

  const renderTempInput = (field: keyof TempGridValues, placeholder: string) => (
    <Input
      type="number"
      step="0.1"
      value={values[field]}
      onChange={(e) => handleInputChange(field, e.target.value)}
      placeholder={placeholder}
      className={`text-center h-11 w-20 text-base font-medium ${getTempColor(values[field])}`}
    />
  );

  const zones = ['Front (A)', 'Middle (B)', 'Back (C)'] as const;
  const levels = ['Top', 'Mid', 'Bottom'] as const;
  const sides = ['Left', 'Right'] as const;

  const getFieldName = (zone: string, level: string, side: string): keyof TempGridValues => {
    const zoneKey = zone.includes('Front') ? 'front' : zone.includes('Middle') ? 'middle' : 'back';
    const levelKey = level.toLowerCase();
    const sideKey = side.toLowerCase();
    return `temp_${zoneKey}_${levelKey}_${sideKey}` as keyof TempGridValues;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Thermometer className="h-5 w-5" />
          18-Point Setter Temperature Grid
        </CardTitle>
        <p className="text-sm text-muted-foreground">Ideal range: 99.5–100.5°F</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header Controls */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Setter Machine</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={setterNumber}
              onChange={(e) => onSetterNumberChange(e.target.value)}
            >
              <option value="">Select setter machine</option>
              {setterMachines.map((machine) => (
                <option key={machine.id} value={machine.machine_number}>
                  {machine.machine_number} - {machine.location} ({machine.status})
                </option>
              ))}
            </select>
            {currentMachine && (
              <p className="text-xs text-muted-foreground">
                Current batch machine: {currentMachine.machine_number}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Check Date</Label>
            <Input
              type="date"
              value={checkDate}
              onChange={(e) => onCheckDateChange(e.target.value)}
            />
          </div>
        </div>

        {/* 18-Point Grid */}
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
                    {renderTempInput(getFieldName('Front', level, 'Left'), '100.0')}
                  </td>
                  <td className="p-2 text-center bg-blue-50/30">
                    {renderTempInput(getFieldName('Front', level, 'Right'), '100.0')}
                  </td>
                  {/* Middle Zone */}
                  <td className="p-2 text-center bg-green-50/30 border-l">
                    {renderTempInput(getFieldName('Middle', level, 'Left'), '100.0')}
                  </td>
                  <td className="p-2 text-center bg-green-50/30">
                    {renderTempInput(getFieldName('Middle', level, 'Right'), '100.0')}
                  </td>
                  {/* Back Zone */}
                  <td className="p-2 text-center bg-purple-50/30 border-l">
                    {renderTempInput(getFieldName('Back', level, 'Left'), '100.0')}
                  </td>
                  <td className="p-2 text-center bg-purple-50/30">
                    {renderTempInput(getFieldName('Back', level, 'Right'), '100.0')}
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
          Add 18-Point Temperature Reading
        </Button>
      </CardContent>
    </Card>
  );
};

export default Setter18PointTempGrid;
