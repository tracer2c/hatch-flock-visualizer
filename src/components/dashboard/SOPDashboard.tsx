import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, AlertTriangle, Home, Settings, ArrowRightLeft, Bell, ListChecks, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const SOPDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch active batches with their checklist status
  const { data: activeBatches, isLoading: batchesLoading } = useQuery({
    queryKey: ['active-batches-sop'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id, batch_number, set_date, status,
          flock:flocks(flock_name),
          machine:machines(machine_number, machine_type)
        `)
        .in('status', ['setting', 'incubating', 'hatching'])
        .order('set_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    }
  });

  // Fetch checklist items
  const { data: checklistItems } = useQuery({
    queryKey: ['checklist-items-sop'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_checklist_items')
        .select('*')
        .order('order_index');
      if (error) throw error;
      return data;
    }
  });

  // Fetch today's completions
  const { data: todayCompletions, refetch: refetchCompletions } = useQuery({
    queryKey: ['today-completions'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('checklist_completions')
        .select('*')
        .gte('completed_at', today);
      if (error) throw error;
      return data;
    }
  });

  // Fetch machines needing maintenance
  const { data: machinesMaintenance } = useQuery({
    queryKey: ['machines-maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('id, machine_number, machine_type, last_maintenance, status')
        .order('last_maintenance', { ascending: true, nullsFirst: true })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  // Fetch pending transfers
  const { data: pendingTransfers } = useQuery({
    queryKey: ['pending-transfers-sop'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id, batch_number, set_date, expected_hatch_date,
          flock:flocks(flock_name),
          machine:machines(machine_number, machine_type)
        `)
        .eq('status', 'incubating')
        .order('set_date', { ascending: true })
        .limit(10);
      if (error) throw error;
      // Calculate days in setter - houses ready for transfer (day 18+)
      return data?.filter(b => {
        const daysSinceSet = differenceInDays(new Date(), new Date(b.set_date));
        return daysSinceSet >= 17 && daysSinceSet <= 20;
      });
    }
  });

  // Fetch active alerts
  const { data: activeAlerts } = useQuery({
    queryKey: ['active-alerts-sop'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('status', 'active')
        .order('triggered_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  const getDayOfIncubation = (setDate: string) => {
    return differenceInDays(new Date(), new Date(setDate)) + 1;
  };

  const getChecklistProgress = (batchId: string, day: number) => {
    const applicableItems = checklistItems?.filter(item => 
      item.applicable_days?.includes(day)
    ) || [];
    const completed = todayCompletions?.filter(c => 
      c.batch_id === batchId && c.day_of_incubation === day
    ).length || 0;
    return { total: applicableItems.length, completed };
  };

  const handleCompleteItem = async (batchId: string, itemId: string, day: number) => {
    try {
      await completeItem.mutateAsync({
        batchId,
        checklistItemId: itemId,
        dayOfIncubation: day,
        completedBy: 'Current User'
      });
      refetchCompletions();
      toast({ title: "Item completed" });
    } catch (error) {
      toast({ title: "Error completing item", variant: "destructive" });
    }
  };

  if (batchesLoading) {
    return <div className="p-6">Loading SOP Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Home className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Houses</p>
                <p className="text-2xl font-bold">{activeBatches?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Machines Due Maintenance</p>
                <p className="text-2xl font-bold">
                  {machinesMaintenance?.filter(m => {
                    if (!m.last_maintenance) return true;
                    return differenceInDays(new Date(), new Date(m.last_maintenance)) > 30;
                  }).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Ready for Transfer</p>
                <p className="text-2xl font-bold">{pendingTransfers?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">{activeAlerts?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="houses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="houses" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            House SOPs
          </TabsTrigger>
          <TabsTrigger value="machines" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Machine Maintenance
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Protocols
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alert SOPs
          </TabsTrigger>
        </TabsList>

        {/* House SOPs Tab */}
        <TabsContent value="houses" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBatches?.map(batch => {
              const day = getDayOfIncubation(batch.set_date);
              const progress = getChecklistProgress(batch.id, day);
              const applicableItems = checklistItems?.filter(item => 
                item.applicable_days?.includes(day) && item.target_type === 'batch'
              ) || [];
              const completedIds = new Set(
                todayCompletions?.filter(c => c.batch_id === batch.id && c.day_of_incubation === day)
                  .map(c => c.checklist_item_id) || []
              );

              return (
                <Card key={batch.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {batch.batch_number}
                      </CardTitle>
                      <Badge variant={progress.completed === progress.total ? 'default' : 'secondary'}>
                        Day {day}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(batch.flock as any)?.flock_name} • {(batch.machine as any)?.machine_number}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{progress.completed}/{progress.total}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                        />
                      </div>
                      {applicableItems.length > 0 && (
                        <div className="space-y-1 mt-3">
                          {applicableItems.slice(0, 3).map(item => (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                              <span className={completedIds.has(item.id) ? 'line-through text-muted-foreground' : ''}>
                                {item.title}
                              </span>
                              {!completedIds.has(item.id) && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 px-2"
                                  onClick={() => handleCompleteItem(batch.id, item.id, day)}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Machine Maintenance Tab */}
        <TabsContent value="machines" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machinesMaintenance?.map(machine => {
              const daysSinceMaintenance = machine.last_maintenance 
                ? differenceInDays(new Date(), new Date(machine.last_maintenance))
                : 999;
              const needsMaintenance = daysSinceMaintenance > 30;

              return (
                <Card key={machine.id} className={needsMaintenance ? 'border-orange-500' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {machine.machine_number}
                      </CardTitle>
                      <Badge variant={needsMaintenance ? 'destructive' : 'default'}>
                        {machine.machine_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Maintenance</span>
                        <span>{machine.last_maintenance ? format(new Date(machine.last_maintenance), 'MMM dd, yyyy') : 'Never'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Days Since</span>
                        <span className={needsMaintenance ? 'text-destructive font-medium' : ''}>
                          {machine.last_maintenance ? `${daysSinceMaintenance} days` : 'N/A'}
                        </span>
                      </div>
                      {needsMaintenance && (
                        <div className="flex items-center gap-2 text-orange-600 mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs">Maintenance overdue</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Transfer Protocols Tab */}
        <TabsContent value="transfers" className="space-y-4">
          {pendingTransfers && pendingTransfers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingTransfers.map(batch => {
                const daysSinceSet = differenceInDays(new Date(), new Date(batch.set_date));
                return (
                  <Card key={batch.id} className="border-purple-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {batch.batch_number}
                        </CardTitle>
                        <Badge variant="secondary">Day {daysSinceSet}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(batch.flock as any)?.flock_name}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Machine</span>
                          <span>{(batch.machine as any)?.machine_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expected Hatch</span>
                          <span>{format(new Date(batch.expected_hatch_date), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded text-xs mt-2">
                          <p className="font-medium text-purple-700 dark:text-purple-300">Transfer Protocol:</p>
                          <ul className="list-disc list-inside text-muted-foreground mt-1">
                            <li>Verify egg temperature before transfer</li>
                            <li>Handle trays carefully to avoid damage</li>
                            <li>Record transfer time accurately</li>
                            <li>Check hatcher settings post-transfer</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No houses ready for transfer at this time</p>
                <p className="text-sm mt-1">Houses appear here when they reach Day 17-20</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {activeAlerts && activeAlerts.length > 0 ? (
            <div className="space-y-4">
              {activeAlerts.map(alert => (
                <Card key={alert.id} className="border-red-500">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{alert.title}</h4>
                          <Badge variant="destructive">{alert.severity}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Triggered: {format(new Date(alert.triggered_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No active alerts</p>
                <p className="text-sm mt-1">All systems operating normally</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SOPDashboard;
