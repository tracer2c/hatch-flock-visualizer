import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { AGE_RANGES, AgeRangeDefinition } from "@/services/ageRangeService";
import { toast } from "sonner";

interface AgeRangeSettingsProps {
  onRangesUpdate?: () => void;
}

const AgeRangeSettings = ({ onRangesUpdate }: AgeRangeSettingsProps) => {
  const [customRanges, setCustomRanges] = useState<AgeRangeDefinition[]>(AGE_RANGES);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Load custom ranges from localStorage on mount
    const stored = localStorage.getItem('customAgeRanges');
    if (stored) {
      try {
        setCustomRanges(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading custom age ranges:', e);
      }
    }
  }, []);

  const handleSave = () => {
    // Validate ranges don't overlap incorrectly
    for (let i = 0; i < customRanges.length - 1; i++) {
      if (customRanges[i].maxWeeks >= customRanges[i + 1].minWeeks && customRanges[i].maxWeeks !== 999) {
        toast.error("Age ranges overlap. Please adjust the values.");
        return;
      }
    }

    localStorage.setItem('customAgeRanges', JSON.stringify(customRanges));
    onRangesUpdate?.();
    setOpen(false);
    toast.success("Age ranges updated successfully");
  };

  const handleReset = () => {
    setCustomRanges(AGE_RANGES);
    localStorage.removeItem('customAgeRanges');
    onRangesUpdate?.();
    toast.success("Reset to default age ranges");
  };

  const updateRange = (index: number, field: 'minWeeks' | 'maxWeeks', value: number) => {
    const newRanges = [...customRanges];
    newRanges[index] = { ...newRanges[index], [field]: value };
    setCustomRanges(newRanges);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Customize Age Ranges
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Age Range Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Adjust the age ranges to match your operation's specific needs. Changes will be saved locally.
          </p>
          {customRanges.map((range, index) => (
            <div key={range.key} className="grid grid-cols-3 gap-4 items-end p-4 border rounded-lg">
              <div className="space-y-2">
                <Label className="font-semibold">{range.label}</Label>
                <p className="text-xs text-muted-foreground">{range.description}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`min-${range.key}`}>Min Weeks</Label>
                <Input
                  id={`min-${range.key}`}
                  type="number"
                  value={range.minWeeks}
                  onChange={(e) => updateRange(index, 'minWeeks', parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`max-${range.key}`}>Max Weeks</Label>
                <Input
                  id={`max-${range.key}`}
                  type="number"
                  value={range.maxWeeks === 999 ? '' : range.maxWeeks}
                  placeholder={range.maxWeeks === 999 ? "70+" : undefined}
                  onChange={(e) => updateRange(index, 'maxWeeks', e.target.value ? parseInt(e.target.value) : 999)}
                  min={range.minWeeks + 1}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgeRangeSettings;
