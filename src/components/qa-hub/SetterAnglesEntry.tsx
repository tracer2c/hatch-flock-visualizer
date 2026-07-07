import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from 'sonner';

interface SetterAnglesEntryProps {
  technicianName: string;
  checkDate: string;
  setterNumber?: string;
  onSubmit: (data: {
    setterNumber: string;
    angles: {
      topLeft: number;
      midLeft: number;
      bottomLeft: number;
      topRight: number;
      midRight: number;
      bottomRight: number;
    };
    checkDate: string;
  }) => void;
}

const OPTIMAL_MIN = 35;
const OPTIMAL_MAX = 45;
const BALANCE_TOLERANCE = 5;

const SetterAnglesEntry: React.FC<SetterAnglesEntryProps> = ({
  technicianName,
  checkDate,
  setterNumber: defaultSetterNumber,
  onSubmit,
}) => {
  const [setterNumber, setSetterNumber] = useState(defaultSetterNumber || '');
  const [leftSide, setLeftSide] = useState('');
  const [rightSide, setRightSide] = useState('');

  const leftNum = parseFloat(leftSide);
  const rightNum = parseFloat(rightSide);
  const bothFilled = leftSide !== '' && rightSide !== '' && Number.isFinite(leftNum) && Number.isFinite(rightNum);

  const isBalanced = bothFilled
    && Math.abs(leftNum - rightNum) <= BALANCE_TOLERANCE
    && leftNum >= OPTIMAL_MIN && leftNum <= OPTIMAL_MAX
    && rightNum >= OPTIMAL_MIN && rightNum <= OPTIMAL_MAX;

  const handleSubmit = () => {
    if (!technicianName.trim()) return;
    if (!setterNumber) {
      toast.error('Enter a setter number.');
      return;
    }
    if (!bothFilled) {
      toast.error('Enter both Left and Right angle values.');
      return;
    }

    // Mirror Left/Right values across top/mid/bottom so downstream storage/aggregations
    // remain compatible with historical records.
    onSubmit({
      setterNumber,
      angles: {
        topLeft: leftNum,
        midLeft: leftNum,
        bottomLeft: leftNum,
        topRight: rightNum,
        midRight: rightNum,
        bottomRight: rightNum,
      },
      checkDate,
    });

    setLeftSide('');
    setRightSide('');
  };

  const getAngleColor = (value: string) => {
    const angle = parseFloat(value);
    if (!value || isNaN(angle)) return '';
    if (angle >= OPTIMAL_MIN && angle <= OPTIMAL_MAX) return 'border-green-500 bg-green-50';
    return 'border-amber-500 bg-amber-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-purple-500" />
          Setter Angles
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Optimal range: {OPTIMAL_MIN}-{OPTIMAL_MAX}° | Balance tolerance: ±{BALANCE_TOLERANCE}°
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-xs">
            Record one Left and one Right angle per check. Older Top/Mid/Bottom entries remain
            visible in history for reference.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Setter Number</Label>
            <Input
              value={setterNumber}
              onChange={(e) => setSetterNumber(e.target.value)}
              placeholder="e.g., S-001"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 p-3 rounded-lg bg-blue-50/40 border border-blue-100">
            <Label className="font-semibold">Left Side (°)</Label>
            <Input
              type="number"
              step="0.1"
              value={leftSide}
              onChange={(e) => setLeftSide(e.target.value)}
              placeholder="e.g., 40.0"
              className={`text-center h-12 text-lg font-medium ${getAngleColor(leftSide)}`}
            />
          </div>
          <div className="space-y-2 p-3 rounded-lg bg-green-50/40 border border-green-100">
            <Label className="font-semibold">Right Side (°)</Label>
            <Input
              type="number"
              step="0.1"
              value={rightSide}
              onChange={(e) => setRightSide(e.target.value)}
              placeholder="e.g., 40.0"
              className={`text-center h-12 text-lg font-medium ${getAngleColor(rightSide)}`}
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!technicianName.trim() || !setterNumber || !bothFilled}
          className="w-full"
        >
          Add Record
        </Button>

        {bothFilled && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {isBalanced ? (
              <Badge className="bg-green-100 text-green-700 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Balanced — Both sides in range
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 gap-1">
                <AlertTriangle className="h-3 w-3" />
                Adjustment needed — Check angles
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" /> {OPTIMAL_MIN}-{OPTIMAL_MAX}° (Optimal)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded" /> Outside range
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SetterAnglesEntry;
