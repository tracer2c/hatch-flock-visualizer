import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowRight, ArrowLeft, Calendar, Filter, X, RefreshCw, Trash2 } from "lucide-react";
import { useMachineTransferHistory, useDeleteTransfer } from "@/hooks/useMachineTransfers";

interface MachineTransfersTabProps {
  machineId: string;
  machineType: string;
  dateFrom?: string;
  dateTo?: string;
}

const MachineTransfersTab = ({ machineId, machineType, dateFrom, dateTo }: MachineTransfersTabProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: dateFrom || '',
    dateTo: dateTo || ''
  });

  const { data, isLoading, refetch } = useMachineTransferHistory(machineId, {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined
  });

  const deleteTransfer = useDeleteTransfer();

  const transfersOut = data?.transfersOut || [];
  const transfersIn = data?.transfersIn || [];

  const activeFilterCount = (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transfer record?')) return;
    await deleteTransfer.mutateAsync(id);
  };

  const isSetter = machineType === 'setter' || machineType === 'combo';
  const isHatcher = machineType === 'hatcher' || machineType === 'combo';

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4 text-sm">
          {isSetter && (
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground">Transfers Out:</span>
              <span className="font-semibold">{transfersOut.length}</span>
            </div>
          )}
          {isHatcher && (
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Transfers In:</span>
              <span className="font-semibold">{transfersIn.length}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">{activeFilterCount}</Badge>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent className="pt-2">
          <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                {activeFilterCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFilters({ dateFrom: '', dateTo: '' })}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Transfers Out Section */}
      {isSetter && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-orange-500" />
            Transfers Out (Setter → Hatcher)
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>House</TableHead>
                  <TableHead>To Machine</TableHead>
                  <TableHead className="text-center">Days in Setter</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading transfers...
                    </TableCell>
                  </TableRow>
                ) : transfersOut.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No transfers out from this machine.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfersOut.map(t => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(t.transfer_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {t.batch ? (
                          <div>
                            <div className="font-medium">{t.batch.batch_number}</div>
                            {t.batch.flock && (
                              <div className="text-xs text-muted-foreground">
                                {t.batch.flock.flock_name}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t.to_machine?.machine_number || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {t.days_in_previous_machine !== null ? (
                          <Badge 
                            className={
                              t.days_in_previous_machine === 18 
                                ? 'bg-green-100 text-green-800'
                                : t.days_in_previous_machine >= 17 && t.days_in_previous_machine <= 19
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            Day {t.days_in_previous_machine}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {t.notes || '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Transfers In Section */}
      {isHatcher && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 text-green-500" />
            Transfers In (From Setters)
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>House</TableHead>
                  <TableHead>From Machine</TableHead>
                  <TableHead className="text-center">Days in Setter</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading transfers...
                    </TableCell>
                  </TableRow>
                ) : transfersIn.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No transfers received by this machine.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfersIn.map(t => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(t.transfer_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {t.batch ? (
                          <div>
                            <div className="font-medium">{t.batch.batch_number}</div>
                            {t.batch.flock && (
                              <div className="text-xs text-muted-foreground">
                                {t.batch.flock.flock_name}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t.from_machine?.machine_number || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {t.days_in_previous_machine !== null ? (
                          <Badge 
                            className={
                              t.days_in_previous_machine === 18 
                                ? 'bg-green-100 text-green-800'
                                : t.days_in_previous_machine >= 17 && t.days_in_previous_machine <= 19
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            Day {t.days_in_previous_machine}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {t.notes || '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineTransfersTab;
