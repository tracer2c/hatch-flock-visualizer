import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Droplets, Plus, Thermometer, Info } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getUserCompanyId } from "@/services/qaSubmissionService";

const ROOM_OPTIONS = [
  { value: 'setter_room',   label: 'Setter Room' },
  { value: 'hatcher_room',  label: 'Hatcher Room' },
  { value: 'chick_room',    label: 'Chick Room' },
];

const RoomHumidityEntry: React.FC = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const technicianName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || profile.email
    : '';

  const [room, setRoom] = useState('setter_room');
  const [humidity, setHumidity] = useState('');
  const [temperature, setTemperature] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const humidityColor = (() => {
    if (!humidity) return '';
    const n = parseFloat(humidity);
    if (isNaN(n)) return '';
    if (n >= 53 && n <= 58) return 'border-green-500 bg-green-50 text-green-700';
    if ((n >= 50 && n < 53) || (n > 58 && n <= 62)) return 'border-yellow-500 bg-yellow-50 text-yellow-700';
    return 'border-red-500 bg-red-50 text-red-700';
  })();

  const tempColor = (() => {
    if (!temperature) return '';
    const n = parseFloat(temperature);
    if (isNaN(n)) return '';
    if (n >= 99.5 && n <= 100.5) return 'border-green-500 bg-green-50 text-green-700';
    if ((n >= 99.0 && n < 99.5) || (n > 100.5 && n <= 101.0)) return 'border-yellow-500 bg-yellow-50 text-yellow-700';
    return 'border-red-500 bg-red-50 text-red-700';
  })();

  const handleSubmit = async () => {
    if (!humidity || !temperature) {
      toast.error('Enter humidity and temperature');
      return;
    }
    if (!technicianName) {
      toast.error('User profile not loaded yet');
      return;
    }
    setSaving(true);
    try {
      const company_id = profile?.company_id ?? (await getUserCompanyId());
      const roomLabel = ROOM_OPTIONS.find(r => r.value === room)?.label ?? room;
      const { error } = await supabase.from('qa_monitoring').insert({
        company_id,
        machine_id: null,
        batch_id: null,
        check_date: checkDate,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: 0,
        humidity: parseFloat(humidity),
        temperature: parseFloat(temperature),
        inspector_name: technicianName,
        notes: notes || null,
        entry_mode: 'room',
        candling_results: JSON.stringify({
          type: 'humidity',
          scope: 'room',
          room,
          room_label: roomLabel,
        }),
      });
      if (error) throw error;
      toast.success('Room humidity saved');
      queryClient.invalidateQueries({ queryKey: ['qa_monitoring'] });
      queryClient.invalidateQueries({ queryKey: ['recent-qa-entries'] });
      setHumidity('');
      setTemperature('');
      setNotes('');
    } catch (e: any) {
      toast.error(`Failed to save: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Humidity & Temperature (Room)
        </CardTitle>
        <p className="text-sm text-muted-foreground">Ideal humidity: 53–58% · Ideal temp: 99.5–100.5°F</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Humidity is recorded at the room level, not per machine.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Technician</Label>
            <Input value={technicianName} disabled readOnly />
          </div>
          <div className="space-y-2">
            <Label>Check Date</Label>
            <DatePicker
              date={checkDate}
              onSelect={(d) => setCheckDate(d ? format(d, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0])}
              placeholder="Select check date"
            />
          </div>
          <div className="space-y-2">
            <Label>Room</Label>
            <Select value={room} onValueChange={setRoom}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROOM_OPTIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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
              className={`text-center h-12 text-lg ${humidityColor}`}
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
              className={`text-center h-12 text-lg ${tempColor}`}
            />
            <p className="text-xs text-muted-foreground">Ideal range: 99.5–100.5°F</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observations" />
        </div>

        <Badge variant="outline" className="bg-muted/50">
          Logged in as: {technicianName || 'Loading…'}
        </Badge>

        <Button
          onClick={handleSubmit}
          className="w-full"
          disabled={saving || !technicianName || !humidity || !temperature}
        >
          <Plus className="h-4 w-4 mr-2" />
          {saving ? 'Saving…' : 'Save Room Humidity & Temperature'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RoomHumidityEntry;
