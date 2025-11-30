import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Droplets, Plus, AlertTriangle, Info, Thermometer } from "lucide-react";

interface FlockDetail {
  flock_id: string;
  batch_id: string | null;
  flock_name: string;
  flock_number: number;
}

interface MachineWideHumidityEntryProps {
  machine: { id: string; machine_number: string };
  technicianName: string;
  notes: string;
  checkDate: string;
  uniqueFlocks: FlockDetail[];
  onSubmit: (data: {
    humidity: number;
    temperature: number;
    checkDate: string;
    uniqueFlocks: FlockDetail[];
  }) => void;
}

const MachineWideHumidityEntry: React.FC<MachineWideHumidityEntryProps> = ({
  machine,
  technicianName,
  notes,
  checkDate,
  uniqueFlocks,
  onSubmit
}) => {
  const [humidity, setHumidity] = useState('');
  const [temperature, setTemperature] = useState('');

  const getHumidityColor = (value: string): string => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    // Ideal humidity is typically 53-58%
    if (num >= 53 && num <= 58) return 'border-green-500 bg-green-50 text-green-700';
    if ((num >= 50 && num < 53) || (num > 58 && num <= 62)) return 'border-yellow-500 bg-yellow-50 text-yellow-700';
    return 'border-red-500 bg-red-50 text-red-700';
  };

  const getTempColor = (value: string): string => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    if (num >= 99.5 && num <= 100.5) return 'border-green-500 bg-green-50 text-green-700';
    if ((num >= 99.0 && num < 99.5) || (num > 100.5 && num <= 101.0)) return 'border-yellow-500 bg-yellow-50 text-yellow-700';
    return 'border-red-500 bg-red-50 text-red-700';
  };

  const handleSubmit = () => {
    if (!humidity || !temperature) return;

    onSubmit({
      humidity: parseFloat(humidity),
      temperature: parseFloat(temperature),
      checkDate,
      uniqueFlocks
    });

    // Reset form
    setHumidity('');
    setTemperature('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Humidity & Temperature (Machine-Wide)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10">
            Machine: {machine.machine_number}
          </Badge>
          <p className="text-sm text-muted-foreground">Ideal humidity: 53–58%</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Humidity and temperature readings are measured at the machine level and will be linked to all {uniqueFlocks.length} flock(s) currently in this machine.
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
              No flocks are currently mapped to this machine. Readings will be saved without flock linkage.
            </AlertDescription>
          </Alert>
        )}

        {/* Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-600" />
              Humidity (%)
            </Label>
            <Input
              type="number"
              step="0.1"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
              placeholder="55.0"
              className={`text-center h-12 text-lg ${getHumidityColor(humidity)}`}
            />
            <p className="text-xs text-muted-foreground">Ideal range: 53–58%</p>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-red-600" />
              Temperature (°F)
            </Label>
            <Input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="100.0"
              className={`text-center h-12 text-lg ${getTempColor(temperature)}`}
            />
            <p className="text-xs text-muted-foreground">Ideal range: 99.5–100.5°F</p>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium">Humidity Ranges:</p>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-500"></span>
              <span>Optimal: 53–58%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-yellow-500"></span>
              <span>Acceptable: 50–53% or 58–62%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-500"></span>
              <span>Outside Range</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-medium">Temperature Ranges:</p>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-green-500"></span>
              <span>Optimal: 99.5–100.5°F</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-yellow-500"></span>
              <span>Acceptable: 99–99.5°F or 100.5–101°F</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-500"></span>
              <span>Outside Range</span>
            </div>
          </div>
        </div>

        <Button onClick={handleSubmit} className="w-full" disabled={!technicianName.trim() || !humidity || !temperature}>
          <Plus className="h-4 w-4 mr-2" />
          Save Machine-Wide Humidity & Temperature
        </Button>
      </CardContent>
    </Card>
  );
};

export default MachineWideHumidityEntry;
