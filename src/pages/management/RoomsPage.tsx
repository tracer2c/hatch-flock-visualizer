import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SettingsPageWrapper } from '@/components/management/SettingsPageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Archive, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useRooms, useCreateRoom, useUpdateRoom, type RoomType } from '@/hooks/useRooms';
import { useHatcheries } from '@/hooks/useQAHubData';
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/ui/read-only-banner';

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'chick', label: 'Chick Room' },
  { value: 'separator', label: 'Separator Room' },
  { value: 'hatcher', label: 'Hatcher Room' },
  { value: 'setter', label: 'Setter Room' },
  { value: 'wash', label: 'Wash Room' },
  { value: 'other', label: 'Other' },
];

export default function RoomsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get('returnTo');
  const { hasWriteAccess } = usePermissions();
  const canWrite = hasWriteAccess('hatcheries');

  const { data: hatcheries } = useHatcheries();
  const { data: rooms, isLoading } = useRooms();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();

  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('chick');
  const [unitId, setUnitId] = useState<string>('');

  const handleAdd = async () => {
    if (!name.trim()) return toast.error('Enter a room name');
    try {
      await createRoom.mutateAsync({ name: name.trim(), room_type: roomType, unit_id: unitId || null });
      toast.success(`Room "${name}" added`);
      setName('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add room');
    }
  };

  const handleArchive = async (id: string, current: boolean) => {
    try {
      await updateRoom.mutateAsync({ id, is_active: !current });
      toast.success(current ? 'Room archived' : 'Room restored');
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  return (
    <SettingsPageWrapper title="Rooms" description="Manage rooms used for room-scoped QA checks (Humidity, Rectal Temps, etc.)">
      <div className="p-6 space-y-6">
        {returnTo && (
          <Button variant="ghost" size="sm" onClick={() => navigate(returnTo)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to QA Hub
          </Button>
        )}
        <ReadOnlyBanner show={!canWrite} />

        {canWrite && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Room
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chick Room A" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={roomType} onValueChange={(v) => setRoomType(v as RoomType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROOM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Hatchery (optional)</Label>
                  <Select value={unitId} onValueChange={setUnitId}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      {(hatcheries ?? []).map((h: any) => (
                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} disabled={createRoom.isPending} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Room
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4" /> Rooms {rooms && <Badge variant="secondary">{rooms.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : !rooms?.length ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No rooms yet. Add your first room above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Hatchery</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((r) => {
                    const h = hatcheries?.find((x: any) => x.id === r.unit_id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell><Badge variant="outline">{r.room_type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{h?.name || '—'}</TableCell>
                        <TableCell className="text-right">
                          {canWrite && (
                            <Button size="sm" variant="ghost" onClick={() => handleArchive(r.id, r.is_active)} className="gap-1">
                              <Archive className="h-3.5 w-3.5" /> Archive
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SettingsPageWrapper>
  );
}
