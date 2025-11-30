// Position mapping utility for multi-setter QA linkage
// Maps between database column names, position strings, and physical coordinates

export type ZoneType = 'A' | 'B' | 'C';
export type SideType = 'Left' | 'Right';
export type LevelType = 'Top' | 'Middle' | 'Bottom';

export interface PositionCoordinates {
  zone: ZoneType;       // A=Front, B=Middle, C=Back
  side: SideType;
  level: LevelType;
}

export interface MultiSetterSet {
  id: string;
  machine_id: string;
  flock_id: string;
  batch_id: string | null;
  zone: ZoneType;
  side: SideType;
  level: LevelType;
  set_date: string;
  capacity: number;
  flocks?: {
    flock_name: string;
    flock_number: number;
  };
  batches?: {
    batch_number: string;
  } | null;
}

export interface OccupancyInfo {
  set_id: string;
  flock_id: string;
  flock_name: string;
  flock_number: number;
  batch_id: string | null;
  batch_number: string | null;
  set_date: string;
}

// All 18 positions with their physical coordinate mappings
export const POSITION_MAPPING: Record<string, PositionCoordinates> = {
  front_top_left: { zone: 'A', side: 'Left', level: 'Top' },
  front_top_right: { zone: 'A', side: 'Right', level: 'Top' },
  front_mid_left: { zone: 'A', side: 'Left', level: 'Middle' },
  front_mid_right: { zone: 'A', side: 'Right', level: 'Middle' },
  front_bottom_left: { zone: 'A', side: 'Left', level: 'Bottom' },
  front_bottom_right: { zone: 'A', side: 'Right', level: 'Bottom' },
  middle_top_left: { zone: 'B', side: 'Left', level: 'Top' },
  middle_top_right: { zone: 'B', side: 'Right', level: 'Top' },
  middle_mid_left: { zone: 'B', side: 'Left', level: 'Middle' },
  middle_mid_right: { zone: 'B', side: 'Right', level: 'Middle' },
  middle_bottom_left: { zone: 'B', side: 'Left', level: 'Bottom' },
  middle_bottom_right: { zone: 'B', side: 'Right', level: 'Bottom' },
  back_top_left: { zone: 'C', side: 'Left', level: 'Top' },
  back_top_right: { zone: 'C', side: 'Right', level: 'Top' },
  back_mid_left: { zone: 'C', side: 'Left', level: 'Middle' },
  back_mid_right: { zone: 'C', side: 'Right', level: 'Middle' },
  back_bottom_left: { zone: 'C', side: 'Left', level: 'Bottom' },
  back_bottom_right: { zone: 'C', side: 'Right', level: 'Bottom' },
};

// All position keys for iteration
export const ALL_POSITION_KEYS = Object.keys(POSITION_MAPPING);

// Zone display names
export const ZONE_DISPLAY_NAMES: Record<ZoneType, string> = {
  'A': 'Front',
  'B': 'Middle', 
  'C': 'Back'
};

// Get position coordinates from position key
export function getPositionCoordinates(positionKey: string): PositionCoordinates | null {
  return POSITION_MAPPING[positionKey] || null;
}

// Get position key from coordinates
export function getPositionKey(zone: ZoneType, side: SideType, level: LevelType): string {
  const zoneKey = zone === 'A' ? 'front' : zone === 'B' ? 'middle' : 'back';
  const levelKey = level.toLowerCase();
  const sideKey = side.toLowerCase();
  return `${zoneKey}_${levelKey}_${sideKey}`;
}

// Convert database column name to position key
// 'temp_front_top_left' → 'front_top_left'
export function columnToPositionKey(column: string): string {
  return column.replace('temp_', '');
}

// Convert position key to database column name
// 'front_top_left' → 'temp_front_top_left'
export function positionKeyToColumn(positionKey: string): string {
  return `temp_${positionKey}`;
}

// Find the multi_setter_set that occupies a given position
export function findSetForPosition(
  sets: MultiSetterSet[], 
  zone: ZoneType, 
  side: SideType, 
  level: LevelType,
  checkDate: string
): MultiSetterSet | null {
  // Filter sets that match the position and were set on or before the check date
  const matchingSets = sets.filter(set => 
    set.zone === zone && 
    set.side === side && 
    set.level === level &&
    set.set_date <= checkDate
  );

  if (matchingSets.length === 0) return null;

  // If multiple sets match (shouldn't happen normally), use the most recent
  return matchingSets.reduce((latest, current) => 
    current.set_date > latest.set_date ? current : latest
  );
}

// Build a complete position → occupancy map for a machine on a given date
export function buildPositionOccupancyMap(
  sets: MultiSetterSet[],
  checkDate: string
): Map<string, OccupancyInfo> {
  const occupancyMap = new Map<string, OccupancyInfo>();

  for (const positionKey of ALL_POSITION_KEYS) {
    const coords = POSITION_MAPPING[positionKey];
    if (!coords) continue;

    const set = findSetForPosition(sets, coords.zone, coords.side, coords.level, checkDate);
    
    if (set) {
      occupancyMap.set(positionKey, {
        set_id: set.id,
        flock_id: set.flock_id,
        flock_name: set.flocks?.flock_name || 'Unknown Flock',
        flock_number: set.flocks?.flock_number || 0,
        batch_id: set.batch_id,
        batch_number: set.batches?.batch_number || null,
        set_date: set.set_date
      });
    }
  }

  return occupancyMap;
}

// Get unique flocks from occupancy map for color coding
export function getUniqueFlocks(occupancyMap: Map<string, OccupancyInfo>): string[] {
  const flockIds = new Set<string>();
  occupancyMap.forEach(info => flockIds.add(info.flock_id));
  return Array.from(flockIds);
}

// Generate a consistent color for a flock based on its ID
const FLOCK_COLORS = [
  'bg-blue-100 border-blue-300',
  'bg-green-100 border-green-300',
  'bg-purple-100 border-purple-300',
  'bg-orange-100 border-orange-300',
  'bg-pink-100 border-pink-300',
  'bg-cyan-100 border-cyan-300',
  'bg-yellow-100 border-yellow-300',
  'bg-rose-100 border-rose-300',
];

export function getFlockColor(flockId: string, uniqueFlocks: string[]): string {
  const index = uniqueFlocks.indexOf(flockId);
  return FLOCK_COLORS[index % FLOCK_COLORS.length] || FLOCK_COLORS[0];
}

// Get count of occupied vs unoccupied positions
export function getOccupancyStats(occupancyMap: Map<string, OccupancyInfo>): {
  occupied: number;
  unoccupied: number;
  total: number;
} {
  const occupied = occupancyMap.size;
  return {
    occupied,
    unoccupied: ALL_POSITION_KEYS.length - occupied,
    total: ALL_POSITION_KEYS.length
  };
}
