import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { History, Info, Loader2 } from 'lucide-react';
import { useTodaysQAEntries, TodaysQAEntry } from '@/hooks/useTodaysQAEntries';

interface TodaysEntriesListProps {
  machineId: string | null | undefined;
  checkDate: string;
  type: string | string[];
  isPastDay: boolean;
  /** Render a per-entry one-line summary from the candling_results JSON blob. */
  renderSummary: (entry: TodaysQAEntry) => React.ReactNode;
  emptyLabel?: string;
  title?: string;
}

/**
 * Phase B — Compact "entries so far today" list shown inline in each QA daily-entry form.
 * When viewing a past day, we still show the list but banner it as read-only history.
 */
const TodaysEntriesList: React.FC<TodaysEntriesListProps> = ({
  machineId,
  checkDate,
  type,
  isPastDay,
  renderSummary,
  emptyLabel = 'No entries recorded yet.',
  title,
}) => {
  const { data, isLoading } = useTodaysQAEntries(machineId, checkDate, type);
  const entries = data ?? [];

  const heading = title ?? (isPastDay ? `Entries on ${checkDate}` : "Today's entries");

  return (
    <div className="pt-3 border-t space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="h-4 w-4" />
          {heading}
          <Badge variant="secondary" className="ml-1">{entries.length}</Badge>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {isPastDay && (
        <Alert className="bg-amber-50 border-amber-200 py-2">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-xs">
            Viewing {checkDate} — read-only history. Switch the date back to today to add new entries.
          </AlertDescription>
        </Alert>
      )}

      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyLabel}</p>
      ) : (
        <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
          {entries.map((e) => {
            const t = (e.check_time || '').slice(0, 5);
            return (
              <div key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <Badge variant="outline" className="font-mono text-xs shrink-0">{t || '--:--'}</Badge>
                <div className="flex-1 min-w-0">{renderSummary(e)}</div>
                {e.inspector_name && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {e.inspector_name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TodaysEntriesList;
