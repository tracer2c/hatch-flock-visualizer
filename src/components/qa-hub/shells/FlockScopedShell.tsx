import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Scale, AlertTriangle, Info, Bird } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getUserCompanyId } from '@/services/qaSubmissionService';
import { toast } from 'sonner';
import { useHatcheries } from '@/hooks/useQAHubData';
import SpecificGravityEntry from '../SpecificGravityEntry';
import CullChecksEntry from '../CullChecksEntry';

interface FlockBatch {
  id: string;
  batch_number: string;
  set_date: string;
  unit_id: string | null;
  unit_name: string | null;
  flock_id: string;
  flock_name: string;
  flock_number: number;
  age_weeks: number | null;
}

/**
 * FlockScopedShell — flock/house-scoped QA (no machine picker).
 * Covers Specific Gravity and Culls.
 */
const FlockScopedShell: React.FC<{ initialTab?: 'gravity' | 'culls' }> = ({ initialTab = 'gravity' }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const technicianName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || profile.email
    : '';

  const [tab, setTab] = useState<'gravity' | 'culls'>(initialTab);
  const [hatcheryId, setHatcheryId] = useState<string>('all');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const { data: hatcheries } = useHatcheries();

  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['qa-flock-batches', hatcheryId],
    queryFn: async (): Promise<FlockBatch[]> => {
      let q = supabase
        .from('batches')
        .select(`
          id, batch_number, set_date, unit_id,
          flock:flocks!batches_flock_id_fkey(id, flock_name, flock_number, age_weeks),
          unit:units!batches_unit_fk(id, name)
        `)
        .in('status', ['in_setter', 'in_hatcher']);
      if (hatcheryId !== 'all') q = q.eq('unit_id', hatcheryId);
      const { data, error } = await q.order('set_date', { ascending: false });
      if (error) throw error;
      return (data || [])
        .filter((b: any) => b.flock?.id)
        .map((b: any) => ({
          id: b.id,
          batch_number: b.batch_number,
          set_date: b.set_date,
          unit_id: b.unit_id,
          unit_name: b.unit?.name ?? null,
          flock_id: b.flock.id,
          flock_name: b.flock.flock_name,
          flock_number: b.flock.flock_number,
          age_weeks: b.flock.age_weeks ?? null,
        }));
    },
  });

  const selectedBatch = useMemo(
    () => batches?.find((b) => b.id === selectedBatchId) ?? null,
    [batches, selectedBatchId]
  );

  const flockOptions = useMemo(
    () =>
      (batches ?? []).map((b) => ({
        flock_id: b.flock_id,
        batch_id: b.id,
        flock_name: b.flock_name,
        flock_number: b.flock_number,
      })),
    [batches]
  );

  const resolveCompanyId = async () => profile?.company_id ?? (await getUserCompanyId());

  const handleSpecificGravity = async (data: {
    flock_id: string;
    batch_id: string | null;
    age: number;
    sampleSize: number;
    floatCount: number;
    floatPercentage: number;
    testDate: string;
  }) => {
    if (!selectedBatch) return toast.error('Pick a flock/house first');
    if (!technicianName) return toast.error('User profile not loaded yet');
    setSaving(true);
    try {
      const company_id = await resolveCompanyId();
      const sinkCount = data.sampleSize - data.floatCount;
      const threshold = data.age >= 25 && data.age <= 40 ? 10 : 15;
      const { error } = await supabase.from('specific_gravity_tests').insert({
        company_id,
        flock_id: data.flock_id,
        batch_id: selectedBatch.id,
        test_date: data.testDate,
        age_weeks: data.age,
        sample_size: data.sampleSize,
        float_count: data.floatCount,
        sink_count: sinkCount,
        float_percentage: data.floatPercentage,
        meets_standard: data.floatPercentage < threshold,
        standard_min: 0,
        standard_max: threshold,
        difference: data.floatPercentage - threshold,
      });
      if (error) throw error;
      toast.success('Specific gravity saved.');
      queryClient.invalidateQueries({ queryKey: ['specific_gravity_tests'] });
    } catch (e: any) {
      toast.error(`Failed to save: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCullCheck = async (data: {
    flock_id: string;
    batch_id: string;
    maleCount: number;
    femaleCount: number;
    defectType: string;
    checkDate: string;
  }) => {
    if (!technicianName) return toast.error('User profile not loaded yet');
    setSaving(true);
    try {
      const company_id = await resolveCompanyId();
      const { error } = await supabase.from('qa_monitoring').insert({
        company_id,
        batch_id: data.batch_id,
        machine_id: null,
        check_date: data.checkDate,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: 0,
        temperature: 100,
        humidity: 55,
        mortality_count: data.maleCount + data.femaleCount,
        inspector_name: technicianName,
        entry_mode: 'house',
        candling_results: JSON.stringify({
          type: 'cull_check',
          flock_id: data.flock_id,
          maleCount: data.maleCount,
          femaleCount: data.femaleCount,
          defectType: data.defectType,
        }),
      });
      if (error) throw error;
      toast.success('Cull check saved.');
      queryClient.invalidateQueries({ queryKey: ['qa_monitoring'] });
      queryClient.invalidateQueries({ queryKey: ['recent-qa-entries'] });
    } catch (e: any) {
      toast.error(`Failed to save: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[240px]">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bird className="h-5 w-5 text-primary" />
                Flock / House Checks
              </CardTitle>
              <CardDescription>
                Flock-level QA — no machine required. Pick a hatchery, flock/house, and date.
              </CardDescription>
            </div>

            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs">Hatchery</Label>
              <Select value={hatcheryId} onValueChange={(v) => { setHatcheryId(v); setSelectedBatchId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All hatcheries</SelectItem>
                  {(hatcheries ?? []).map((h: any) => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-[260px]">
              <Label className="text-xs">Flock / House</Label>
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder={batchesLoading ? 'Loading…' : 'Select flock/house'} />
                </SelectTrigger>
                <SelectContent>
                  {(batches ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      Flock {b.flock_number} — {b.flock_name} · House {b.batch_number}
                      {b.unit_name ? ` · ${b.unit_name}` : ''}
                    </SelectItem>
                  ))}
                  {!batchesLoading && (batches ?? []).length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No active flocks.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs">Check Date</Label>
              <DatePicker
                date={checkDate}
                onSelect={(d) =>
                  setCheckDate(d ? format(d, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0])
                }
                placeholder="Select date"
              />
            </div>

            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs">Technician</Label>
              <Input value={technicianName || 'Loading…'} disabled readOnly />
            </div>
          </div>
        </CardHeader>
      </Card>

      {!selectedBatch && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>Select a flock/house above to start entering QA data.</AlertDescription>
        </Alert>
      )}

      {selectedBatch && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'gravity' | 'culls')}>
          <TabsList>
            <TabsTrigger value="gravity" className="gap-1">
              <Scale className="h-3.5 w-3.5" /> Specific Gravity
            </TabsTrigger>
            <TabsTrigger value="culls" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Culls
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gravity" className="pt-4">
            <SpecificGravityEntry
              technicianName={technicianName}
              checkDate={checkDate}
              flockId={selectedBatch.flock_id}
              flockNumber={selectedBatch.flock_number}
              flockName={selectedBatch.flock_name}
              batchId={selectedBatch.id}
              onSubmit={handleSpecificGravity}
            />
          </TabsContent>

          <TabsContent value="culls" className="pt-4">
            <CullChecksEntry
              technicianName={technicianName}
              checkDate={checkDate}
              flockOptions={flockOptions}
              defaultFlockId={selectedBatch.flock_id}
              defaultBatchId={selectedBatch.id}
              machineId={null}
              onSubmit={handleCullCheck}
            />
          </TabsContent>
        </Tabs>
      )}

      {saving && <div className="text-xs text-muted-foreground">Saving…</div>}
    </div>
  );
};

export default FlockScopedShell;
