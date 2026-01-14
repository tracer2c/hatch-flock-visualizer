import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff } from 'lucide-react';
import { offlineQueue } from '@/lib/offlineQueue';

interface PendingSyncBadgeProps {
  table: string;
  recordId?: string;
  className?: string;
}

export function PendingSyncBadge({ table, recordId, className }: PendingSyncBadgeProps) {
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const checkPending = async () => {
      const entries = await offlineQueue.getAll();
      const pending = entries.some(e => {
        if (e.table !== table) return false;
        if (recordId && e.data.id !== recordId) return false;
        return e.status === 'pending' || e.status === 'failed';
      });
      setIsPending(pending);
    };

    checkPending();
    const interval = setInterval(checkPending, 3000);
    return () => clearInterval(interval);
  }, [table, recordId]);

  if (!isPending) return null;

  return (
    <Badge 
      variant="outline" 
      className={`text-amber-600 border-amber-300 bg-amber-50 ${className}`}
    >
      <CloudOff className="h-3 w-3 mr-1" />
      Pending sync
    </Badge>
  );
}

export function SyncStatusIndicator() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      const count = await offlineQueue.getCount();
      setPendingCount(count);
    };

    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
        <Cloud className="h-3 w-3 mr-1" />
        Synced
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
      <CloudOff className="h-3 w-3 mr-1" />
      {pendingCount} pending
    </Badge>
  );
}
