import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Calendar, Clock, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateTransfer, useBatchTransfers, calculateDaysInMachine } from "@/hooks/useMachineTransfers";
import { useToast } from "@/hooks/use-toast";

interface Machine {
  id: string;
  machine_number: string;
  machine_type: string;
  unit_id: string | null;
}

interface TransferManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  currentMachineId: string;
  currentMachineNumber: string;
  setDate: string;
  unitId?: string | null;
  onTransferComplete?: () => void;
}

const TransferManager = ({
  open,
  onOpenChange,
  batchId,
  currentMachineId,
  currentMachineNumber,
  setDate,
  unitId,
  onTransferComplete
}: TransferManagerProps) => {
  const [hatchers, setHatchers] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    to_machine_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    transfer_time: '',
    notes: ''
  });

  const { toast } = useToast();
  const createTransfer = useCreateTransfer();
  const { data: existingTransfers, isLoading: transfersLoading } = useBatchTransfers(batchId);

  // Load available hatchers
  useEffect(() => {
    if (open) {
      loadHatchers();
    }
  }, [open, unitId]);

  const loadHatchers = async () => {
    setLoading(true);
    let query = supabase
      .from('machines')
      .select('id, machine_number, machine_type, unit_id')
      .in('machine_type', ['hatcher', 'combo'])
      .order('machine_number');

    // Filter by same hatchery if available
    if (unitId) {
      query = query.eq('unit_id', unitId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error loading hatchers:', error);
    } else {
      setHatchers(data || []);
    }
    setLoading(false);
  };

  const daysInSetter = calculateDaysInMachine(setDate, formData.transfer_date);

  const handleSubmit = async () => {
    if (!formData.to_machine_id) {
      toast({
        title: "Validation Error",
        description: "Please select a hatcher machine",
        variant: "destructive"
      });
      return;
    }

    if (daysInSetter < 0) {
      toast({
        title: "Validation Error",
        description: "Transfer date cannot be before the set date",
        variant: "destructive"
      });
      return;
    }

    await createTransfer.mutateAsync({
      batch_id: batchId,
      from_machine_id: currentMachineId,
      to_machine_id: formData.to_machine_id,
      transfer_date: formData.transfer_date,
      transfer_time: formData.transfer_time || undefined,
      days_in_previous_machine: daysInSetter,
      notes: formData.notes || undefined
    });

    setFormData({
      to_machine_id: '',
      transfer_date: new Date().toISOString().split('T')[0],
      transfer_time: '',
      notes: ''
    });
    onOpenChange(false);
    onTransferComplete?.();
  };

  const getDayIndicator = (days: number) => {
    if (days < 0) return { color: 'bg-red-100 text-red-800', label: 'Invalid - Before Set Date' };
    if (days === 18) return { color: 'bg-green-100 text-green-800', label: 'Optimal' };
    if (days >= 17 && days <= 19) return { color: 'bg-yellow-100 text-yellow-800', label: 'Acceptable' };
    if (days < 17) return { color: 'bg-orange-100 text-orange-800', label: 'Early' };
    return { color: 'bg-red-100 text-red-800', label: 'Late' };
  };

  const dayIndicator = getDayIndicator(daysInSetter);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Record Machine Transfer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transfer Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">From Machine (Setter)</p>
                <p className="font-medium">{currentMachineNumber}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">To Machine (Hatcher)</p>
                <p className="font-medium">
                  {formData.to_machine_id 
                    ? hatchers.find(h => h.id === formData.to_machine_id)?.machine_number 
                    : 'Select below'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Set Date: {new Date(setDate).toLocaleDateString()}</span>
              <span className="text-muted-foreground">•</span>
              <Badge className={dayIndicator.color}>
                Day {daysInSetter} ({dayIndicator.label})
              </Badge>
            </div>
          </div>

          {/* Transfer Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transfer To (Hatcher) *</Label>
              <Select
                value={formData.to_machine_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, to_machine_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading hatchers..." : "Select hatcher machine"} />
                </SelectTrigger>
                <SelectContent>
                  {hatchers.map(h => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.machine_number} ({h.machine_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Transfer Date *</Label>
                <Input
                  type="date"
                  value={formData.transfer_date}
                  min={setDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, transfer_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Transfer Time
                  <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  type="time"
                  value={formData.transfer_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, transfer_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Notes
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any observations or notes about the transfer..."
                rows={2}
              />
            </div>
          </div>

          {/* Existing Transfers */}
          {existingTransfers && existingTransfers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Previous Transfers</Label>
              <div className="space-y-2">
                {existingTransfers.map(t => (
                  <div key={t.id} className="p-2 bg-muted/30 rounded text-sm flex items-center justify-between">
                    <span>
                      {t.from_machine?.machine_number} → {t.to_machine?.machine_number}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(t.transfer_date).toLocaleDateString()}
                      {t.days_in_previous_machine && ` (Day ${t.days_in_previous_machine})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createTransfer.isPending || !formData.to_machine_id}
            >
              {createTransfer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Transfer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferManager;
