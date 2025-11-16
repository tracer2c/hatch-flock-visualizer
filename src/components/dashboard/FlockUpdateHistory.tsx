import { useQuery } from '@tanstack/react-query';
import { FlockHistoryService } from '@/services/flockHistoryService';
import { format } from 'date-fns';
import { Clock, User, Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FlockUpdateHistoryProps {
  flockId: string;
}

const FlockUpdateHistory = ({ flockId }: FlockUpdateHistoryProps) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ['flock-history', flockId],
    queryFn: () => FlockHistoryService.getFlockHistory(flockId)
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading history...</div>;
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No update history available
      </div>
    );
  }

  return (
    <div className="w-80 max-h-96 overflow-y-auto">
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Complete Update History</h4>
        </div>
        
        {history.map((entry: any, index: number) => {
          const userName = entry.user_profiles 
            ? `${entry.user_profiles.first_name || ''} ${entry.user_profiles.last_name || ''}`.trim() || entry.user_profiles.email
            : 'Unknown User';
          
          const technicianMatch = entry.notes?.match(/by (.+)$/);
          const technicianName = technicianMatch ? technicianMatch[1] : null;

          return (
            <div key={entry.id}>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {entry.change_type === 'create' ? (
                        <Badge variant="secondary" className="text-xs">
                          Created
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Edit3 className="h-3 w-3 mr-1" />
                          Updated
                        </Badge>
                      )}
                    </div>
                    
                    {entry.field_changed && entry.change_type !== 'create' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>{entry.field_changed}</strong>: {entry.old_value} → {entry.new_value}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {technicianName ? (
                          <>
                            Technician: <span className="text-primary">{technicianName}</span>
                            <span className="text-muted-foreground ml-1">({userName})</span>
                          </>
                        ) : (
                          userName
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(entry.changed_at), 'MMM dd, yyyy • h:mm a')}
                    </div>
                  </div>
                </div>
              </div>
              
              {index < history.length - 1 && (
                <Separator className="my-3" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FlockUpdateHistory;
