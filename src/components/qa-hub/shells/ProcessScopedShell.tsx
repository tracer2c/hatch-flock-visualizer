import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Waves, Thermometer, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getUserCompanyId } from '@/services/qaSubmissionService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import RectalTempEntry from '../RectalTempEntry';
import TrayWashEntry, { type TrayWashSubmitData } from '../TrayWashEntry';

/**
 * ProcessScopedShell — room-scoped QA checks (no machine picker).
 * Covers Tray Wash and Rectal Temperatures.
 */
const ProcessScopedShell: React.FC<{ initialTab?: 'wash' | 'rectal' }> = ({ initialTab = 'wash' }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const technicianName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || profile.email
    : '';

  const [tab, setTab] = useState<'wash' | 'rectal'>(initialTab);
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const resolveCompanyId = async () => profile?.company_id ?? (await getUserCompanyId());

  const handleTrayWash = async (data: TrayWashSubmitData) => {
    if (!technicianName) return toast.error('User profile not loaded yet');
    setSaving(true);
    try {
      const company_id = await resolveCompanyId();
      const filled = [data.firstCheck, data.secondCheck, data.thirdCheck].filter(
        (v): v is number => typeof v === 'number' && Number.isFinite(v)
      );
      const avg = filled.length ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;
      const payload = {
        company_id,
        machine_id: null,
        batch_id: null,
        check_date: data.washDate,
        check_time: new Date().toTimeString().split(' ')[0],
        day_of_incubation: 0,
        temperature: avg,
        humidity: 55,
        inspector_name: technicianName,
        entry_mode: 'room',
        candling_results: JSON.stringify({
          type: 'tray_wash',
          firstCheck: data.firstCheck,
          secondCheck: data.secondCheck,
          thirdCheck: data.thirdCheck,
          ppm_check_1: data.ppmChecks[0]?.ppm ?? null,
          ppm_check_2: data.ppmChecks[1]?.ppm ?? null,
          ppm_check_3: data.ppmChecks[2]?.ppm ?? null,
          ppm_check_4: data.ppmChecks[3]?.ppm ?? null,
          ppm_check_5: data.ppmChecks[4]?.ppm ?? null,
          ppm_check_1_time: data.ppmChecks[0]?.time || null,
          ppm_check_2_time: data.ppmChecks[1]?.time || null,
          ppm_check_3_time: data.ppmChecks[2]?.time || null,
          ppm_check_4_time: data.ppmChecks[3]?.time || null,
          ppm_check_5_time: data.ppmChecks[4]?.time || null,
        }),
      };
      const { error } = await supabase.from('qa_monitoring').insert(payload);
      if (error) throw error;
      toast.success('Tray wash log saved.');
      queryClient.invalidateQueries({ queryKey: ['qa_monitoring'] });
      queryClient.invalidateQueries({ queryKey: ['recent-qa-entries'] });
    } catch (e: any) {
      toast.error(`Failed to save: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRectalTemp = async (data: {
    location: string;
    temperature: number;
    checkTime: string;
    checkDate: string;
  }) => {
    if (!technicianName) return toast.error('User profile not loaded yet');
    setSaving(true);
    try {
      const company_id = await resolveCompanyId();
      const { error } = await supabase.from('qa_monitoring').insert({
        company_id,
        machine_id: null,
        batch_id: null,
        check_date: data.checkDate,
        check_time: data.checkTime || new Date().toTimeString().split(' ')[0],
        day_of_incubation: 0,
        temperature: data.temperature,
        humidity: 55,
        inspector_name: technicianName,
        entry_mode: 'room',
        candling_results: JSON.stringify({
          type: 'rectal_temperature',
          location: data.location,
          scope: 'room',
        }),
      });
      if (error) throw error;
      toast.success('Rectal temperature saved.');
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
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[240px]">
              <CardTitle className="text-lg flex items-center gap-2">
                <Waves className="h-5 w-5 text-primary" />
                Process / Room Checks
              </CardTitle>
              <CardDescription>
                Room-level QA — no machine required. Pick a date and start logging.
              </CardDescription>
            </div>
            <div className="space-y-1.5 min-w-[200px]">
              <Label className="text-xs">Check Date</Label>
              <DatePicker
                date={checkDate}
                onSelect={(d) =>
                  setCheckDate(d ? format(d, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0])
                }
                placeholder="Select date"
              />
            </div>
            <div className="space-y-1.5 min-w-[200px]">
              <Label className="text-xs">Technician</Label>
              <Input value={technicianName || 'Loading…'} disabled readOnly />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Tray Wash can be logged multiple times a day as inspections occur. Rectal temps are captured
          for Hatcher / Chick Room / Separator Room.
        </AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'wash' | 'rectal')}>
        <TabsList>
          <TabsTrigger value="wash" className="gap-1">
            <Waves className="h-3.5 w-3.5" /> Tray Wash
          </TabsTrigger>
          <TabsTrigger value="rectal" className="gap-1">
            <Thermometer className="h-3.5 w-3.5" /> Rectal Temperatures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wash" className="space-y-4 pt-4">
          <TrayWashEntry
            technicianName={technicianName}
            checkDate={checkDate}
            existingRow={null}
            onSubmit={handleTrayWash}
          />
        </TabsContent>

        <TabsContent value="rectal" className="space-y-4 pt-4">
          <RectalTempEntry
            technicianName={technicianName}
            checkDate={checkDate}
            machineId={null}
            onSubmit={handleRectalTemp}
          />
        </TabsContent>
      </Tabs>

      {saving && <div className="text-xs text-muted-foreground">Saving…</div>}
    </div>
  );
};

export default ProcessScopedShell;
