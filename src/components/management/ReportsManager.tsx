import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileText, Download, Calendar, Home, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReportService } from '@/services/reportService';
import { toast } from 'sonner';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

const ReportsManager = () => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [weeklyDateFrom, setWeeklyDateFrom] = useState(format(startOfWeek(new Date()), 'yyyy-MM-dd'));
  const [weeklyDateTo, setWeeklyDateTo] = useState(format(endOfWeek(new Date()), 'yyyy-MM-dd'));
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [isGeneratingWeekly, setIsGeneratingWeekly] = useState(false);

  // Fetch batches for selection
  const { data: batches } = useQuery({
    queryKey: ['batches-for-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id, batch_number, set_date, status,
          flock:flocks(flock_name)
        `)
        .order('set_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  const handleGenerateBatchReport = async () => {
    if (!selectedBatchId) {
      toast.error('Please select a house first');
      return;
    }

    setIsGeneratingBatch(true);
    try {
      const blob = await ReportService.generateBatchReport(selectedBatchId);
      const batch = batches?.find(b => b.id === selectedBatchId);
      const filename = `house-report-${batch?.batch_number || 'unknown'}-${format(new Date(), 'yyyyMMdd')}.pdf`;
      ReportService.downloadBlob(blob, filename);
      toast.success('House report downloaded successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleGenerateWeeklyReport = async () => {
    setIsGeneratingWeekly(true);
    try {
      const blob = await ReportService.generateWeeklyReport(weeklyDateFrom, weeklyDateTo);
      const filename = `weekly-report-${weeklyDateFrom}-to-${weeklyDateTo}.pdf`;
      ReportService.downloadBlob(blob, filename);
      toast.success('Weekly report downloaded successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGeneratingWeekly(false);
    }
  };

  const quickDateRanges = [
    { label: 'This Week', from: startOfWeek(new Date()), to: endOfWeek(new Date()) },
    { label: 'Last Week', from: startOfWeek(subDays(new Date(), 7)), to: endOfWeek(subDays(new Date(), 7)) },
    { label: 'Last 7 Days', from: subDays(new Date(), 7), to: new Date() },
    { label: 'Last 30 Days', from: subDays(new Date(), 30), to: new Date() },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* House Report Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              House Performance Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate a detailed PDF report for a specific house including production metrics, 
              fertility analysis, and residue analysis data.
            </p>
            
            <div className="space-y-2">
              <Label>Select House</Label>
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a house..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {batches?.map(batch => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batch_number} - {(batch.flock as any)?.flock_name || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleGenerateBatchReport} 
              disabled={!selectedBatchId || isGeneratingBatch}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingBatch ? 'Generating...' : 'Download House Report'}
            </Button>
          </CardContent>
        </Card>

        {/* Weekly Report Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Weekly Summary Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate a weekly summary report showing all houses set during the selected 
              period with aggregate metrics and performance data.
            </p>

            {/* Quick Date Range Buttons */}
            <div className="flex flex-wrap gap-2">
              {quickDateRanges.map(range => (
                <Button
                  key={range.label}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWeeklyDateFrom(format(range.from, 'yyyy-MM-dd'));
                    setWeeklyDateTo(format(range.to, 'yyyy-MM-dd'));
                  }}
                >
                  {range.label}
                </Button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input 
                  type="date" 
                  value={weeklyDateFrom}
                  onChange={e => setWeeklyDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input 
                  type="date" 
                  value={weeklyDateTo}
                  onChange={e => setWeeklyDateTo(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={handleGenerateWeeklyReport} 
              disabled={isGeneratingWeekly}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingWeekly ? 'Generating...' : 'Download Weekly Report'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Report Types Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Available Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">House Performance Report</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• House information and status</li>
                <li>• Production metrics (eggs set, injected, hatched)</li>
                <li>• Fertility analysis data</li>
                <li>• Residue analysis breakdown</li>
                <li>• Hatchability percentages (HOF%, HOI%)</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Weekly Summary Report</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Total houses set during period</li>
                <li>• Aggregate egg and chick counts</li>
                <li>• Average hatch rate across all houses</li>
                <li>• House-by-house summary table</li>
                <li>• Performance trends overview</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsManager;
