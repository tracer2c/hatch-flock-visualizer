import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Database, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DataSeeder = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const { toast } = useToast();

  // Reference data from the fertility analysis image
  const referenceFlocks = [
    { number: 6367, name: "Bertha Valley", age: 56, house: "H1" },
    { number: 6391, name: "Callaghan Valley", age: 52, house: "H2" },
    { number: 6393, name: "Diamond Valley", age: 51, house: "H3" },
    { number: 6395, name: "Fraser Valley", age: 51, house: "H4" },
    { number: 6434, name: "Harrison Valley", age: 47, house: "H5" },
    { number: 6444, name: "Nicola Valley", age: 45, house: "H6" },
    { number: 6447, name: "Okanagan Valley", age: 45, house: "H7" },
    { number: 6451, name: "Peace Valley", age: 44, house: "H8" },
    { number: 6459, name: "Shuswap Valley", age: 43, house: "H9" },
    { number: 6461, name: "Thompson Valley", age: 43, house: "H10" },
    { number: 6463, name: "Bulkley Valley", age: 42, house: "H11" },
    { number: 6474, name: "Columbia Valley", age: 41, house: "H12" },
  ];

  const machines = [
    { number: "INC-001", type: "setter", capacity: 50400, location: "Building A" },
    { number: "INC-002", type: "setter", capacity: 50400, location: "Building A" },
    { number: "INC-003", type: "setter", capacity: 50400, location: "Building B" },
    { number: "INC-004", type: "setter", capacity: 50400, location: "Building B" },
    { number: "HAT-001", type: "hatcher", capacity: 14400, location: "Building C" },
    { number: "HAT-002", type: "hatcher", capacity: 14400, location: "Building C" },
    { number: "HAT-003", type: "hatcher", capacity: 14400, location: "Building C" },
    { number: "CMB-001", type: "combo", capacity: 45000, location: "Building D" },
  ];

  const fertilityData = [
    { flockNumber: 6367, sampleSize: 648, fertile: 580, infertile: 68, earlyDead: 45, lateDead: 89, cullChicks: 12 },
    { flockNumber: 6391, sampleSize: 648, fertile: 598, infertile: 50, earlyDead: 38, lateDead: 75, cullChicks: 8 },
    { flockNumber: 6393, sampleSize: 648, fertile: 612, infertile: 36, earlyDead: 41, lateDead: 68, cullChicks: 15 },
    { flockNumber: 6395, sampleSize: 648, fertile: 601, infertile: 47, earlyDead: 39, lateDead: 82, cullChicks: 11 },
    { flockNumber: 6434, sampleSize: 648, fertile: 588, infertile: 60, earlyDead: 43, lateDead: 91, cullChicks: 9 },
    { flockNumber: 6444, sampleSize: 648, fertile: 595, infertile: 53, earlyDead: 37, lateDead: 78, cullChicks: 13 },
    { flockNumber: 6447, sampleSize: 648, fertile: 609, infertile: 39, earlyDead: 35, lateDead: 71, cullChicks: 7 },
    { flockNumber: 6451, sampleSize: 648, fertile: 583, infertile: 65, earlyDead: 47, lateDead: 85, cullChicks: 14 },
    { flockNumber: 6459, sampleSize: 648, fertile: 592, infertile: 56, earlyDead: 40, lateDead: 76, cullChicks: 10 },
    { flockNumber: 6461, sampleSize: 648, fertile: 606, infertile: 42, earlyDead: 33, lateDead: 69, cullChicks: 6 },
    { flockNumber: 6463, sampleSize: 648, fertile: 597, infertile: 51, earlyDead: 42, lateDead: 73, cullChicks: 12 },
    { flockNumber: 6474, sampleSize: 648, fertile: 584, infertile: 64, earlyDead: 46, lateDead: 88, cullChicks: 16 },
  ];

  const calculateArrivalDate = (ageWeeks: number) => {
    const today = new Date();
    const weeksAgo = ageWeeks * 7;
    const arrivalDate = new Date(today.getTime() - (weeksAgo * 24 * 60 * 60 * 1000));
    return arrivalDate.toISOString().split('T')[0];
  };

  const calculateBatchDates = (index: number) => {
    const today = new Date();
    const setDate = new Date(today.getTime() - ((21 - index * 2) * 24 * 60 * 60 * 1000));
    const hatchDate = new Date(setDate.getTime() + (21 * 24 * 60 * 60 * 1000));
    return {
      setDate: setDate.toISOString().split('T')[0],
      hatchDate: hatchDate.toISOString().split('T')[0]
    };
  };

  const updateProgress = (newProgress: number, newStatus: string) => {
    setProgress(newProgress);
    setStatus(newStatus);
  };

  const seedDatabase = async () => {
    setIsSeeding(true);
    setProgress(0);

    try {
      // Step 1: Create flocks
      updateProgress(10, 'Creating flocks...');
      for (const flock of referenceFlocks) {
        const { error } = await supabase.from('flocks').insert({
          flock_number: flock.number,
          flock_name: flock.name,
          house_number: flock.house,
          age_weeks: flock.age,
          breed: 'breeder',
          arrival_date: calculateArrivalDate(flock.age),
          total_birds: 25000 + Math.floor(Math.random() * 10000), // Random between 25k-35k
          notes: `Commercial breeder flock - ${flock.name}`
        });
        
        if (error) throw error;
      }

      // Step 2: Create machines
      updateProgress(30, 'Creating incubator machines...');
      for (const machine of machines) {
        const { error } = await supabase.from('machines').insert({
          machine_number: machine.number,
          machine_type: machine.type as 'setter' | 'hatcher' | 'combo',
          capacity: machine.capacity,
          location: machine.location,
          status: 'available',
          notes: `${machine.type.charAt(0).toUpperCase() + machine.type.slice(1)} incubator`
        });
        
        if (error) throw error;
      }

      // Step 3: Get created flocks and machines
      updateProgress(50, 'Loading created data...');
      const { data: flocksData } = await supabase.from('flocks').select('*');
      const { data: machinesData } = await supabase.from('machines').select('*');

      if (!flocksData || !machinesData) throw new Error('Failed to load created data');

      // Step 4: Create batches
      updateProgress(60, 'Creating active batches...');
      const createdBatches = [];
      
      for (let i = 0; i < Math.min(8, flocksData.length); i++) {
        const flock = flocksData[i];
        const machine = machinesData[i % machinesData.length];
        const dates = calculateBatchDates(i);
        
        const batchNumber = `${flock.flock_number}-2025-${String(1000 + i).slice(-3)}`;
        
        const { data: batchData, error } = await supabase.from('batches').insert({
          batch_number: batchNumber,
          flock_id: flock.id,
          machine_id: machine.id,
          set_date: dates.setDate,
          expected_hatch_date: dates.hatchDate,
          total_eggs_set: 45000 + Math.floor(Math.random() * 10000), // 45k-55k eggs
          status: i < 2 ? 'completed' : i < 4 ? 'hatching' : i < 6 ? 'incubating' : 'setting',
          notes: `Production batch from ${flock.flock_name}`
        }).select().single();
        
        if (error) throw error;
        createdBatches.push({ ...batchData, flockNumber: flock.flock_number });
      }

      // Step 5: Add fertility analysis data
      updateProgress(80, 'Adding fertility analysis data...');
      for (const batch of createdBatches) {
        const fertilityRecord = fertilityData.find(f => f.flockNumber === batch.flockNumber);
        if (fertilityRecord) {
          const analysisDate = new Date(batch.set_date);
          analysisDate.setDate(analysisDate.getDate() + 7); // Day 7 analysis

          const { error } = await supabase.from('fertility_analysis').insert({
            batch_id: batch.id,
            analysis_date: analysisDate.toISOString().split('T')[0],
            sample_size: fertilityRecord.sampleSize,
            fertile_eggs: fertilityRecord.fertile,
            infertile_eggs: fertilityRecord.infertile,
            early_dead: fertilityRecord.earlyDead,
            late_dead: fertilityRecord.lateDead,
            cull_chicks: fertilityRecord.cullChicks,
            fertility_percent: Math.round((fertilityRecord.fertile / fertilityRecord.sampleSize) * 100 * 100) / 100,
            hatch_percent: Math.round(((fertilityRecord.fertile - fertilityRecord.earlyDead - fertilityRecord.lateDead) / fertilityRecord.sampleSize) * 100 * 100) / 100,
            hof_percent: Math.round(((fertilityRecord.fertile - fertilityRecord.earlyDead - fertilityRecord.lateDead) / fertilityRecord.fertile) * 100 * 100) / 100,
            technician_name: 'System Generated',
            notes: 'Reference data from fertility analysis report'
          });

          if (error) throw error;
        }
      }

      // Step 6: Create sample SOPs and checklist items
      updateProgress(90, 'Creating sample SOPs and checklist items...');
      
      // Create SOP templates
      const sopTemplates = [
        {
          title: 'Daily Incubator Check',
          category: 'daily_checklist',
          description: 'Standard daily monitoring procedures for incubators'
        },
        {
          title: 'Day 7 Candling Protocol',
          category: 'candling',
          day_of_incubation: 7,
          description: 'First candling procedure to check fertility and early development'
        },
        {
          title: 'Day 14 Second Candling',
          category: 'candling', 
          day_of_incubation: 14,
          description: 'Second candling to assess development progress'
        },
        {
          title: 'Day 18 Transfer Protocol',
          category: 'transfer',
          day_of_incubation: 18,
          description: 'Transfer eggs from setter to hatcher procedure'
        }
      ];

      for (const sop of sopTemplates) {
        const { error } = await supabase.from('sop_templates').insert(sop);
        if (error) throw error;
      }

      // Create daily checklist items
      const checklistItems = [
        {
          title: 'Temperature Check',
          description: 'Record incubator temperature and verify within range',
          order_index: 1,
          is_required: true,
          applicable_days: Array.from({length: 21}, (_, i) => i + 1)
        },
        {
          title: 'Humidity Check', 
          description: 'Record humidity levels and adjust if necessary',
          order_index: 2,
          is_required: true,
          applicable_days: Array.from({length: 21}, (_, i) => i + 1)
        },
        {
          title: 'Turning Verification',
          description: 'Verify automatic turning system is functioning',
          order_index: 3,
          is_required: true,
          applicable_days: Array.from({length: 18}, (_, i) => i + 1) // Days 1-18 only
        },
        {
          title: 'First Candling',
          description: 'Perform fertility check and remove clear eggs',
          order_index: 4,
          is_required: true,
          applicable_days: [7]
        },
        {
          title: 'Second Candling',
          description: 'Check development progress and remove late deads',
          order_index: 5,
          is_required: true,
          applicable_days: [14]
        },
        {
          title: 'Transfer to Hatcher',
          description: 'Move fertile eggs to hatching trays',
          order_index: 6,
          is_required: true,
          applicable_days: [18]
        }
      ];

      for (const item of checklistItems) {
        const { error } = await supabase.from('daily_checklist_items').insert(item);
        if (error) throw error;
      }

      updateProgress(100, 'Database seeding completed successfully!');
      
      toast({
        title: "Database Seeded Successfully",
        description: `Created ${referenceFlocks.length} flocks, ${machines.length} machines, ${Math.min(8, referenceFlocks.length)} batches, and sample data.`,
      });

    } catch (error: any) {
      toast({
        title: "Seeding Failed",
        description: error.message,
        variant: "destructive"
      });
      updateProgress(0, 'Seeding failed');
    } finally {
      setIsSeeding(false);
    }
  };

  const clearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }

    setIsSeeding(true);
    setStatus('Clearing database...');

    try {
      // Delete in reverse dependency order
      await supabase.from('fertility_analysis').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('checklist_completions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('daily_checklist_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sop_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('flocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('machines').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      toast({
        title: "Database Cleared",
        description: "All data has been removed from the database.",
      });
      setStatus('Database cleared');
    } catch (error: any) {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Seeder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Populate the database with reference data from the fertility analysis report including:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>12 commercial breeder flocks (6367-6474)</li>
            <li>8 incubator machines (setters, hatchers, combo)</li>
            <li>Active batches with realistic timelines</li>
            <li>Historical fertility analysis data</li>
            <li>Sample SOPs and daily checklist items</li>
          </ul>
        </div>

        {isSeeding && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{status}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={seedDatabase} 
            disabled={isSeeding}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Seed Database
          </Button>
          
          <Button 
            onClick={clearDatabase} 
            disabled={isSeeding}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Clear All Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataSeeder;