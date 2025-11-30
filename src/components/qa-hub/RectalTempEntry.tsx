import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer } from "lucide-react";

interface RectalTempEntryProps {
  technicianName: string;
  checkDate: string;
  onSubmit: (data: {
    location: string;
    temperature: number;
    checkTime: string;
    checkDate: string;
  }) => void;
}

const locationOptions = [
  { value: 'hatcher', label: 'Hatcher (104-106°F)', min: 104, max: 106 },
  { value: 'chick_room', label: 'Chick Room (103-105°F)', min: 103, max: 105 },
  { value: 'separator_room', label: 'Separator Room (104-106°F)', min: 104, max: 106 },
];

const RectalTempEntry: React.FC<RectalTempEntryProps> = ({ technicianName, checkDate, onSubmit }) => {
  const [location, setLocation] = useState('hatcher');
  const [temperature, setTemperature] = useState('');
  const [checkTime, setCheckTime] = useState(new Date().toTimeString().slice(0, 5));

  const selectedLocation = locationOptions.find(l => l.value === location);
  const temp = parseFloat(temperature);
  const isWithinRange = selectedLocation && temp >= selectedLocation.min && temp <= selectedLocation.max;

  const handleSubmit = () => {
    if (!technicianName.trim()) return;
    if (!temperature || isNaN(temp)) return;

    onSubmit({
      location,
      temperature: temp,
      checkTime,
      checkDate
    });

    setTemperature('');
  };

  const getTempColor = () => {
    if (!temperature || isNaN(temp)) return '';
    if (isWithinRange) return 'border-green-500 bg-green-50';
    return 'border-red-500 bg-red-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-orange-500" />
          Rectal Temperature Monitoring
        </CardTitle>
        <p className="text-sm text-muted-foreground">Monitor chick health post-hatch</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Temperature (°F)</Label>
            <Input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="104.5"
              className={getTempColor()}
            />
          </div>
          <div className="space-y-2">
            <Label>Check Time</Label>
            <Input
              type="time"
              value={checkTime}
              onChange={(e) => setCheckTime(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={handleSubmit}
              disabled={!technicianName.trim() || !temperature}
              className="w-full"
            >
              Add Reading
            </Button>
          </div>
        </div>

        {/* Range Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" /> In Range
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" /> Out of Range
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default RectalTempEntry;
