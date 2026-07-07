import { useState, useEffect } from 'react';
import { formatSetWeekLabel } from "@/hooks/useFlockWeekHouses";
import { FlockWeekHouseSwitcher } from "@/components/dashboard/FlockWeekHouseSwitcher";
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Syringe, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ClearsInjectedDataEntry from "@/components/dashboard/ClearsInjectedDataEntry";
import { useOfflineSubmit } from "@/hooks/useOfflineSubmit";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { fetchWithOfflineFallback, getOfflineData } from "@/lib/offlineDataCache";
import { PendingSyncBadge } from "@/components/ui/pending-sync-badge";
import type { House } from "@/hooks/useHousesData";
import { PendingSyncList } from "@/components/ui/pending-sync-list";

interface HouseInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  machine_number: string;
  house_number: string;
  set_date: string;
  expected_hatch_date: string;
  total_eggs_set: number;
  status: string;
  eggs_cleared: number | null;
  eggs_injected: number | null;
}

const ClearsInjectedEntryPage = () => {
  const { houseId } = useParams<{ houseId: string }>();
  const navigate = useNavigate();
  const [houseInfo, setHouseInfo] = useState<HouseInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
  const { submit: offlineSubmit } = useOfflineSubmit('batches', {
    invalidateQueries: ['batches', 'houses', 'dataCounts'],
  });

  useEffect(() => {
    if (houseId) {
      loadHouseInfo();
    }
  }, [houseId]);

  const loadHouseInfo = async () => {
    if (!houseId) return;
    
    try {
      const data = await fetchWithOfflineFallback(`batch-${houseId}`, async () => {
        try {
          const { data, error } = await supabase
            .from('batches')
            .select(`
              *,
              flocks(flock_name, flock_number, house_number),
              machines(id, machine_number, machine_type, location)
            `)
            .eq('id', houseId)
            .single();
          if (error) throw error;
          return data;
        } catch (error) {
          const house = (await getOfflineData<House[]>('houses'))?.find((cachedHouse) => cachedHouse.id === houseId);
          if (!house) throw error;
          return {
            id: house.id,
            batch_number: house.batch_number,
            set_date: house.set_date,
            expected_hatch_date: house.expected_hatch_date,
            total_eggs_set: house.total_eggs_set,
            status: house.status,
            eggs_cleared: null,
            eggs_injected: null,
            flocks: { flock_name: house.flock_name, flock_number: house.flock_number, house_number: house.house_number },
            machines: { machine_number: house.machine_number },
          };
        }
      });

      if (data) {
        // Extract house number from batch_number if not in flocks table
        let houseNumber = data.flocks?.house_number || '';
        if (!houseNumber && data.batch_number.includes('#')) {
          const parts = data.batch_number.split('#');
          houseNumber = parts[1]?.trim() || '1';
        }

        setHouseInfo({
          id: data.id,
          batch_number: data.batch_number,
          flock_name: data.flocks?.flock_name || '',
          flock_number: data.flocks?.flock_number || 0,
          machine_number: data.machines?.machine_number || '',
          house_number: houseNumber,
          set_date: data.set_date,
          expected_hatch_date: data.expected_hatch_date,
          total_eggs_set: data.total_eggs_set,
          status: data.status,
          eggs_cleared: (data as any).eggs_cleared,
          eggs_injected: data.eggs_injected
        });
      }
    } catch (error: any) {
      console.error("Error loading house:", error);
      toast({
        title: "Error loading house",
        description: `${error.message}. Please try refreshing the page.`,
        variant: "destructive"
      });
    }
  };

  const handleSave = async (values: { clear_number: number; injected_number: number; clears_technician_name?: string; clears_notes?: string }) => {
    if (!houseId) return;
    
    setSaving(true);
    try {
      await offlineSubmit({
        id: houseId,
        eggs_cleared: values.clear_number,
        eggs_injected: values.injected_number,
        clears_technician_name: values.clears_technician_name,
        clears_notes: values.clears_notes,
        updated_at: new Date().toISOString()
      }, 'update', {
        batchId: houseId,
        serverId: houseId,
      });

      toast({
        title: isOnline ? "Data saved successfully" : "Saved offline",
        description: isOnline
          ? "Clears and injected numbers have been updated"
          : "Clears and injected numbers will sync when back online"
      });

      setHouseInfo(prev => prev ? {
        ...prev,
        eggs_cleared: values.clear_number,
        eggs_injected: values.injected_number
      } : null);
    } catch (error: any) {
      toast({
        title: "Error saving data",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-800';
      case 'setting': return 'bg-blue-100 text-blue-800';
      case 'incubating': return 'bg-yellow-100 text-yellow-800';
      case 'hatching': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleBack = () => {
    navigate(`/data-entry/house/${houseId}`);
  };

  if (!houseInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading House Information</h3>
              <p className="text-gray-600">Please wait while we load the house details...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-4">
        
        {/* Main Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Data Entry
          </Button>
          
          {/* Page Title */}
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <Syringe className="h-8 w-8 text-blue-600" />
              Clears & Injected Data Entry
              <PendingSyncBadge table="batches" batchId={houseInfo.id} />
            </h1>
            <p className="text-gray-600">Record the number of cleared eggs and injected eggs for this batch.</p>
          </div>
          
          {/* Batch Info - Streamlined */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">
                House {houseInfo.batch_number}
              </h2>
              <Badge className={getStatusColor(houseInfo.status)}>
                {houseInfo.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Flock:</span> <span className="font-medium ml-1">{houseInfo.flock_number} - {houseInfo.flock_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Machine:</span> <span className="font-medium ml-1">{houseInfo.machine_number}</span>
              </div>
              <div>
                <span className="text-gray-600">Set Date:</span> <span className="font-medium ml-1">{formatLocalDate(houseInfo.set_date)}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Eggs:</span> <span className="font-medium ml-1">{houseInfo.total_eggs_set.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <PendingSyncList
          table="batches"
          batchId={houseInfo.id}
          title="Clears & Injected updates waiting to sync"
        />

        {/* Clears & Injected Data Entry Component */}
        <ClearsInjectedDataEntry 
          initialClear={houseInfo.eggs_cleared}
          initialInjected={houseInfo.eggs_injected}
          totalEggs={houseInfo.total_eggs_set}
          onSave={handleSave}
          saving={saving}
          context={{
            flockNumber: houseInfo.flock_number,
            flockName: houseInfo.flock_name,
            houseNumber: houseInfo.house_number
          }}
        />
      </div>
    </div>
  );
};

export default ClearsInjectedEntryPage;
