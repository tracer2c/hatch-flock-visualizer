import { AlertCircle, Info, CheckCircle } from "lucide-react";

interface DataAvailabilityFeedbackProps {
  selectedEntities: string[];
  selectionMode: 'flocks' | 'houses' | 'hatcheries';
  timelineData: any[];
  fromDate?: Date;
  toDate?: Date;
  entityOptions: { id: string; name: string; number: number; color: string; }[];
  metric: string;
}

export const DataAvailabilityFeedback = ({ 
  selectedEntities, 
  selectionMode, 
  timelineData, 
  fromDate, 
  toDate,
  entityOptions,
  metric 
}: DataAvailabilityFeedbackProps) => {
  
  // Calculate which entities have data in the timeline
  const entitiesWithData = new Set<string>();
  timelineData.forEach(item => {
    Object.keys(item).forEach(key => {
      if (key.includes(`_${metric}_`)) {
        const entityId = key.split('_').pop();
        if (entityId) {
          entitiesWithData.add(entityId);
        }
      }
    });
  });

  const entitiesWithoutData = selectedEntities.filter(id => !entitiesWithData.has(id));
  const hasData = entitiesWithData.size > 0;
  const missingDataCount = entitiesWithoutData.length;

  // Format date range for display
  const formatDateRange = () => {
    if (!fromDate || !toDate) return "the selected date range";
    return `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`;
  };

  // Show success state when all entities have data
  if (selectedEntities.length > 0 && missingDataCount === 0 && hasData) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-4 w-4" />
          <p className="text-sm font-medium">
            All {selectedEntities.length} selected {selectionMode} have data
          </p>
        </div>
      </div>
    );
  }

  // Show complete no data state
  if (selectedEntities.length > 0 && timelineData.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700 mb-2">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm font-medium">No data found for any selected {selectionMode}</p>
        </div>
        <div className="text-sm text-red-600 space-y-1">
          <p>
            {selectedEntities.length} {selectionMode} selected, but no batch data exists in {formatDateRange()}.
          </p>
          <p className="font-medium">Suggestions:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Expand the date range to include more historical data</li>
            <li>Select different {selectionMode} that have existing batch records</li>
            <li>Check if batch data has been entered for these {selectionMode}</li>
          </ul>
        </div>
      </div>
    );
  }

  // Show partial data state
  if (selectedEntities.length > 0 && missingDataCount > 0 && hasData) {
    const entitiesWithoutDataNames = entitiesWithoutData
      .map(id => {
        const entity = entityOptions.find(e => e.id === id);
        return entity ? `${entity.name} (#${entity.number})` : id;
      })
      .slice(0, 5); // Limit to first 5 for readability

    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 text-amber-700 mb-2">
          <Info className="h-4 w-4" />
          <p className="text-sm font-medium">
            Showing {entitiesWithData.size} of {selectedEntities.length} selected {selectionMode}
          </p>
        </div>
        <div className="text-sm text-amber-600 space-y-2">
          <p>
            {missingDataCount} {selectionMode} have no data in {formatDateRange()}.
          </p>
          {entitiesWithoutDataNames.length > 0 && (
            <div>
              <p className="font-medium">Missing data for:</p>
              <p className="ml-2">
                {entitiesWithoutDataNames.join(", ")}
                {entitiesWithoutData.length > 5 && ` and ${entitiesWithoutData.length - 5} more`}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};