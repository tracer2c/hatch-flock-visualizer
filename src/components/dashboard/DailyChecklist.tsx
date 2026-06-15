import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useActiveBatches } from "@/hooks/useHouseData";
import { useDailyChecklistItems, useChecklistCompletions, useCompleteChecklistItem } from "@/hooks/useSOPData";
import { useAuth } from "@/hooks/useAuth";
import {
  CheckCircle, Circle, Clock, User, AlertTriangle,
  ChevronDown, ChevronRight, Building2, CheckSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyChecklistProps {
  selectedBatchId?: string;
  hatcheryFilter?: string;
}

/** Checklist for a single batch — rendered inline inside the hatchery accordion */
const BatchChecklist = ({
  batch,
  profile,
}: {
  batch: any;
  profile: any;
}) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});

  const dayOfIncubation =
    Math.floor(
      (new Date().getTime() - new Date(batch.set_date).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  const { data: checklistItems } = useDailyChecklistItems(dayOfIncubation);
  const { data: completions } = useChecklistCompletions(batch.id, dayOfIncubation);
  const completeItem = useCompleteChecklistItem();

  const completedItemIds = new Set(completions?.map((c: any) => c.checklist_item_id) || []);
  const requiredItems = checklistItems?.filter((i: any) => i.is_required) || [];
  const optionalItems = checklistItems?.filter((i: any) => !i.is_required) || [];
  const completedRequired = requiredItems.filter((i: any) => completedItemIds.has(i.id)).length;
  const progressPct =
    requiredItems.length > 0 ? (completedRequired / requiredItems.length) * 100 : 100;
  const isComplete = requiredItems.length === 0 || completedRequired === requiredItems.length;

  const handleComplete = async (itemId: string, checked: boolean) => {
    if (!checked) return;
    const completedBy =
      profile
        ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
        : 'Unknown';
    await completeItem.mutateAsync({
      checklistItemId: itemId,
      batchId: batch.id,
      dayOfIncubation,
      completedBy,
      notes: noteValues[itemId] || '',
    });
  };

  const toggleNote = (id: string) =>
    setExpandedNotes((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const allItems = [...requiredItems, ...optionalItems];

  return (
    <div className="space-y-2">
      {/* Batch progress bar */}
      <div className="flex items-center gap-3 mb-3">
        <Progress value={progressPct} className="h-1.5 flex-1" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {completedRequired}/{requiredItems.length} required
        </span>
        {isComplete && (
          <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5">
            <CheckCircle className="h-2.5 w-2.5 mr-1" /> Done
          </Badge>
        )}
      </div>

      {allItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No checklist items for Day {dayOfIncubation}.
        </p>
      ) : (
        <div className="space-y-2">
          {allItems.map((item: any) => {
            const isCompleted = completedItemIds.has(item.id);
            const completion = completions?.find((c: any) => c.checklist_item_id === item.id);
            const notesOpen = expandedNotes.has(item.id);

            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-lg border px-4 py-3 transition-colors',
                  isCompleted ? 'bg-green-50/40 border-green-200/60' : 'hover:bg-muted/40'
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={(v) => handleComplete(item.id, !!v)}
                    className="mt-0.5"
                    disabled={isCompleted}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-sm font-medium', isCompleted && 'line-through text-muted-foreground')}>
                        {item.title}
                      </span>
                      {item.is_required ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5">Required</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5">Optional</Badge>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}

                    {isCompleted && completion && (
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" /> Completed
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(completion.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {completion.completed_by}
                        </span>
                      </div>
                    )}

                    {!isCompleted && (
                      <div className="mt-2">
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => toggleNote(item.id)}>
                          {notesOpen ? 'Hide notes' : 'Add notes'}
                        </Button>
                        {notesOpen && (
                          <Textarea
                            value={noteValues[item.id] || ''}
                            onChange={(e) => setNoteValues((p) => ({ ...p, [item.id]: e.target.value }))}
                            placeholder="Add notes…"
                            className="mt-1.5 text-xs"
                            rows={2}
                          />
                        )}
                      </div>
                    )}

                    {completion?.notes && (
                      <div className="mt-1.5 p-1.5 bg-muted rounded text-[11px]">
                        <strong>Notes:</strong> {completion.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Main component — groups active batches by hatchery */
const DailyChecklist = ({ selectedBatchId, hatcheryFilter = 'all' }: DailyChecklistProps) => {
  const { data: allBatches } = useActiveBatches();
  const { profile } = useAuth();
  const [openBatches, setOpenBatches] = useState<Set<string>>(new Set());

  const batches = React.useMemo(() => {
    if (!allBatches) return [];
    return hatcheryFilter === 'all'
      ? allBatches
      : allBatches.filter((b: any) => b.unit_id === hatcheryFilter);
  }, [allBatches, hatcheryFilter]);

  const toggleBatch = (id: string) =>
    setOpenBatches((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No active batches in this hatchery.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-muted-foreground">
          {batches.length} active {batches.length === 1 ? 'batch' : 'batches'} — click a row to run its checklist.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setOpenBatches(new Set(batches.map((b: any) => b.id)))}>
            Expand all
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setOpenBatches(new Set())}>
            Collapse all
          </Button>
        </div>
      </div>

      {batches.map((batch: any) => {
        const dayOfIncubation =
          Math.floor(
            (new Date().getTime() - new Date(batch.set_date).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;
        const isOpen = openBatches.has(batch.id);

        return (
          <Collapsible key={batch.id} open={isOpen} onOpenChange={() => toggleBatch(batch.id)}>
            <Card className={cn('transition-all', isOpen && 'ring-1 ring-primary/20')}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4 rounded-t-lg select-none">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-primary flex-shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{batch.batch_number}</span>
                          <span className="text-sm text-muted-foreground truncate">
                            {batch.flocks?.flock_name}
                            {batch.flocks?.house_number ? ` · House ${batch.flocks.house_number}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5">
                            Day {dayOfIncubation}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground capitalize">
                            {batch.status?.replace('_', ' ')}
                          </span>
                          {batch.machines?.machine_number && (
                            <span className="text-[11px] text-muted-foreground">
                              · {batch.machines.machine_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <CheckSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 px-4 pb-4 border-t">
                  <div className="pt-3">
                    <BatchChecklist batch={batch} profile={profile} />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default DailyChecklist;
