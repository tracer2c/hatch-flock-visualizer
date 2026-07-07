import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Ruler, Plus, AlertTriangle, Info } from "lucide-react";
import { toast } from 'sonner';
import TodaysEntriesList from './TodaysEntriesList';

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
  isPastDay?: boolean;
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
  isPastDay = false,
  onSubmit
}) => {
  const [leftSide, setLeftSide] = useState('');
  const [rightSide, setRightSide] = useState('');

  const getAngleColor = (angle: string): string => {
    if (!angle) return '';
    const num = parseFloat(angle);
    if (isNaN(num)) return '';
    if (num >= 40 && num <= 50) return 'border-green-500 bg-green-50 text-green-700';
    if ((num >= 35 && num < 40) || (num > 50 && num <= 55)) return 'border-yellow-500 bg-yellow-50 text-yellow-700';
    return 'border-red-500 bg-red-50 text-red-700';
  };

  const handleSubmit = () => {
    if (isPastDay) return;
    const left = parseFloat(leftSide);
    const right = parseFloat(rightSide);
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      toast.error('Enter both Left Side and Right Side angle values.');
      return;
    }

    // Mirror the single left/right values across top/mid/bottom slots
    // so the DB payload shape stays compatible with historical records and aggregations.
    const numericAngles = {
      angle_top_left: left,
      angle_mid_left: left,
      angle_bottom_left: left,
      angle_top_right: right,
      angle_mid_right: right,
      angle_bottom_right: right,
    };

    onSubmit({
      angles: numericAngles,
      checkDate,
      uniqueFlocks
    });

    setLeftSide('');
    setRightSide('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          Setter Angles (Machine-Wide)
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-primary/10">
            Machine: {machine.machine_number}
          </Badge>
          <p className="text-sm text-muted-foreground">Ideal range: 40–50°</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Record one Left and one Right angle per check. Historical Top/Mid/Bottom entries remain
            visible in previous records for reference.
          </AlertDescription>
        </Alert>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 p-3 rounded-lg bg-blue-50/40 border border-blue-100">
            <Label className="font-semibold">Left Side (°)</Label>
            <Input
              type="number"
              step="0.5"
              value={leftSide}
              onChange={(e) => setLeftSide(e.target.value)}
              placeholder="45.0"
              className={`text-center h-12 text-lg font-medium ${getAngleColor(leftSide)}`}
            />
          </div>
          <div className="space-y-2 p-3 rounded-lg bg-green-50/40 border border-green-100">
            <Label className="font-semibold">Right Side (°)</Label>
            <Input
              type="number"
              step="0.5"
              value={rightSide}
              onChange={(e) => setRightSide(e.target.value)}
              placeholder="45.0"
              className={`text-center h-12 text-lg font-medium ${getAngleColor(rightSide)}`}
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500"></span><span>Optimal: 40–50°</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-500"></span><span>Acceptable: 35–40° or 50–55°</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500"></span><span>Outside Range: Below 35° or Above 55°</span></div>
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
