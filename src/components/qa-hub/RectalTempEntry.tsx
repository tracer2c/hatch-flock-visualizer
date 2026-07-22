import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Thermometer, CalendarIcon } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import TodaysEntriesList from './TodaysEntriesList';

interface RectalTempEntryProps {
  technicianName: string;
  checkDate: string;
  machineId?: string | null;
  entryMode?: 'house' | 'machine' | 'room';
  isPastDay?: boolean;
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

const RectalTempEntry: React.FC<RectalTempEntryProps> = ({ technicianName, checkDate, machineId, entryMode, isPastDay = false, onSubmit }) => {
  const [location, setLocation] = useState('hatcher');
  const [temperature, setTemperature] = useState('');
  const [checkTime, setCheckTime] = useState(new Date().toTimeString().slice(0, 5));
  const [entryDate, setEntryDate] = useState<string>(checkDate);

  // Keep entry date synced when header date changes
  useEffect(() => { setEntryDate(checkDate); }, [checkDate]);

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
      checkDate: entryDate,
    });

    setTemperature('');
  };

  const getTempColor = () => {
    if (!temperature || isNaN(temp)) return '';
    if (isWithinRange) return 'border-green-500 bg-green-50';
    return 'border-red-500 bg-red-50';
  };

  const parsedEntryDate = (() => {
    try { return parseISO(entryDate); } catch { return new Date(); }
  })();

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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <Label>Check Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !entryDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {entryDate ? format(parsedEntryDate, "MMM d, yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parsedEntryDate}
                  onSelect={(d) => d && setEntryDate(format(d, 'yyyy-MM-dd'))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Check Time</Label>
            <Input
              type="time"
              value={checkTime}
              onFocus={() => {
                if (!checkTime) {
                  const d = new Date();
                  setCheckTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                }
              }}
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

        <TodaysEntriesList
          machineId={machineId}
          checkDate={checkDate}
          type="rectal_temperature"
          entryMode={entryMode}
          isPastDay={false}
          emptyLabel="No rectal temperature readings yet for this date."
          renderSummary={(e) => {
            const loc = e.candling_results?.location ?? '—';
            const t = e.candling_results?.temperature ?? e.temperature;
            return (
              <span>
                <span className="capitalize">{String(loc).replace(/_/g, ' ')}</span>
                {typeof t === 'number' && <> · <span className="font-medium">{t.toFixed(1)}°F</span></>}
              </span>
            );
          }}
        />
      </CardContent>
    </Card>
  );
};

export default RectalTempEntry;
