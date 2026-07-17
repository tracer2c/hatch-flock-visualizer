import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Droplets, Plus, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRooms } from '@/hooks/useRooms';

export interface RoomHumiditySubmitData {
  roomId: string;
  humidity: number;
  temperature: number;
  notes?: string;
}

interface Props {
  technicianName: string;
  checkDate: string;
  unitId?: string | null;
  returnParams?: string;
  onSubmit: (data: RoomHumiditySubmitData) => Promise<void> | void;
}

const RoomHumidityEntry: React.FC<Props> = ({ technicianName, checkDate, unitId, returnParams, onSubmit }) => {
  const navigate = useNavigate();
  const { data: rooms, isLoading } = useRooms(unitId);

  const [roomId, setRoomId] = useState('');
  const [humidity, setHumidity] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const humidityNum = parseFloat(humidity);
  const tempNum = parseFloat(temperature);
  const humidityOk = !Number.isNaN(humidityNum) && humidityNum >= 53 && humidityNum <= 58;

  const canSubmit = roomId && !Number.isNaN(humidityNum) && !Number.isNaN(tempNum);

  const goAddRoom = () => {
    const qp = returnParams ?? '';
    navigate(`/management/rooms?returnTo=${encodeURIComponent(`/qa-hub${qp}`)}`);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSubmit({ roomId, humidity: humidityNum, temperature: tempNum, notes: notes || undefined });
      setHumidity(''); setTemperature(''); setNotes('');
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Droplets className="h-4 w-4 text-primary" /> Room Humidity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Humidity is measured per room. Target range: <strong>53%–58%</strong>.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Room</Label>
            <div className="flex gap-2">
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={isLoading ? 'Loading…' : 'Select room'} />
                </SelectTrigger>
                <SelectContent>
                  {(rooms ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                  {!isLoading && !rooms?.length && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No rooms yet.</div>
                  )}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={goAddRoom} className="gap-1 shrink-0">
                <Plus className="h-3.5 w-3.5" /> Add Room
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Technician</Label>
            <Input value={technicianName || 'Loading…'} disabled readOnly />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Humidity (%RH)</Label>
            <Input
              type="number" step="0.1" value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
              placeholder="55.0"
              className={humidity && !humidityOk ? 'border-amber-500' : ''}
            />
            {humidity && !humidityOk && (
              <p className="text-xs text-amber-600">Outside target range (53–58%)</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Temperature (°F)</Label>
            <Input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="99.5" />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth noting?" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? 'Saving…' : 'Save Humidity Check'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomHumidityEntry;
