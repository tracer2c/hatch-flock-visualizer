import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Download, Upload, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DataCleanup = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const clearFlockAndHouseData = async () => {
    setIsDeleting(true);
    try {
      // Delete in correct order due to foreign key constraints
      const { error: wtError } = await supabase.from('weight_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (wtError) throw new Error(`Failed to delete weight tracking: ${wtError.message}`);

      const { error: ccError } = await supabase.from('checklist_completions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (ccError) throw new Error(`Failed to delete checklist completions: ${ccError.message}`);

      const { error: rasError } = await supabase.from('residue_analysis_schedule').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (rasError) throw new Error(`Failed to delete residue analysis schedule: ${rasError.message}`);

      const { error: raError } = await supabase.from('residue_analysis').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (raError) throw new Error(`Failed to delete residue analysis: ${raError.message}`);

      const { error: qaError } = await supabase.from('qa_monitoring').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (qaError) throw new Error(`Failed to delete QA monitoring: ${qaError.message}`);

      const { error: faError } = await supabase.from('fertility_analysis').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (faError) throw new Error(`Failed to delete fertility analysis: ${faError.message}`);

      const { error: epqError } = await supabase.from('egg_pack_quality').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (epqError) throw new Error(`Failed to delete egg pack quality: ${epqError.message}`);

      const { error: sgtError } = await supabase.from('specific_gravity_tests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (sgtError) throw new Error(`Failed to delete specific gravity tests: ${sgtError.message}`);

      const { error: batchError } = await supabase.from('batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (batchError) throw new Error(`Failed to delete batches: ${batchError.message}`);

      const { error: flockError } = await supabase.from('flocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (flockError) throw new Error(`Failed to delete flocks: ${flockError.message}`);

      toast({
        title: "Flock & house data cleared",
        description: "All flock and house data has been removed (machines and settings preserved)"
      });

      // Reload the page to refresh all data
      window.location.reload();
    } catch (error: any) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error clearing data",
        description: error.message || "There was an error clearing the flock and house data",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const clearSampleData = async () => {
    setIsDeleting(true);
    try {
      // Delete in correct order due to foreign key constraints
      const { error: wtError } = await supabase.from('weight_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (wtError) throw new Error(`Failed to delete weight tracking: ${wtError.message}`);

      const { error: ccError } = await supabase.from('checklist_completions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (ccError) throw new Error(`Failed to delete checklist completions: ${ccError.message}`);

      const { error: rasError } = await supabase.from('residue_analysis_schedule').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (rasError) throw new Error(`Failed to delete residue analysis schedule: ${rasError.message}`);

      const { error: raError } = await supabase.from('residue_analysis').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (raError) throw new Error(`Failed to delete residue analysis: ${raError.message}`);

      const { error: qaError } = await supabase.from('qa_monitoring').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (qaError) throw new Error(`Failed to delete QA monitoring: ${qaError.message}`);

      const { error: faError } = await supabase.from('fertility_analysis').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (faError) throw new Error(`Failed to delete fertility analysis: ${faError.message}`);

      const { error: epqError } = await supabase.from('egg_pack_quality').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (epqError) throw new Error(`Failed to delete egg pack quality: ${epqError.message}`);

      const { error: sgtError } = await supabase.from('specific_gravity_tests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (sgtError) throw new Error(`Failed to delete specific gravity tests: ${sgtError.message}`);

      const { error: batchError } = await supabase.from('batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (batchError) throw new Error(`Failed to delete batches: ${batchError.message}`);

      const { error: machineError } = await supabase.from('machines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (machineError) throw new Error(`Failed to delete machines: ${machineError.message}`);

      const { error: flockError } = await supabase.from('flocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (flockError) throw new Error(`Failed to delete flocks: ${flockError.message}`);

      toast({
        title: "Data cleared successfully",
        description: "All sample data has been removed from the system"
      });

      // Reload the page to refresh all data
      window.location.reload();
    } catch (error: any) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error clearing data",
        description: error.message || "There was an error clearing the sample data",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const exportData = async () => {
    try {
      const exportData: any = {};

      // Export each table individually
      const { data: flocks, error: flocksError } = await supabase.from('flocks').select('*');
      if (flocksError) throw flocksError;
      exportData.flocks = flocks;

      const { data: machines, error: machinesError } = await supabase.from('machines').select('*');
      if (machinesError) throw machinesError;
      exportData.machines = machines;

      const { data: batches, error: batchesError } = await supabase.from('batches').select('*');
      if (batchesError) throw batchesError;
      exportData.batches = batches;

      const { data: eggPack, error: eggPackError } = await supabase.from('egg_pack_quality').select('*');
      if (eggPackError) throw eggPackError;
      exportData.egg_pack_quality = eggPack;

      const { data: fertility, error: fertilityError } = await supabase.from('fertility_analysis').select('*');
      if (fertilityError) throw fertilityError;
      exportData.fertility_analysis = fertility;

      const { data: qa, error: qaError } = await supabase.from('qa_monitoring').select('*');
      if (qaError) throw qaError;
      exportData.qa_monitoring = qa;

      const { data: residue, error: residueError } = await supabase.from('residue_analysis').select('*');
      if (residueError) throw residueError;
      exportData.residue_analysis = residue;

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hatchery-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported successfully",
        description: "Your data has been downloaded as a JSON file"
      });
    } catch (error) {
      toast({
        title: "Error exporting data",
        description: "There was an error exporting your data",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Download all your hatchery data as a JSON file for backup purposes.
              </p>
              <Button onClick={exportData} variant="outline" className="w-full">
                Export All Data
              </Button>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import Data
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Bulk import functionality - coming soon. Contact support for data migration assistance.
              </p>
              <Button variant="outline" disabled className="w-full">
                Import Data (Coming Soon)
              </Button>
            </div>
          </div>

          <div className="p-4 border border-orange-500/20 rounded-lg bg-orange-500/5">
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-orange-600">
              <Trash2 className="h-4 w-4" />
              Clear Flock & House Data
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Remove all flock and house (batch) data while preserving machines and settings.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10" disabled={isDeleting}>
                  {isDeleting ? 'Clearing...' : 'Clear Flock & House Data'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear flock and house data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All flocks and their information</li>
                      <li>All houses (batches) and their data</li>
                      <li>Egg pack quality records</li>
                      <li>Fertility analysis data</li>
                      <li>QA monitoring records</li>
                      <li>Residue analysis results</li>
                      <li>Weight tracking data</li>
                      <li>Specific gravity tests</li>
                    </ul>
                    <p className="mt-2 font-semibold">Machines, hatcheries, and system settings will be preserved.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearFlockAndHouseData} className="bg-orange-600 text-white hover:bg-orange-700">
                    Yes, clear flock & house data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Danger Zone - Clear Everything
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Clear ALL data including machines and configurations. This action cannot be undone.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  {isDeleting ? 'Clearing...' : 'Clear All Data'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete ALL:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Flocks and their information</li>
                      <li>Machines and their configurations</li>
                      <li>All houses (batches) and their data</li>
                      <li>Egg pack quality records</li>
                      <li>Fertility analysis data</li>
                      <li>QA monitoring records</li>
                      <li>Residue analysis results</li>
                      <li>Weight tracking and all related data</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearSampleData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, clear all data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataCleanup;