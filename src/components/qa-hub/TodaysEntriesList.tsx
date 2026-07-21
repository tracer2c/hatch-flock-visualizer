import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { History, Info, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTodaysQAEntries, TodaysQAEntry } from '@/hooks/useTodaysQAEntries';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface TodaysEntriesListProps {
  machineId: string | null | undefined;
  checkDate: string;
  type: string | string[];
  isPastDay: boolean;
  renderSummary: (entry: TodaysQAEntry) => React.ReactNode;
  emptyLabel?: string;
  title?: string;
  entryMode?: 'house' | 'machine' | 'room';
  /** When provided, an Edit pencil is shown on each row. */
  onEdit?: (entry: TodaysQAEntry) => void;
  /** When true (default), rows show a Delete trash. Disabled on past days. */
  allowDelete?: boolean;
}

const TodaysEntriesList: React.FC<TodaysEntriesListProps> = ({
  machineId,
  checkDate,
  type,
  isPastDay,
  renderSummary,
  emptyLabel = 'No entries recorded yet.',
  title,
  entryMode,
  onEdit,
  allowDelete = true,
}) => {
  const { data, isLoading } = useTodaysQAEntries(machineId, checkDate, type, { entryMode });
  const queryClient = useQueryClient();
  const entries = data ?? [];

  const heading = title ?? (isPastDay ? `Entries on ${checkDate}` : "Today's entries");

  const handleDelete = async (entry: TodaysQAEntry) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    const { error } = await supabase.from('qa_monitoring').delete().eq('id', entry.id);
    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
      return;
    }
    toast.success('Entry deleted.');
    queryClient.invalidateQueries({ queryKey: ['todays-qa-entries'] });
    queryClient.invalidateQueries({ queryKey: ['recent-qa-entries'] });
  };

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
                  <span className="text-xs text-muted-foreground truncate max-w-[120px] hidden sm:inline">
                    {e.inspector_name}
                  </span>
                )}
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onEdit(e)}
                    aria-label="Edit entry"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {allowDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(e)}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
