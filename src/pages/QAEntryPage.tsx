import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, Info, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QADataEntry from "@/components/dashboard/QADataEntry";
import { submitMachineLevelQA } from "@/services/qaSubmissionService";
import type { OccupancyInfo } from "@/utils/setterPositionMapping";


interface HouseInfo {
  id: string;
  batch_number: string;
  flock_name: string;
  flock_number: number;
  machine_id: string;
  machine_number: string;
  house_number: string;
  set_date: string;
  expected_hatch_date: string;
  total_eggs_set: number;
  status: string;
  setter_mode?: 'single_setter' | 'multi_setter' | null;
}

const QAEntryPage = () => {
  const { houseId } = useParams<{ houseId: string }>();
  const navigate = useNavigate();
  const [houseInfo, setHouseInfo] = useState<HouseInfo | null>(null);
  const [qaData, setQAData] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    if (houseId) {
      loadHouseInfo();
      loadQAData();
    }
  }, [houseId]);

  const loadHouseInfo = async () => {
    if (!houseId) return;
    
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        flocks(flock_name, flock_number, house_number),
        machines(id, machine_number, machine_type, location, setter_mode)
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
        machine_id: data.machine_id,
        machine_number: data.machines?.machine_number || '',
        house_number: houseNumber,
        set_date: data.set_date,
        expected_hatch_date: data.expected_hatch_date,
        total_eggs_set: data.total_eggs_set,
        status: data.status,
        setter_mode: data.machines?.setter_mode || null
      });
    }
  };

  const loadQAData = async () => {
    if (!houseId) return;
    
    const { data: dbRecords, error } = await supabase
      .from('qa_monitoring')
      .select('*')
      .eq('batch_id', houseId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading QA data",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    // Transform database records back to UI format
    const transformedData = (dbRecords || []).map(record => {
      // Parse candling_results JSON if it exists
      const candlingData = record.candling_results ? JSON.parse(record.candling_results) : {};
      const recordType = candlingData.type;

      // Base properties all records share
      const baseProps = {
        id: record.id,
        technicianName: record.inspector_name,
        notes: record.notes,
        checkDate: record.check_date,
        timestamp: record.created_at
      };

      // Transform based on record type
      if (recordType === 'setter_temperature_18point') {
        return {
          ...baseProps,
          type: 'setter_temperature_18point',
          setterNumber: candlingData.setterNumber,
          // 18 temperature points
          temp_front_top_left: record.temp_front_top_left,
          temp_front_top_right: record.temp_front_top_right,
          temp_front_mid_left: record.temp_front_mid_left,
          temp_front_mid_right: record.temp_front_mid_right,
          temp_front_bottom_left: record.temp_front_bottom_left,
          temp_front_bottom_right: record.temp_front_bottom_right,
          temp_middle_top_left: record.temp_middle_top_left,
          temp_middle_top_right: record.temp_middle_top_right,
          temp_middle_mid_left: record.temp_middle_mid_left,
          temp_middle_mid_right: record.temp_middle_mid_right,
          temp_middle_bottom_left: record.temp_middle_bottom_left,
          temp_middle_bottom_right: record.temp_middle_bottom_right,
          temp_back_top_left: record.temp_back_top_left,
          temp_back_top_right: record.temp_back_top_right,
          temp_back_mid_left: record.temp_back_mid_left,
          temp_back_mid_right: record.temp_back_mid_right,
          temp_back_bottom_left: record.temp_back_bottom_left,
          temp_back_bottom_right: record.temp_back_bottom_right,
          // Calculated averages
          temp_avg_overall: record.temp_avg_overall,
          temp_avg_front: record.temp_avg_front,
          temp_avg_middle: record.temp_avg_middle,
          temp_avg_back: record.temp_avg_back,
          isWithinRange: record.temp_avg_overall >= 99.5 && record.temp_avg_overall <= 100.5
        };
      }

      if (recordType === 'setter_temperature') {
        return {
          ...baseProps,
          type: 'setter_temperature',
          setterNumber: candlingData.setterNumber,
          timeOfDay: candlingData.timeOfDay,
          leftTemps: candlingData.leftSide || {},
          rightTemps: candlingData.rightSide || {},
          leftSide: candlingData.leftSide || {},
          rightSide: candlingData.rightSide || {},
          isWithinRange: (candlingData.leftSide?.average >= 99.5 && 
                         candlingData.leftSide?.average <= 100.5 && 
                         candlingData.rightSide?.average >= 99.5 && 
                         candlingData.rightSide?.average <= 100.5)
        };
      }

      if (recordType === 'rectal_temperature') {
        return {
          ...baseProps,
          type: 'rectal_temperature',
          location: candlingData.location,
          temperature: record.temperature,
          checkTime: record.check_time,
          isWithinRange: record.temperature >= 104 && record.temperature <= 106
        };
      }

      if (recordType === 'tray_wash_temperature') {
        return {
          ...baseProps,
          type: 'tray_wash_temperature',
          firstCheck: candlingData.firstCheck,
          secondCheck: candlingData.secondCheck,
          thirdCheck: candlingData.thirdCheck,
          allPassed: candlingData.allPassed,
          washDate: record.check_date
        };
      }

      if (recordType === 'cull_check') {
        return {
          ...baseProps,
          type: 'cull_check',
          flockNumber: candlingData.flockNumber,
          maleCount: candlingData.maleCount,
          femaleCount: candlingData.femaleCount,
          totalCulls: record.mortality_count,
          defectType: candlingData.defectType
        };
      }

      if (recordType === 'specific_gravity') {
        return {
          ...baseProps,
          type: 'specific_gravity',
          flockNumber: candlingData.flockNumber,
          age: candlingData.age,
          floatPercentage: candlingData.floatPercentage,
          isGoodQuality: candlingData.isGoodQuality,
          testDate: record.check_date
        };
      }

      if (recordType === 'setter_angles') {
        return {
          ...baseProps,
          type: 'setter_angle',
          setterNumber: candlingData.setterNumber,
          topLeft: record.angle_top_left,
          midLeft: record.angle_mid_left,
          bottomLeft: record.angle_bottom_left,
          topRight: record.angle_top_right,
          midRight: record.angle_mid_right,
          bottomRight: record.angle_bottom_right,
          angles: {
            topLeft: record.angle_top_left,
            midLeft: record.angle_mid_left,
            bottomLeft: record.angle_bottom_left,
            topRight: record.angle_top_right,
            midRight: record.angle_mid_right,
            bottomRight: record.angle_bottom_right
          },
          leftAverage: (record.angle_top_left + record.angle_mid_left + record.angle_bottom_left) / 3,
          rightAverage: (record.angle_top_right + record.angle_mid_right + record.angle_bottom_right) / 3
        };
      }

      if (recordType === 'hatch_progression') {
        return {
          ...baseProps,
          type: 'hatch_progression',
          flockNumber: candlingData.flockNumber || '',
          totalPulled: candlingData.totalPulled,
          goodChicks: candlingData.goodChicks,
          cullChicks: candlingData.cullChicks,
          unhatched: candlingData.unhatched,
          timeOfPull: candlingData.timeOfPull,
          hatchDate: record.check_date
        };
      }

      if (recordType === 'moisture_loss') {
        return {
          ...baseProps,
          type: 'moisture_loss',
          flockNumber: candlingData.flockNumber || '',
          initialWeight: candlingData.initialWeight,
          currentWeight: candlingData.currentWeight,
          percentLoss: candlingData.percentLoss,
          targetRange: candlingData.targetRange,
          testDate: record.check_date
        };
      }

      // Fallback for records without type
      return {
        ...baseProps,
        type: null,
        temperature: record.temperature,
        humidity: record.humidity,
        day_of_incubation: record.day_of_incubation
      };
    });

    setQAData(transformedData);
  };

  // Handle machine-level QA submission for multi-setter machines
  const handleMachineLevelSubmit = async (submitData: {
    temperatures: Record<string, number>;
    averages: { overall: number | null; front: number | null; middle: number | null; back: number | null };
    checkDate: string;
    positionOccupancy: Map<string, OccupancyInfo>;
    technicianName: string;
    notes: string;
    machineId: string;
  }) => {
    try {
      const result = await submitMachineLevelQA(
        {
          machine_id: submitData.machineId,
          inspector_name: submitData.technicianName,
          check_date: submitData.checkDate,
          check_time: new Date().toISOString().split('T')[1].split('.')[0],
          day_of_incubation: 0,
          temperature: submitData.averages.overall || 0,
          humidity: 0,
          notes: submitData.notes || null,
          temperatures: submitData.temperatures,
          temp_avg_overall: submitData.averages.overall,
          temp_avg_front: submitData.averages.front,
          temp_avg_middle: submitData.averages.middle,
          temp_avg_back: submitData.averages.back
        },
        submitData.positionOccupancy
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "Machine-Level QA Saved",
        description: `18-point temperature reading saved with position-level flock linkage`
      });

      // Reload data from database
      await loadQAData();
    } catch (error: any) {
      console.error('Error saving machine-level QA:', error);
      toast({
        title: "Error Saving QA Data",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleQADataUpdate = async (newData: any[]) => {
    try {
      // Map QA records with proper database schema
      const qaRecords = newData.map(record => {
        const baseRecord = {
          batch_id: houseId,
          machine_id: houseInfo?.machine_id || null,
          inspector_name: record.technicianName || '',
          check_date: record.checkDate || record.testDate || record.washDate || new Date().toISOString().split('T')[0],
          check_time: record.checkTime || new Date().toISOString().split('T')[1].split('.')[0],
          day_of_incubation: record.dayOfIncubation || 0,
          temperature: record.temperature || 0,
          humidity: record.humidity || 0,
          notes: record.notes || null,
          entry_mode: 'house' // Single-setter/house-level entry
        };

        // Add type-specific fields
        if (record.type === 'setter_temperature_18point') {
          return {
            ...baseRecord,
            temperature: record.temp_avg_overall || 0,
            // 18 temperature point columns
            temp_front_top_left: record.temp_front_top_left,
            temp_front_top_right: record.temp_front_top_right,
            temp_front_mid_left: record.temp_front_mid_left,
            temp_front_mid_right: record.temp_front_mid_right,
            temp_front_bottom_left: record.temp_front_bottom_left,
            temp_front_bottom_right: record.temp_front_bottom_right,
            temp_middle_top_left: record.temp_middle_top_left,
            temp_middle_top_right: record.temp_middle_top_right,
            temp_middle_mid_left: record.temp_middle_mid_left,
            temp_middle_mid_right: record.temp_middle_mid_right,
            temp_middle_bottom_left: record.temp_middle_bottom_left,
            temp_middle_bottom_right: record.temp_middle_bottom_right,
            temp_back_top_left: record.temp_back_top_left,
            temp_back_top_right: record.temp_back_top_right,
            temp_back_mid_left: record.temp_back_mid_left,
            temp_back_mid_right: record.temp_back_mid_right,
            temp_back_bottom_left: record.temp_back_bottom_left,
            temp_back_bottom_right: record.temp_back_bottom_right,
            // Calculated averages
            temp_avg_overall: record.temp_avg_overall,
            temp_avg_front: record.temp_avg_front,
            temp_avg_middle: record.temp_avg_middle,
            temp_avg_back: record.temp_avg_back,
            candling_results: JSON.stringify({
              type: 'setter_temperature_18point',
              setterNumber: record.setterNumber
            })
          };
        }

        if (record.type === 'setter_temperature') {
          return {
            ...baseRecord,
            temperature: record.leftTemps?.average || record.rightTemps?.average || 0,
            candling_results: JSON.stringify({
              type: 'setter_temperature',
              setterNumber: record.setterNumber,
              timeOfDay: record.timeOfDay,
              leftSide: record.leftTemps,
              rightSide: record.rightTemps
            })
          };
        }
        
        if (record.type === 'rectal_temperature') {
          return {
            ...baseRecord,
            temperature: record.temperature,
            candling_results: JSON.stringify({
              type: 'rectal_temperature',
              location: record.location
            })
          };
        }

        if (record.type === 'tray_wash_temperature') {
          return {
            ...baseRecord,
            temperature: (record.firstCheck + record.secondCheck + record.thirdCheck) / 3,
            candling_results: JSON.stringify({
              type: 'tray_wash_temperature',
              firstCheck: record.firstCheck,
              secondCheck: record.secondCheck,
              thirdCheck: record.thirdCheck,
              allPassed: record.allPassed
            })
          };
        }

        if (record.type === 'cull_check') {
          return {
            ...baseRecord,
            mortality_count: record.totalCulls,
            candling_results: JSON.stringify({
              type: 'cull_check',
              flockNumber: record.flockNumber,
              maleCount: record.maleCount,
              femaleCount: record.femaleCount,
              defectType: record.defectType
            })
          };
        }

        if (record.type === 'specific_gravity') {
          return {
            ...baseRecord,
            candling_results: JSON.stringify({
              type: 'specific_gravity',
              flockNumber: record.flockNumber,
              age: record.age,
              floatPercentage: record.floatPercentage,
              isGoodQuality: record.isGoodQuality
            })
          };
        }

        if (record.type === 'setter_angles') {
          return {
            ...baseRecord,
            angle_top_left: record.topLeft,
            angle_mid_left: record.midLeft,
            angle_bottom_left: record.bottomLeft,
            angle_top_right: record.topRight,
            angle_mid_right: record.midRight,
            angle_bottom_right: record.bottomRight,
            candling_results: JSON.stringify({
              type: 'setter_angles',
              setterNumber: record.setterNumber
            })
          };
        }

        if (record.type === 'hatch_progression') {
          return {
            ...baseRecord,
            candling_results: JSON.stringify({
              type: 'hatch_progression',
              totalPulled: record.totalPulled,
              goodChicks: record.goodChicks,
              cullChicks: record.cullChicks,
              unhatched: record.unhatched,
              timeOfPull: record.timeOfPull
            })
          };
        }

        if (record.type === 'moisture_loss') {
          return {
            ...baseRecord,
            candling_results: JSON.stringify({
              type: 'moisture_loss',
              initialWeight: record.initialWeight,
              currentWeight: record.currentWeight,
              percentLoss: record.percentLoss,
              targetRange: record.targetRange
            })
          };
        }

        return baseRecord;
      });

      // Insert into database
      const { error } = await supabase
        .from('qa_monitoring')
        .insert(qaRecords);

      if (error) throw error;

      // Update local state
      setQAData(newData);
      
      toast({
        title: "QA Data Saved",
        description: "Quality assurance data saved successfully to database"
      });

      // Reload data from database
      await loadQAData();

    } catch (error: any) {
      console.error('Error saving QA data:', error);
      toast({
        title: "Error Saving QA Data",
        description: error.message,
        variant: "destructive"
      });
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
            Data Entry &gt; House {houseInfo.batch_number} &gt; Quality Assurance
          </div>
          
          {/* House Context Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <Activity className="h-6 w-6 text-purple-600" />
                  Quality Assurance - House {houseInfo.batch_number}
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

        {/* Multi-Setter Mode Indicator */}
        {houseInfo.setter_mode === 'multi_setter' && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-sm">
                <Settings className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">Multi-Setter Mode Active</span>
                <span className="text-muted-foreground">- QA readings will be linked to specific flocks at each position</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QA Data Entry Component */}
        <QADataEntry 
          data={qaData} 
          onDataUpdate={handleQADataUpdate}
          batchInfo={{
            id: houseInfo.id,
            batch_number: houseInfo.batch_number,
            flock_name: houseInfo.flock_name,
            flock_number: houseInfo.flock_number,
            machine_id: houseInfo.machine_id,
            house_number: houseInfo.house_number
          }}
          machineSetterMode={houseInfo.setter_mode}
          onMachineLevelSubmit={handleMachineLevelSubmit}
        />
      </div>
    </div>
  );
};

export default QAEntryPage;