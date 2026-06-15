import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CloudOff, AlertCircle } from 'lucide-react';
import { offlineQueue, QueuedEntry } from '@/lib/offlineQueue';

interface PendingSyncListProps {
  table: string;
  batchId?: string;
  title?: string;
  empty?: boolean;
}

function getRecordLabel(entry: QueuedEntry) {
  const payload = entry.payload || entry.data || {};
  const meta = payload.candling_results ? safeParse(payload.candling_results) : null;

  if (meta?.type) return String(meta.type).replaceAll('_', ' ');
  if (payload.inspector_name) return `Inspector: ${payload.inspector_name}`;
  if (payload.lab_technician) return `Technician: ${payload.lab_technician}`;
  if (payload.technician_name) return `Technician: ${payload.technician_name}`;
  if (payload.inspection_date) return `Inspection: ${payload.inspection_date}`;
  if (payload.analysis_date) return `Analysis: ${payload.analysis_date}`;
  return entry.operation;
}

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function PendingSyncList({ table, batchId, title = 'Pending sync', empty = false }: PendingSyncListProps) {
  const [entries, setEntries] = useState<QueuedEntry[]>([]);

  useEffect(() => {
    const refresh = async () => {
      const allEntries = await offlineQueue.getAll();
      setEntries(allEntries.filter((entry) => {
        if (entry.table !== table) return false;
        if (!['pending', 'failed', 'syncing'].includes(entry.status)) return false;
        if (batchId && entry.batchId !== batchId && entry.payload?.batch_id !== batchId && entry.payload?.id !== batchId) return false;
        return true;
      }));
    };

    refresh();
    window.addEventListener('offline-queue-changed', refresh);
    const interval = setInterval(refresh, 3000);

    return () => {
      window.removeEventListener('offline-queue-changed', refresh);
      clearInterval(interval);
    };
  }, [table, batchId]);

  if (entries.length === 0 && !empty) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-amber-900">
          <CloudOff className="h-4 w-4" />
          {title}
          <Badge variant="outline" className="border-amber-300 bg-white text-amber-700">
            {entries.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending records.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Saved locally</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">
                    {new Date(entry.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="capitalize">{getRecordLabel(entry)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={entry.status === 'failed' ? 'border-red-300 bg-red-50 text-red-700' : 'border-amber-300 bg-white text-amber-700'}
                    >
                      {entry.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {entry.status === 'failed' ? 'Retry pending' : 'Waiting to sync'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
