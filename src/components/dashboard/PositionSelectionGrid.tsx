/**
 * Position Selection Grid for Multi-Setter Machines
 * 
 * Visual 18-point grid (3 zones × 2 sides × 3 levels) for selecting
 * positions during house creation.
 */

import { cn } from "@/lib/utils";
import { Position, ZONE_LABELS, getCapacityPerPosition } from "@/utils/machineCapacityUtils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PositionSelectionGridProps {
  availablePositions: Position[];
  occupiedPositions: Position[];
  selectedPositions: Position[];
  onSelectionChange: (positions: Position[]) => void;
  machineCapacity: number;
  eggsToAllocate: number;
  disabled?: boolean;
}

export function PositionSelectionGrid({
  availablePositions,
  occupiedPositions,
  selectedPositions,
  onSelectionChange,
  machineCapacity,
  eggsToAllocate,
  disabled = false
}: PositionSelectionGridProps) {
  const capacityPerPosition = getCapacityPerPosition(machineCapacity);
  const positionsNeeded = Math.ceil(eggsToAllocate / capacityPerPosition);
  const selectedKeys = new Set(selectedPositions.map(p => p.key));
  const availableKeys = new Set(availablePositions.map(p => p.key));

  const togglePosition = (position: Position) => {
    if (disabled || !availableKeys.has(position.key)) return;
    
    if (selectedKeys.has(position.key)) {
      onSelectionChange(selectedPositions.filter(p => p.key !== position.key));
    } else {
      onSelectionChange([...selectedPositions, position]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onSelectionChange([...availablePositions]);
  };

  const clearSelection = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  const autoSelect = () => {
    if (disabled) return;
    // Auto-select positions starting from zone A, filling each zone before moving to next
    const sorted = [...availablePositions].sort((a, b) => {
      if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
      if (a.side !== b.side) return a.side.localeCompare(b.side);
      const levelOrder = { 'Top': 0, 'Middle': 1, 'Bottom': 2 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
    onSelectionChange(sorted.slice(0, positionsNeeded));
  };

  const zones: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
  const sides: Array<'Left' | 'Right'> = ['Left', 'Right'];
  const levels: Array<'Top' | 'Middle' | 'Bottom'> = ['Top', 'Middle', 'Bottom'];

  const getPositionKey = (zone: string, side: string, level: string) => `${zone}-${side}-${level}`;

  const renderPositionCell = (zone: 'A' | 'B' | 'C', side: 'Left' | 'Right', level: 'Top' | 'Middle' | 'Bottom') => {
    const key = getPositionKey(zone, side, level);
    const isAvailable = availableKeys.has(key);
    const isSelected = selectedKeys.has(key);
    const isOccupied = !isAvailable;
    const position: Position = { zone, side, level, key };

    return (
      <button
        key={key}
        type="button"
        onClick={() => togglePosition(position)}
        disabled={disabled || isOccupied}
        className={cn(
          "h-12 w-full rounded-md border-2 flex items-center justify-center text-xs font-medium transition-all",
          isOccupied && "bg-muted/50 border-muted text-muted-foreground cursor-not-allowed",
          !isOccupied && !isSelected && "bg-card border-border hover:border-primary/50 hover:bg-primary/5",
          isSelected && "bg-primary border-primary text-primary-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isOccupied ? "●" : level[0]}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Select Positions</Label>
          <p className="text-xs text-muted-foreground">
            {capacityPerPosition.toLocaleString()} eggs per position • Need {positionsNeeded} positions for {eggsToAllocate.toLocaleString()} eggs
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={selectedPositions.length >= positionsNeeded ? "default" : "secondary"}>
            {selectedPositions.length} / {positionsNeeded} selected
          </Badge>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={autoSelect}
          disabled={disabled}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          Auto-select ({positionsNeeded})
        </button>
        <span className="text-muted-foreground">•</span>
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          Select all available
        </button>
        <span className="text-muted-foreground">•</span>
        <button
          type="button"
          onClick={clearSelection}
          disabled={disabled}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {zones.map(zone => (
          <div key={zone} className="space-y-2">
            <div className="text-center">
              <Badge variant="outline" className="text-xs">
                Zone {zone} ({ZONE_LABELS[zone]})
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sides.map(side => (
                <div key={`${zone}-${side}`} className="space-y-1">
                  <p className="text-xs text-center text-muted-foreground">{side}</p>
                  <div className="space-y-1">
                    {levels.map(level => renderPositionCell(zone, side, level))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-primary" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded border-2 border-border bg-card" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-muted/50" />
          <span>Occupied</span>
        </div>
      </div>
    </div>
  );
}
