import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";

interface SimpleUnitSelectorProps {
  units: Array<{ id: string; name: string }>;
  selectedUnitIds: string[];
  onSelectionChange: (unitIds: string[]) => void;
}

const SimpleUnitSelector: React.FC<SimpleUnitSelectorProps> = ({
  units,
  selectedUnitIds,
  onSelectionChange
}) => {
  const handleUnitToggle = (unitId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUnitIds, unitId]);
    } else {
      onSelectionChange(selectedUnitIds.filter(id => id !== unitId));
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(units.map(unit => unit.id));
  };

  const handleSelectNone = () => {
    onSelectionChange([]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Select Units to Compare
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {selectedUnitIds.length} of {units.length} selected
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={handleSelectNone}
            className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {units.map((unit) => (
            <div key={unit.id} className="flex items-center space-x-2">
              <Checkbox
                id={unit.id}
                checked={selectedUnitIds.includes(unit.id)}
                onCheckedChange={(checked) => handleUnitToggle(unit.id, !!checked)}
              />
              <Label 
                htmlFor={unit.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {unit.name}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleUnitSelector;