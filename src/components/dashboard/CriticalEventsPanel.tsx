import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { useCriticalEvents } from "@/hooks/useCriticalEvents";
import { useNavigate } from "react-router-dom";

const CriticalEventsPanel = () => {
  const { data: events, isLoading } = useCriticalEvents();
  const navigate = useNavigate();
  
  if (isLoading) return <div>Loading events...</div>;
  
  const urgentEvents = events?.filter(e => e.status === 'due_today' || e.status === 'overdue') || [];
  const upcomingEvents = events?.filter(e => e.status === 'upcoming') || [];
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Critical Events & Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {urgentEvents.length === 0 && upcomingEvents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>No critical events at this time</p>
            <p className="text-sm">All tasks are on schedule</p>
          </div>
        )}
        
        {/* Urgent Events */}
        {urgentEvents.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Requires Immediate Attention ({urgentEvents.length})
            </h4>
            {urgentEvents.map(event => (
              <div
                key={event.id}
                className="p-3 bg-destructive/10 border-l-4 border-destructive rounded-lg hover:bg-destructive/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(event.severity)} className="text-xs">
                        {event.batchNumber}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {event.status === 'overdue' ? `${event.daysUntil} days overdue` : 'Due Today'}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground">{event.message}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(event.actionUrl)}
                    className="shrink-0"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming ({upcomingEvents.length})
            </h4>
            {upcomingEvents.slice(0, 5).map(event => (
              <div
                key={event.id}
                className="p-3 bg-primary/10 border-l-4 border-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {event.batchNumber}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        In {event.daysUntil} days
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground">{event.message}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(event.actionUrl)}
                    className="shrink-0"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CriticalEventsPanel;
