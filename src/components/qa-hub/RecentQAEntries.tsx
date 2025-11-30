import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Thermometer, 
  Settings, 
  ChevronDown,
  Eye
} from "lucide-react";
import { useRecentQAEntries } from '@/hooks/useQAHubData';
import { format } from 'date-fns';

const PAGE_SIZE = 20;

const RecentQAEntries: React.FC = () => {
  const [entryModeFilter, setEntryModeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);

  const { data, isLoading, refetch } = useRecentQAEntries(PAGE_SIZE, currentPage * PAGE_SIZE);

  const filteredEntries = data?.entries.filter(entry => {
    if (entryModeFilter === 'all') return true;
    return entry.entry_mode === entryModeFilter;
  });

  const getTempColor = (temp: number | null): string => {
    if (temp === null) return 'text-muted-foreground';
    if (temp >= 99.5 && temp <= 100.5) return 'text-green-600';
    if ((temp >= 99.0 && temp < 99.5) || (temp > 100.5 && temp <= 101.0)) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter by:</span>
          <Select value={entryModeFilter} onValueChange={setEntryModeFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entry Modes</SelectItem>
              <SelectItem value="house">House (Single Setter)</SelectItem>
              <SelectItem value="machine">Machine (Multi Setter)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredEntries?.length || 0} of {data?.totalCount || 0} entries
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[140px]">Date/Time</TableHead>
              <TableHead className="w-[120px]">Entry Mode</TableHead>
              <TableHead>House/Machine</TableHead>
              <TableHead>Inspector</TableHead>
              <TableHead className="text-center">Avg Temp</TableHead>
              <TableHead className="text-center">Day</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No QA entries found
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries?.map(entry => (
                <TableRow key={entry.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm">{format(new Date(entry.check_date), 'MMM d, yyyy')}</span>
                      <span className="text-xs text-muted-foreground">{entry.check_time?.slice(0, 5)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.entry_mode === 'house' ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                        <Thermometer className="h-3 w-3" />
                        House
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                        <Settings className="h-3 w-3" />
                        Machine
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.entry_mode === 'house' ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {entry.batch?.flock?.flock_name || 'Unknown Flock'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.batch?.batch_number || '-'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {entry.machine?.machine_number || 'Unknown Machine'}
                        </span>
                        <span className="text-xs text-muted-foreground">Multi-Setter</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.inspector_name}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${getTempColor(entry.temp_avg_overall)}`}>
                      {entry.temp_avg_overall?.toFixed(1) || '-'}°F
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">
                      {entry.day_of_incubation || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.hasMore && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="gap-2"
          >
            Load More
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecentQAEntries;
