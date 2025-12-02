import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Thermometer, Settings, Clock, ClipboardCheck, ArrowRight } from "lucide-react";
import { useSingleSetterMachines, useMultiSetterMachines, useQAStats } from '@/hooks/useQAHubData';
import SingleSetterQAWorkflow from '@/components/qa-hub/SingleSetterQAWorkflow';
import MultiSetterQAWorkflow from '@/components/qa-hub/MultiSetterQAWorkflow';
import RecentQAEntries from '@/components/qa-hub/RecentQAEntries';

const QAHubPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const houseIdFromUrl = searchParams.get('houseId');
  const actionFromUrl = searchParams.get('action');
  
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  const { data: singleSetterMachines } = useSingleSetterMachines();
  const { data: multiSetterMachines } = useMultiSetterMachines();
  const { data: stats } = useQAStats();

  // Auto-switch to single-setter tab if houseId is in URL
  useEffect(() => {
    if (houseIdFromUrl || actionFromUrl === 'candling') {
      setActiveTab('single-setter');
    }
  }, [houseIdFromUrl, actionFromUrl]);

  const singleSetterCount = singleSetterMachines?.length || 0;
  const occupiedSingleSetters = singleSetterMachines?.filter(m => m.hasOccupant).length || 0;
  const multiSetterCount = multiSetterMachines?.length || 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardCheck className="h-6 w-6 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quality Assurance Hub</h1>
              <p className="text-muted-foreground">Centralized QA entry for incubation monitoring</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-muted/50">
            <Clock className="h-3 w-3 mr-1" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Badge>
          {stats && (
            <Badge variant="secondary">
              Today: {stats.today} | Week: {stats.thisWeek}
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Single Setter QA Card */}
        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <Thermometer className="h-6 w-6 text-blue-600" strokeWidth={1.5} />
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {occupiedSingleSetters}/{singleSetterCount} machines
              </Badge>
            </div>
            <CardTitle className="text-lg mt-3">Single Setter QA</CardTitle>
            <CardDescription className="text-sm">
              <span className="font-medium text-foreground">(per machine)</span> — Enter QA for single-setter machines. System auto-links to the house currently loaded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Select a machine and enter 18-point temperature readings. QA is automatically linked to the one house in that machine.
            </p>
            <Button 
              className="w-full group-hover:bg-blue-600 transition-colors"
              onClick={() => setActiveTab('single-setter')}
            >
              Start Single Setter QA
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Multi Setter QA Card */}
        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                <Settings className="h-6 w-6 text-purple-600" strokeWidth={1.5} />
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {multiSetterCount} machines
              </Badge>
            </div>
            <CardTitle className="text-lg mt-3">Multi Setter QA</CardTitle>
            <CardDescription className="text-sm">
              <span className="font-medium text-foreground">(per machine)</span> — Enter QA per machine with position-level flock mapping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Select a machine to enter QA. Temps linked by position, angles/humidity linked to all flocks in that machine.
            </p>
            <Button 
              variant="outline"
              className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 transition-colors"
              onClick={() => setActiveTab('multi-setter')}
            >
              Start Multi Setter QA
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Workflow Area */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="single-setter" className="gap-2">
            <Thermometer className="h-4 w-4" />
            <span className="hidden sm:inline">Single Setter</span>
          </TabsTrigger>
          <TabsTrigger value="multi-setter" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Multi Setter</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" strokeWidth={1.5} />
                Recent QA Entries
              </CardTitle>
              <CardDescription>
                View and manage recent quality assurance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentQAEntries />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="single-setter">
          <SingleSetterQAWorkflow 
            preSelectedHouseId={houseIdFromUrl}
            preSelectedAction={actionFromUrl}
          />
        </TabsContent>

        <TabsContent value="multi-setter">
          <MultiSetterQAWorkflow />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QAHubPage;
