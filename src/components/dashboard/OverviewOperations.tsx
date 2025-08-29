import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, Settings, Workflow } from "lucide-react";
import ProcessFlowDashboard from "./ProcessFlowDashboard";
import ConsolidatedAnalytics from "./ConsolidatedAnalytics";
import SystemFlowchart from "./SystemFlowchart";

const OverviewOperations = () => {
  const [showSystemFlow, setShowSystemFlow] = useState(false);
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Overview & Operations Center</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={viewMode === 'simple' ? 'default' : 'secondary'}>
                  {viewMode === 'simple' ? 'Simple View' : 'Detailed View'}
                </Badge>
                <Switch
                  checked={viewMode === 'detailed'}
                  onCheckedChange={(checked) => setViewMode(checked ? 'detailed' : 'simple')}
                />
              </div>
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                <span className="text-sm">System Flow</span>
                <Switch
                  checked={showSystemFlow}
                  onCheckedChange={setShowSystemFlow}
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      {viewMode === 'simple' ? (
        <ProcessFlowDashboard />
      ) : (
        <ConsolidatedAnalytics />
      )}

      {/* Optional System Flowchart */}
      {showSystemFlow && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            <h3 className="text-lg font-semibold">System Architecture & Data Flow</h3>
          </div>
          <SystemFlowchart />
        </div>
      )}
    </div>
  );
};

export default OverviewOperations;