import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ResidueDataEntry from "@/components/dashboard/ResidueDataEntry";


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
  eggs_injected: number;
  status: string;
}

const ResidueEntryPage = () => {
  const { houseId } = useParams<{ houseId: string }>();
  const navigate = useNavigate();
  const [houseInfo, setHouseInfo] = useState<HouseInfo | null>(null);
  const [residueData, setResidueData] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    if (houseId) {
      loadHouseInfo();
      loadResidueData();
    }
  }, [houseId]);

  const loadHouseInfo = async () => {
    if (!houseId) return;
    
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        flocks(flock_name, flock_number, house_number),
        machines(id, machine_number, machine_type, location)
      `)
      .eq('id', houseId)
      .single();

    if (error) {
      console.error("Error loading house:", error);
      toast({
        title: "Error loading house",
        description: `${error.message}. Please try refreshing the page.`,
        variant: "destructive"
      });
      return;
    }
    
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
        eggs_injected: data.eggs_injected || 0,
        status: data.status
      });
    }
  };

  const loadResidueData = async () => {
    if (!houseId) return;
    
    const { data, error } = await supabase
      .from('residue_analysis')
      .select('*')
      .eq('batch_id', houseId);

    if (error) {
      toast({
        title: "Error loading residue data",
        description: error.message,
        variant: "destructive"
      });
    } else {
      // Transform database records to display format
      const transformedData = (data || []).map(dbRecord => {
        const TOTAL_EGGS = dbRecord.sample_size || 648;
        const calculatePercentage = (value: number) => Number(((value / TOTAL_EGGS) * 100).toFixed(2));
        
        return {
          id: dbRecord.id,
          name: houseInfo?.flock_name || '',
          flockNumber: houseInfo?.flock_number || 0,
          houseNumber: Number(houseInfo?.house_number) || 1,
          infertile: dbRecord.infertile_eggs || 0,
          infertilePercent: calculatePercentage(dbRecord.infertile_eggs || 0),
          chicks: TOTAL_EGGS - (dbRecord.infertile_eggs || 0) - (dbRecord.early_dead || 0) - (dbRecord.mid_dead || 0) - (dbRecord.late_dead || 0) - (dbRecord.malformed_chicks || 0) - (dbRecord.live_pip_number || 0) - (dbRecord.dead_pip_number || 0),
          earlyDeath: dbRecord.early_dead || 0,
          earlyDeathPercent: calculatePercentage(dbRecord.early_dead || 0),
          live: 0, // Not stored in DB
          livePercent: 0,
          dead: 0, // Not stored in DB
          deadPercent: 0,
          midDeath: dbRecord.mid_dead || 0,
          midDeathPercent: calculatePercentage(dbRecord.mid_dead || 0),
          lateDeath: dbRecord.late_dead || 0,
          lateDeathPercent: calculatePercentage(dbRecord.late_dead || 0),
          cullChicks: dbRecord.malformed_chicks || 0,
          handlingCracks: dbRecord.handling_cracks || 0,
          handlingCracksPercent: calculatePercentage(dbRecord.handling_cracks || 0),
          transferCrack: dbRecord.transfer_crack || 0,
          transferCrackPercent: calculatePercentage(dbRecord.transfer_crack || 0),
          contamination: dbRecord.contaminated_eggs || 0,
          contaminationPercent: calculatePercentage(dbRecord.contaminated_eggs || 0),
          mold: dbRecord.mold || 0,
          moldPercent: calculatePercentage(dbRecord.mold || 0),
          abnormal: dbRecord.abnormal || 0,
          abnormalPercent: calculatePercentage(dbRecord.abnormal || 0),
          brain: dbRecord.brain_defects || 0,
          brainPercent: calculatePercentage(dbRecord.brain_defects || 0),
          dryEgg: dbRecord.dry_egg || 0,
          dryEggPercent: calculatePercentage(dbRecord.dry_egg || 0),
          malpositioned: dbRecord.malpositioned || 0,
          malpositionedPercent: calculatePercentage(dbRecord.malpositioned || 0),
          upsideDown: dbRecord.upside_down || 0,
          upsideDownPercent: calculatePercentage(dbRecord.upside_down || 0),
          livePipNumber: dbRecord.live_pip_number || 0,
          deadPipNumber: dbRecord.dead_pip_number || 0,
          pipNumber: dbRecord.pip_number || 0,
          totalEggs: TOTAL_EGGS,
          sampleSize: dbRecord.sample_size || 648,
          fertileEggs: dbRecord.fertile_eggs || 0,
          hatchPercent: dbRecord.hatch_percent || 0,
          hofPercent: dbRecord.hof_percent || 0,
          hoiPercent: dbRecord.hoi_percent || 0,
          ifDevPercent: dbRecord.if_dev_percent || 0,
          technicianName: dbRecord.lab_technician || '',
          notes: dbRecord.notes || ''
        };
      });
      
      setResidueData(transformedData);
    }
  };

  const handleResidueDataUpdate = async (newData: any[]) => {
    // Save each record to database
    for (const record of newData) {
      try {
        const residueData = {
          batch_id: houseId,
          sample_size: record.sampleSize || 648,
          infertile_eggs: record.infertile || 0,
          fertile_eggs: record.fertileEggs || 0,
          // Save mortality fields separately
          early_dead: record.earlyDeath || 0,
          mid_dead: record.midDeath || 0,
          late_dead: record.lateDeath || 0,
          // Save PIP fields separately
          live_pip_number: record.livePipNumber || 0,
          dead_pip_number: record.deadPipNumber || 0,
          pip_number: record.pipNumber || 0,
          // Save other residue attributes
          malformed_chicks: record.cullChicks || 0,
          contaminated_eggs: record.contamination || 0,
          handling_cracks: record.handlingCracks || 0,
          transfer_crack: record.transferCrack || 0,
          mold: record.mold || 0,
          abnormal: record.abnormal || 0,
          brain_defects: record.brain || 0,
          dry_egg: record.dryEgg || 0,
          malpositioned: record.malpositioned || 0,
          upside_down: record.upsideDown || 0,
          // Calculate total residue count
          total_residue_count: (record.earlyDeath || 0) + (record.midDeath || 0) + 
                              (record.lateDeath || 0) + (record.cullChicks || 0),
          // Save hatchability metrics
          hatch_percent: record.hatchPercent,
          hof_percent: record.hofPercent,
          hoi_percent: record.hoiPercent,
          if_dev_percent: record.ifDevPercent,
          // Save technician and notes
          lab_technician: record.technicianName || null,
          notes: record.notes || null,
          analysis_date: new Date().toISOString().split('T')[0],
        };

        const { error } = await supabase
          .from('residue_analysis')
          .upsert(residueData, {
            onConflict: 'batch_id'
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving residue data:', error);
        toast({
          title: "Error",
          description: `Failed to save residue data: ${error.message}`,
          variant: "destructive"
        });
        return; // Stop processing on error
      }
    }
    
    // Reload from database after successful save
    await loadResidueData();
    
    toast({
      title: "Success",
      description: "Residue data saved successfully"
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
        
        {/* Header with Navigation */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Data Entry
          </Button>
          
          {/* Breadcrumb */}
          <div className="text-sm text-gray-600 mb-4">
            Data Entry &gt; House {houseInfo.batch_number} &gt; Residue Analysis
          </div>
          
          {/* House Context Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                  Residue Analysis - House {houseInfo.batch_number}
                </CardTitle>
                <Badge className={getStatusColor(houseInfo.status)}>
                  {houseInfo.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Flock</p>
                  <p className="font-medium">{houseInfo.flock_number} - {houseInfo.flock_name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Machine</p>
                  <p className="font-medium">{houseInfo.machine_number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Set Date</p>
                  <p className="font-medium">{new Date(houseInfo.set_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Eggs</p>
                  <p className="font-medium">{houseInfo.total_eggs_set.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Residue Data Entry Component */}
        <ResidueDataEntry 
          data={residueData} 
          onDataUpdate={handleResidueDataUpdate}
          batchInfo={{
            id: houseInfo.id,
            batch_number: houseInfo.batch_number,
            flock_name: houseInfo.flock_name,
            flock_number: houseInfo.flock_number,
            house_number: houseInfo.house_number,
            eggs_injected: houseInfo.eggs_injected
          }}
        />
      </div>
    </div>
  );
};

export default ResidueEntryPage;