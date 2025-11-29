import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Egg, Activity, AlertTriangle, Info, ArrowRightLeft, ArrowRight, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import EggPackDataEntry from "./EggPackDataEntry";
import FertilityDataEntry from "./FertilityDataEntry";
import QADataEntry from "./QADataEntry";
import ResidueDataEntry from "./ResidueDataEntry";
import HOIEntry from "./HOIEntry";
import TransferManager from "./TransferManager";
import { useBatchTransfers } from "@/hooks/useMachineTransfers";

interface BatchInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  machine_id: string;
  machine_number: string;
  machine_type: string;
  house_number: string;
  set_date: string;
  expected_hatch_date: string;
  total_eggs_set: number;
  status: string;
  eggs_injected: number;
  chicks_hatched: number;
  unit_id: string | null;
}

interface BatchDataEntryProps {
  batchId: string;
}

const BatchDataEntry = ({ batchId }: BatchDataEntryProps) => {
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [eggPackData, setEggPackData] = useState([]);
  const [fertilityData, setFertilityData] = useState([]);
  const [qaData, setQAData] = useState([]);
  const [residueData, setResidueData] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const { toast } = useToast();
  
  const { data: transfers, refetch: refetchTransfers } = useBatchTransfers(batchId);

  useEffect(() => {
    if (batchId) {
      loadBatchInfo();
      loadAllData();
    }
  }, [batchId]);

  const loadBatchInfo = async () => {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        flocks(flock_name, flock_number, house_number),
        machines(id, machine_number, machine_type, location)
      `)
      .eq('id', batchId)
      .single();

    if (error) {
      toast({
        title: "Error loading batch",
        description: error.message,
        variant: "destructive"
      });
    } else {
      // Extract house number from batch_number if not in flocks table
      let houseNumber = data.flocks?.house_number || '';
      if (!houseNumber && data.batch_number.includes('#')) {
        const parts = data.batch_number.split('#');
        houseNumber = parts[1]?.trim() || '1';
      }
      
      setBatchInfo({
        id: data.id,
        batch_number: data.batch_number,
        flock_name: data.flocks?.flock_name || '',
        flock_number: data.flocks?.flock_number || 0,
        machine_id: data.machine_id,
        machine_number: data.machines?.machine_number || '',
        machine_type: data.machines?.machine_type || 'setter',
        house_number: houseNumber,
        set_date: data.set_date,
        expected_hatch_date: data.expected_hatch_date,
        total_eggs_set: data.total_eggs_set,
        status: data.status,
        eggs_injected: data.eggs_injected ?? 0,
        chicks_hatched: data.chicks_hatched ?? 0,
        unit_id: data.unit_id,
      });
    }
  };

  const loadAllData = async () => {
    // Load all related data for this batch
    const [eggPackResult, fertilityResult, qaResult, residueResult] = await Promise.all([
      supabase.from('egg_pack_quality').select('*').eq('batch_id', batchId),
      supabase.from('fertility_analysis').select('*').eq('batch_id', batchId),
      supabase.from('qa_monitoring').select('*').eq('batch_id', batchId),
      supabase.from('residue_analysis').select('*').eq('batch_id', batchId)
    ]);

    if (eggPackResult.data) setEggPackData(eggPackResult.data);
    if (fertilityResult.data) setFertilityData(fertilityResult.data);
    if (qaResult.data) setQAData(qaResult.data);
    if (residueResult.data) setResidueData(residueResult.data);
  };

  const handleEggPackDataUpdate = async (newData: any[]) => {
    // For new records, add batch_id
    const dataWithBatchId = newData.map(record => ({
      ...record,
      batch_id: batchId
    }));
    
    setEggPackData(dataWithBatchId);
    toast({
      title: "Egg Pack Data Updated",
      description: "Data linked to current batch"
    });
  };

  const handleFertilityDataUpdate = async (newData: any[]) => {
    const dataWithBatchId = newData.map(record => ({
      ...record,
      batch_id: batchId
    }));
    
    setFertilityData(dataWithBatchId);
    toast({
      title: "Fertility Data Updated",
      description: "Data linked to current batch"
    });
  };

  const handleQADataUpdate = async (newData: any[]) => {
    const dataWithBatchId = newData.map(record => ({
      ...record,
      batch_id: batchId
    }));
    
    setQAData(dataWithBatchId);
    toast({
      title: "QA Data Updated",
      description: "Data linked to current batch"
    });
  };

  const handleResidueDataUpdate = async (newData: any[]) => {
    const dataWithBatchId = newData.map(record => ({
      ...record,
      batch_id: batchId
    }));
    
    setResidueData(dataWithBatchId);
    toast({
      title: "Residue Data Updated",
      description: "Data linked to current batch"
    });
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

  if (!batchInfo) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a House</h3>
          <p className="text-gray-600">Choose a house from the list above to start entering data.</p>
        </CardContent>
      </Card>
    );
  }

  const hoiPct = batchInfo.eggs_injected > 0
    ? Number(((batchInfo.chicks_hatched / batchInfo.eggs_injected) * 100).toFixed(2))
    : null;

  return (
    <div className="space-y-6">
      {/* House Info Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>House: {batchInfo.batch_number}</CardTitle>
            <Badge className={getStatusColor(batchInfo.status)}>
              {batchInfo.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Flock</p>
              <p className="font-medium">{batchInfo.flock_number} - {batchInfo.flock_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Machine</p>
              <p className="font-medium">{batchInfo.machine_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Set Date</p>
              <p className="font-medium">{new Date(batchInfo.set_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Eggs</p>
              <p className="font-medium">{batchInfo.total_eggs_set.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Eggs Injected</p>
              <p className="font-medium">{(batchInfo.eggs_injected ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Chicks Hatched</p>
              <p className="font-medium">{(batchInfo.chicks_hatched ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">HOI %</p>
              <p className="font-medium">{hoiPct == null ? "-" : `${hoiPct}%`}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embrex / HOI Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Embrex / HOI</CardTitle>
        </CardHeader>
        <CardContent>
          <HOIEntry
            batchId={batchInfo.id}
            eggsInjected={batchInfo.eggs_injected ?? 0}
            chicksHatched={batchInfo.chicks_hatched ?? 0}
            onUpdated={({ eggs_injected, chicks_hatched }) => {
              setBatchInfo((prev) => prev ? { ...prev, eggs_injected, chicks_hatched } as BatchInfo : prev);
            }}
          />
        </CardContent>
      </Card>

      {/* Machine Transfer Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Machine Transfer
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => setShowTransferModal(true)}
              disabled={batchInfo.status === 'completed' || batchInfo.status === 'cancelled'}
            >
              Record Transfer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Current Machine Info */}
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Machine</p>
                <p className="font-medium">{batchInfo.machine_number} ({batchInfo.machine_type})</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Set Date</p>
                <p className="font-medium">{new Date(batchInfo.set_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Transfer Timeline */}
          {transfers && transfers.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Transfer History</h4>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                
                {/* Set Date */}
                <div className="relative flex items-start gap-3 pb-4">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10">
                    <Calendar className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-medium">Set in {batchInfo.machine_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(batchInfo.set_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Transfers */}
                {transfers.map((t, idx) => (
                  <div key={t.id} className="relative flex items-start gap-3 pb-4">
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center z-10">
                      <ArrowRight className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium">
                        Transferred to {t.to_machine?.machine_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.transfer_date).toLocaleDateString()}
                        {t.days_in_previous_machine && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Day {t.days_in_previous_machine}
                          </Badge>
                        )}
                      </p>
                      {t.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No transfers recorded yet. Click "Record Transfer" when moving to hatcher.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Manager Modal */}
      <TransferManager
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        batchId={batchInfo.id}
        currentMachineId={batchInfo.machine_id}
        currentMachineNumber={batchInfo.machine_number}
        setDate={batchInfo.set_date}
        unitId={batchInfo.unit_id}
        onTransferComplete={() => refetchTransfers()}
      />

      {/* Data Entry Tabs */}
      <Tabs defaultValue="eggpack" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="eggpack" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Egg Pack
          </TabsTrigger>
          <TabsTrigger value="fertility" className="flex items-center gap-2">
            <Egg className="h-4 w-4" />
            Fertility
          </TabsTrigger>
          <TabsTrigger value="qa" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            QA
          </TabsTrigger>
          <TabsTrigger value="residue" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Residue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="eggpack">
          <EggPackDataEntry 
            data={eggPackData} 
            onDataUpdate={handleEggPackDataUpdate}
            batchInfo={{
              id: batchInfo.id,
              batch_number: batchInfo.batch_number,
              flock_name: batchInfo.flock_name,
              flock_number: batchInfo.flock_number,
              machine_number: batchInfo.machine_number,
              house_number: batchInfo.house_number
            }}
          />
        </TabsContent>

        <TabsContent value="fertility">
          <FertilityDataEntry 
            data={fertilityData} 
            onDataUpdate={handleFertilityDataUpdate}
            batchInfo={{
              id: batchInfo.id,
              batch_number: batchInfo.batch_number,
              flock_name: batchInfo.flock_name,
              flock_number: batchInfo.flock_number,
              set_date: batchInfo.set_date
            }}
          />
        </TabsContent>

        <TabsContent value="qa">
          <QADataEntry 
            data={qaData} 
            onDataUpdate={handleQADataUpdate}
            batchInfo={{
              id: batchInfo.id,
              batch_number: batchInfo.batch_number,
              flock_name: batchInfo.flock_name,
              flock_number: batchInfo.flock_number,
              machine_id: batchInfo.machine_id,
              house_number: batchInfo.house_number
            }}
          />
        </TabsContent>

        <TabsContent value="residue">
          <ResidueDataEntry 
            data={residueData} 
            onDataUpdate={handleResidueDataUpdate}
            batchInfo={{
              id: batchInfo.id,
              batch_number: batchInfo.batch_number,
              flock_name: batchInfo.flock_name,
              flock_number: batchInfo.flock_number,
              house_number: batchInfo.house_number,
              eggs_injected: batchInfo.eggs_injected || 0
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatchDataEntry;
