/**
 * Machine Capacity Utilities
 * 
 * Core logic for calculating available capacity in setter machines,
 * handling both single-setter and multi-setter allocation rules.
 */

export interface Machine {
  id: string;
  machine_number: string;
  machine_type: 'setter' | 'hatcher' | 'combo';
  setter_mode: 'single_setter' | 'multi_setter' | null;
  capacity: number;
  unit_id: string | null;
  status: string | null;
}

export interface Allocation {
  id: string;
  batch_id: string;
  machine_id: string;
  eggs_allocated: number;
  allocation_date: string;
  status: 'active' | 'transferred' | 'completed';
}

export interface MultiSetterSet {
  id: string;
  machine_id: string;
  flock_id: string;
  batch_id: string | null;
  allocation_id: string | null;
  zone: 'A' | 'B' | 'C';
  side: 'Left' | 'Right';
  level: 'Top' | 'Middle' | 'Bottom';
  set_date: string;
  capacity: number;
}

export interface Position {
  zone: 'A' | 'B' | 'C';
  side: 'Left' | 'Right';
  level: 'Top' | 'Middle' | 'Bottom';
  key: string;
}

export interface MachineCapacityInfo {
  machine: Machine;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  availablePositions?: Position[];
  occupiedPositions?: Position[];
  canAcceptNewAllocation: boolean;
  reason?: string;
}

// Total positions in a multi-setter machine (3 zones × 2 sides × 3 levels)
export const TOTAL_POSITIONS = 18;

// Zone labels for display
export const ZONE_LABELS: Record<string, string> = {
  'A': 'Front',
  'B': 'Middle', 
  'C': 'Back'
};

/**
 * Generate all 18 positions for a multi-setter machine
 */
export function generateAllPositions(): Position[] {
  const zones: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
  const sides: Array<'Left' | 'Right'> = ['Left', 'Right'];
  const levels: Array<'Top' | 'Middle' | 'Bottom'> = ['Top', 'Middle', 'Bottom'];
  
  const positions: Position[] = [];
  
  for (const zone of zones) {
    for (const side of sides) {
      for (const level of levels) {
        positions.push({
          zone,
          side,
          level,
          key: `${zone}-${side}-${level}`
        });
      }
    }
  }
  
  return positions;
}

/**
 * Get position key string from position components
 */
export function getPositionKey(zone: string, side: string, level: string): string {
  return `${zone}-${side}-${level}`;
}

/**
 * Calculate available capacity for a SINGLE-SETTER machine.
 * 
 * Single-setter rules:
 * - All eggs must be set on the SAME date
 * - Cannot mix eggs from different set dates
 * - Entire machine is treated as one unit (no position selection)
 */
export function getSingleSetterAvailableCapacity(
  machine: Machine,
  activeAllocations: Allocation[],
  targetSetDate: string
): MachineCapacityInfo {
  const machineAllocations = activeAllocations.filter(
    a => a.machine_id === machine.id && a.status === 'active'
  );
  
  // Machine is completely empty - full capacity available
  if (machineAllocations.length === 0) {
    return {
      machine,
      totalCapacity: machine.capacity,
      usedCapacity: 0,
      availableCapacity: machine.capacity,
      canAcceptNewAllocation: true
    };
  }
  
  // Check if all existing allocations are from the same set date as target
  const existingDates = [...new Set(machineAllocations.map(a => a.allocation_date))];
  
  if (existingDates.length > 1) {
    // This shouldn't happen for single-setters, but handle gracefully
    return {
      machine,
      totalCapacity: machine.capacity,
      usedCapacity: machineAllocations.reduce((sum, a) => sum + a.eggs_allocated, 0),
      availableCapacity: 0,
      canAcceptNewAllocation: false,
      reason: 'Machine has mixed dates (data inconsistency)'
    };
  }
  
  const existingSetDate = existingDates[0];
  
  // Different date - cannot allocate to this single-setter
  if (existingSetDate !== targetSetDate) {
    return {
      machine,
      totalCapacity: machine.capacity,
      usedCapacity: machineAllocations.reduce((sum, a) => sum + a.eggs_allocated, 0),
      availableCapacity: 0,
      canAcceptNewAllocation: false,
      reason: `Machine has eggs from ${existingSetDate}. Single-setters cannot mix different set dates.`
    };
  }
  
  // Same date - return remaining capacity
  const usedCapacity = machineAllocations.reduce((sum, a) => sum + a.eggs_allocated, 0);
  const availableCapacity = Math.max(0, machine.capacity - usedCapacity);
  
  return {
    machine,
    totalCapacity: machine.capacity,
    usedCapacity,
    availableCapacity,
    canAcceptNewAllocation: availableCapacity > 0
  };
}

/**
 * Calculate available capacity for a MULTI-SETTER machine.
 * 
 * Multi-setter rules:
 * - Different ages/dates can coexist in the same machine
 * - Capacity is tracked at the position level (18 positions)
 * - Each position can hold eggs from one flock at a time
 */
export function getMultiSetterAvailableCapacity(
  machine: Machine,
  activeAllocations: Allocation[],
  activeSets: MultiSetterSet[],
  _targetSetDate?: string // Not used for multi-setters, kept for API consistency
): MachineCapacityInfo {
  const capacityPerPosition = Math.floor(machine.capacity / TOTAL_POSITIONS);
  
  // Get occupied positions from active sets in this machine
  const machineSets = activeSets.filter(s => s.machine_id === machine.id);
  const occupiedPositionKeys = new Set(
    machineSets.map(s => getPositionKey(s.zone, s.side, s.level))
  );
  
  const allPositions = generateAllPositions();
  const availablePositions = allPositions.filter(p => !occupiedPositionKeys.has(p.key));
  const occupiedPositions = allPositions.filter(p => occupiedPositionKeys.has(p.key));
  
  const usedCapacity = occupiedPositions.length * capacityPerPosition;
  const availableCapacity = availablePositions.length * capacityPerPosition;
  
  return {
    machine,
    totalCapacity: machine.capacity,
    usedCapacity,
    availableCapacity,
    availablePositions,
    occupiedPositions,
    canAcceptNewAllocation: availablePositions.length > 0
  };
}

/**
 * Calculate available capacity for any machine based on its setter_mode
 */
export function getMachineAvailableCapacity(
  machine: Machine,
  activeAllocations: Allocation[],
  activeSets: MultiSetterSet[],
  targetSetDate: string
): MachineCapacityInfo {
  // Only setter and combo machines can receive eggs for setting
  if (machine.machine_type === 'hatcher') {
    return {
      machine,
      totalCapacity: machine.capacity,
      usedCapacity: 0,
      availableCapacity: 0,
      canAcceptNewAllocation: false,
      reason: 'Hatcher machines cannot receive eggs for setting'
    };
  }
  
  // Check machine status
  if (machine.status === 'maintenance' || machine.status === 'offline') {
    return {
      machine,
      totalCapacity: machine.capacity,
      usedCapacity: 0,
      availableCapacity: 0,
      canAcceptNewAllocation: false,
      reason: `Machine is ${machine.status}`
    };
  }
  
  // Route to appropriate calculation based on setter_mode
  if (machine.setter_mode === 'multi_setter') {
    return getMultiSetterAvailableCapacity(machine, activeAllocations, activeSets, targetSetDate);
  } else {
    // Default to single-setter behavior
    return getSingleSetterAvailableCapacity(machine, activeAllocations, targetSetDate);
  }
}

/**
 * Calculate how many positions are needed to allocate a given number of eggs
 */
export function calculatePositionsNeeded(
  eggsToAllocate: number,
  machineCapacity: number
): number {
  const capacityPerPosition = Math.floor(machineCapacity / TOTAL_POSITIONS);
  return Math.ceil(eggsToAllocate / capacityPerPosition);
}

/**
 * Calculate eggs per position for a machine
 */
export function getCapacityPerPosition(machineCapacity: number): number {
  return Math.floor(machineCapacity / TOTAL_POSITIONS);
}

/**
 * Suggest optimal allocation split across multiple machines
 */
export function suggestAllocationSplit(
  totalEggs: number,
  availableMachines: MachineCapacityInfo[]
): Array<{ machine: Machine; eggsToAllocate: number; positionsNeeded?: number }> {
  const suggestions: Array<{ machine: Machine; eggsToAllocate: number; positionsNeeded?: number }> = [];
  let remainingEggs = totalEggs;
  
  // Sort machines by available capacity (largest first)
  const sortedMachines = [...availableMachines]
    .filter(m => m.canAcceptNewAllocation && m.availableCapacity > 0)
    .sort((a, b) => b.availableCapacity - a.availableCapacity);
  
  for (const machineInfo of sortedMachines) {
    if (remainingEggs <= 0) break;
    
    const eggsToAllocate = Math.min(remainingEggs, machineInfo.availableCapacity);
    
    if (eggsToAllocate > 0) {
      const suggestion: { machine: Machine; eggsToAllocate: number; positionsNeeded?: number } = {
        machine: machineInfo.machine,
        eggsToAllocate
      };
      
      // For multi-setters, calculate positions needed
      if (machineInfo.machine.setter_mode === 'multi_setter') {
        suggestion.positionsNeeded = calculatePositionsNeeded(
          eggsToAllocate,
          machineInfo.machine.capacity
        );
      }
      
      suggestions.push(suggestion);
      remainingEggs -= eggsToAllocate;
    }
  }
  
  return suggestions;
}

/**
 * Validate that a proposed allocation is valid
 */
export function validateAllocation(
  eggsToAllocate: number,
  machineInfo: MachineCapacityInfo,
  selectedPositions?: Position[]
): { valid: boolean; error?: string } {
  if (eggsToAllocate <= 0) {
    return { valid: false, error: 'Eggs to allocate must be greater than 0' };
  }
  
  if (!machineInfo.canAcceptNewAllocation) {
    return { valid: false, error: machineInfo.reason || 'Machine cannot accept new allocations' };
  }
  
  if (eggsToAllocate > machineInfo.availableCapacity) {
    return { 
      valid: false, 
      error: `Cannot allocate ${eggsToAllocate.toLocaleString()} eggs. Only ${machineInfo.availableCapacity.toLocaleString()} capacity available.` 
    };
  }
  
  // For multi-setters, validate position selection
  if (machineInfo.machine.setter_mode === 'multi_setter' && selectedPositions) {
    const positionsNeeded = calculatePositionsNeeded(eggsToAllocate, machineInfo.machine.capacity);
    
    if (selectedPositions.length < positionsNeeded) {
      return {
        valid: false,
        error: `Need ${positionsNeeded} positions for ${eggsToAllocate.toLocaleString()} eggs. Only ${selectedPositions.length} selected.`
      };
    }
    
    // Check if selected positions are actually available
    const availableKeys = new Set(machineInfo.availablePositions?.map(p => p.key) || []);
    const invalidPositions = selectedPositions.filter(p => !availableKeys.has(p.key));
    
    if (invalidPositions.length > 0) {
      return {
        valid: false,
        error: `Selected positions are not available: ${invalidPositions.map(p => p.key).join(', ')}`
      };
    }
  }
  
  return { valid: true };
}
