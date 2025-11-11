
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HOIEntryProps {
  batchId: string;
  eggsInjected: number;
  chicksHatched: number;
  onUpdated: (vals: { eggs_injected: number; chicks_hatched: number }) => void;
}

const HOIEntry = ({ batchId, eggsInjected, chicksHatched, onUpdated }: HOIEntryProps) => {
  const [eggsInjectedStr, setEggsInjectedStr] = useState<string>(String(eggsInjected ?? 0));
  const [chicksHatchedStr, setChicksHatchedStr] = useState<string>(String(chicksHatched ?? 0));
  const [technicianName, setTechnicianName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const eggsInjectedNum = useMemo(() => Math.max(0, Number(eggsInjectedStr || 0)), [eggsInjectedStr]);
  const chicksHatchedNum = useMemo(() => Math.max(0, Number(chicksHatchedStr || 0)), [chicksHatchedStr]);

  const hoiPct = useMemo(() => {
    if (!eggsInjectedNum) return null;
    return Number(((chicksHatchedNum / eggsInjectedNum) * 100).toFixed(2));
  }, [eggsInjectedNum, chicksHatchedNum]);

  const handleSave = async () => {
    if (saving) return;
    
    if (!technicianName.trim()) {
      toast({
        title: "Validation Error",
        description: "Technician name is required",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);

    const payload = {
      eggs_injected: eggsInjectedNum,
      chicks_hatched: chicksHatchedNum,
      hoi_technician_name: technicianName.trim(),
      hoi_notes: notes.trim() || null,
    };

    const { error } = await supabase
      .from("batches")
      .update(payload)
      .eq("id", batchId);

    setSaving(false);

    if (error) {
      console.error("Failed to save HOI fields:", error);
      toast({
        title: "Failed to save",
        description: "Could not update Eggs Injected / Chicks Hatched",
        variant: "destructive",
      });
      return;
    }

    onUpdated(payload);
    setTechnicianName('');
    setNotes('');
    toast({
      title: "Saved",
      description: "HOI fields updated successfully",
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Eggs Injected</label>
          <Input
            type="number"
            min={0}
            value={eggsInjectedStr}
            onChange={(e) => setEggsInjectedStr(e.target.value)}
            placeholder="e.g., 5600"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Chicks Hatched (Total)</label>
          <Input
            type="number"
            min={0}
            value={chicksHatchedStr}
            onChange={(e) => setChicksHatchedStr(e.target.value)}
            placeholder="e.g., 4800"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">HOI % (Hatched / Injected)</label>
          <Input disabled value={hoiPct == null ? "-" : `${hoiPct}%`} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Technician Name *</label>
          <Input
            value={technicianName}
            onChange={(e) => setTechnicianName(e.target.value)}
            placeholder="Enter technician name"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Notes (Optional)</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes"
          />
        </div>
        <div className="space-y-2">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HOIEntry;
