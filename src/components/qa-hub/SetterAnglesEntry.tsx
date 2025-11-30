import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";

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
  onSubmit 
}) => {
  const [setterNumber, setSetterNumber] = useState(defaultSetterNumber || '');
  const [topLeft, setTopLeft] = useState('');
  const [midLeft, setMidLeft] = useState('');
  const [bottomLeft, setBottomLeft] = useState('');
  const [topRight, setTopRight] = useState('');
  const [midRight, setMidRight] = useState('');
  const [bottomRight, setBottomRight] = useState('');

  const leftAvg = (
    (parseFloat(topLeft) || 0) + 
    (parseFloat(midLeft) || 0) + 
    (parseFloat(bottomLeft) || 0)
  ) / 3;

  const rightAvg = (
    (parseFloat(topRight) || 0) + 
    (parseFloat(midRight) || 0) + 
    (parseFloat(bottomRight) || 0)
  ) / 3;

  const isBalanced = Math.abs(leftAvg - rightAvg) <= BALANCE_TOLERANCE && 
    leftAvg >= OPTIMAL_MIN && leftAvg <= OPTIMAL_MAX && 
    rightAvg >= OPTIMAL_MIN && rightAvg <= OPTIMAL_MAX;

  const allFilled = topLeft && midLeft && bottomLeft && topRight && midRight && bottomRight;

  const handleSubmit = () => {
    if (!technicianName.trim()) return;
    if (!setterNumber || !allFilled) return;

    onSubmit({
      setterNumber,
      angles: {
        topLeft: parseFloat(topLeft),
        midLeft: parseFloat(midLeft),
        bottomLeft: parseFloat(bottomLeft),
        topRight: parseFloat(topRight),
        midRight: parseFloat(midRight),
        bottomRight: parseFloat(bottomRight)
      },
      checkDate
    });

    setTopLeft('');
    setMidLeft('');
    setBottomLeft('');
    setTopRight('');
    setMidRight('');
    setBottomRight('');
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

        {/* Angle Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Left Side Header */}
          <div className="col-span-1 text-center font-medium text-sm bg-muted/50 py-2 rounded">
            Left Side
          </div>
          <div className="col-span-1 text-center font-medium text-sm bg-muted/50 py-2 rounded">
            Position
          </div>
          <div className="col-span-1 text-center font-medium text-sm bg-muted/50 py-2 rounded">
            Right Side
          </div>

          {/* Top Row */}
          <Input
            type="number"
            step="0.1"
            value={topLeft}
            onChange={(e) => setTopLeft(e.target.value)}
            placeholder="Top L"
            className={getAngleColor(topLeft)}
          />
          <div className="flex items-center justify-center text-sm text-muted-foreground">Top</div>
          <Input
            type="number"
            step="0.1"
            value={topRight}
            onChange={(e) => setTopRight(e.target.value)}
            placeholder="Top R"
            className={getAngleColor(topRight)}
          />

          {/* Middle Row */}
          <Input
            type="number"
            step="0.1"
            value={midLeft}
            onChange={(e) => setMidLeft(e.target.value)}
            placeholder="Mid L"
            className={getAngleColor(midLeft)}
          />
          <div className="flex items-center justify-center text-sm text-muted-foreground">Middle</div>
          <Input
            type="number"
            step="0.1"
            value={midRight}
            onChange={(e) => setMidRight(e.target.value)}
            placeholder="Mid R"
            className={getAngleColor(midRight)}
          />

          {/* Bottom Row */}
          <Input
            type="number"
            step="0.1"
            value={bottomLeft}
            onChange={(e) => setBottomLeft(e.target.value)}
            placeholder="Bot L"
            className={getAngleColor(bottomLeft)}
          />
          <div className="flex items-center justify-center text-sm text-muted-foreground">Bottom</div>
          <Input
            type="number"
            step="0.1"
            value={bottomRight}
            onChange={(e) => setBottomRight(e.target.value)}
            placeholder="Bot R"
            className={getAngleColor(bottomRight)}
          />

          {/* Averages Row */}
          <div className="bg-amber-50 p-2 rounded text-center">
            <span className="text-xs text-muted-foreground">Avg:</span>
            <span className="ml-1 font-medium">{leftAvg.toFixed(1)}°</span>
          </div>
          <div className="flex items-center justify-center">
            <Button 
              onClick={handleSubmit}
              disabled={!technicianName.trim() || !setterNumber || !allFilled}
              size="sm"
            >
              Add Record
            </Button>
          </div>
          <div className="bg-amber-50 p-2 rounded text-center">
            <span className="text-xs text-muted-foreground">Avg:</span>
            <span className="ml-1 font-medium">{rightAvg.toFixed(1)}°</span>
          </div>
        </div>

        {/* Balance Status */}
        {allFilled && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {isBalanced ? (
              <Badge className="bg-green-100 text-green-700 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Balanced - Both sides in range
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 gap-1">
                <AlertTriangle className="h-3 w-3" />
                Adjustment needed - Check angles
              </Badge>
            )}
          </div>
        )}

        {/* Legend */}
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
