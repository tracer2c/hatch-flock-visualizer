import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Ruler, Plus, AlertTriangle, Info } from "lucide-react";

interface FlockDetail {
  flock_id: string;
  batch_id: string | null;
  flock_name: string;
  flock_number: number;
}

interface MachineWideAnglesEntryProps {
  machine: { id: string; machine_number: string };
  technicianName: string;
  notes: string;
  checkDate: string;
  uniqueFlocks: FlockDetail[];
  onSubmit: (data: {
    angles: {
      angle_top_left: number;
      angle_mid_left: number;
      angle_bottom_left: number;
      angle_top_right: number;
      angle_mid_right: number;
      angle_bottom_right: number;
    };
    checkDate: string;
    uniqueFlocks: FlockDetail[];
  }) => void;
}

const MachineWideAnglesEntry: React.FC<MachineWideAnglesEntryProps> = ({
  machine,
  technicianName,
  notes,
  checkDate,
  uniqueFlocks,
  onSubmit
}) => {
  const [angles, setAngles] = useState({
    angle_top_left: '',
    angle_mid_left: '',
    angle_bottom_left: '',
    angle_top_right: '',
    angle_mid_right: '',
    angle_bottom_right: '',
  });

  const handleInputChange = (field: keyof typeof angles, value: string) => {
    setAngles(prev => ({ ...prev, [field]: value }));
  };

  const getAngleColor = (angle: string): string => {
    if (!angle) return '';
    const num = parseFloat(angle);
    if (isNaN(num)) return '';
    // Ideal angle is typically 45 degrees ± 5
    if (num >= 40 && num <= 50) return 'border-green-500 bg-green-50 text-green-700';
    if ((num >= 35 && num < 40) || (num > 50 && num <= 55)) return 'border-yellow-500 bg-yellow-50 text-yellow-700';
    return 'border-red-500 bg-red-50 text-red-700';
  };

  const handleSubmit = () => {
    const hasEmpty = Object.values(angles).some(v => v === '');
    if (hasEmpty) return;

    const numericAngles = {
      angle_top_left: parseFloat(angles.angle_top_left),
      angle_mid_left: parseFloat(angles.angle_mid_left),
      angle_bottom_left: parseFloat(angles.angle_bottom_left),
      angle_top_right: parseFloat(angles.angle_top_right),
      angle_mid_right: parseFloat(angles.angle_mid_right),
      angle_bottom_right: parseFloat(angles.angle_bottom_right),
    };

    onSubmit({
      angles: numericAngles,
      checkDate,
      uniqueFlocks
    });

    // Reset form
    setAngles({
      angle_top_left: '',
      angle_mid_left: '',
      angle_bottom_left: '',
      angle_top_right: '',
      angle_mid_right: '',
      angle_bottom_right: '',
    });
  };

  const levels = ['Top', 'Mid', 'Bottom'] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          Setter Angles (Machine-Wide)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10">
            Machine: {machine.machine_number}
          </Badge>
          <p className="text-sm text-muted-foreground">Ideal range: 40–50°</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Angles are measured at the machine level and will be linked to all {uniqueFlocks.length} flock(s) currently in this machine.
          </AlertDescription>
        </Alert>

        {/* Linked Flocks */}
        {uniqueFlocks.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground">Will link to:</span>
            {uniqueFlocks.map(flock => (
              <Badge key={flock.flock_id} variant="outline" className="bg-purple-50 text-purple-700">
                {flock.flock_name} ({flock.flock_number})
              </Badge>
            ))}
          </div>
        ) : (
          <Alert variant="default" className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              No flocks are currently mapped to this machine. Angles will be saved without flock linkage.
            </AlertDescription>
          </Alert>
        )}

        {/* 6-Point Angle Grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="p-2 text-left font-semibold bg-muted/50">Level</th>
                <th className="p-2 text-center font-semibold bg-blue-50 border-l">Left Side</th>
                <th className="p-2 text-center font-semibold bg-green-50 border-l">Right Side</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((level) => (
                <tr key={level} className="border-b hover:bg-muted/20">
                  <td className="p-2 font-medium bg-muted/30">{level}</td>
                  <td className="p-3 text-center bg-blue-50/30 border-l">
                    <Input
                      type="number"
                      step="0.5"
                      value={angles[`angle_${level.toLowerCase()}_left` as keyof typeof angles]}
                      onChange={(e) => handleInputChange(`angle_${level.toLowerCase()}_left` as keyof typeof angles, e.target.value)}
                      placeholder="45.0"
                      className={`text-center h-10 w-20 mx-auto ${getAngleColor(angles[`angle_${level.toLowerCase()}_left` as keyof typeof angles])}`}
                    />
                  </td>
                  <td className="p-3 text-center bg-green-50/30 border-l">
                    <Input
                      type="number"
                      step="0.5"
                      value={angles[`angle_${level.toLowerCase()}_right` as keyof typeof angles]}
                      onChange={(e) => handleInputChange(`angle_${level.toLowerCase()}_right` as keyof typeof angles, e.target.value)}
                      placeholder="45.0"
                      className={`text-center h-10 w-20 mx-auto ${getAngleColor(angles[`angle_${level.toLowerCase()}_right` as keyof typeof angles])}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            <span>Optimal: 40–50°</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-yellow-500"></span>
            <span>Acceptable: 35–40° or 50–55°</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-500"></span>
            <span>Outside Range: Below 35° or Above 55°</span>
          </div>
        </div>

        <Button onClick={handleSubmit} className="w-full" disabled={!technicianName.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Save Machine-Wide Angles
        </Button>
      </CardContent>
    </Card>
  );
};

export default MachineWideAnglesEntry;
