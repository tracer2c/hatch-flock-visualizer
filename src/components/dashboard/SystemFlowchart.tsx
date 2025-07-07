import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileImage } from "lucide-react";
import mermaid from 'mermaid';
import html2canvas from 'html2canvas';

const SystemFlowchart = () => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const flowchartDefinition = `
flowchart TD
    Start([🏭 Hatchery System Entry]) --> Dashboard{📊 Main Dashboard}
    
    Dashboard --> Tab1[📈 Live Overview]
    Dashboard --> Tab2[🔄 Process Flow]
    Dashboard --> Tab3[📊 Performance Charts]
    Dashboard --> Tab4[📈 Analysis & Comparison]
    
    %% Data Entry Flow
    Tab1 --> DataEntry[📝 Data Entry Navigation]
    DataEntry --> EggQuality[🥚 Egg Pack Quality Entry]
    DataEntry --> Fertility[🐣 Fertility Analysis Entry]
    DataEntry --> QA[🔍 QA Monitoring Entry]
    DataEntry --> Residue[🧪 Residue Analysis Entry]
    
    %% Daily Operations
    Tab1 --> Checklist[✅ Daily Checklist]
    Checklist --> SOPItems[📋 SOP-Based Items]
    Checklist --> Progress[📊 Progress Tracking]
    
    %% Management Center
    Tab1 --> Management[⚙️ Management Center]
    Management --> BatchMgmt[📦 Batch Management]
    Management --> SOPMgmt[📚 SOP Management]
    Management --> FlockMgmt[🐔 Flock Management]
    Management --> MachineMgmt[🏭 Machine Management]
    Management --> DataCleanup[🧹 Data Cleanup]
    
    %% Process Flow Analysis
    Tab2 --> FlowAnalysis[🔄 Process Flow Analysis]
    FlowAnalysis --> CorrelationCharts[📊 Quality vs Fertility Correlation]
    FlowAnalysis --> AgePerformance[📈 Performance by Flock Age]
    FlowAnalysis --> BreedComparison[🐔 Performance by Breed]
    FlowAnalysis --> ProcessMetrics[📊 Complete Process Metrics]
    
    %% Performance Analytics
    Tab3 --> PerformanceCharts[📊 Performance Charts]
    PerformanceCharts --> TrendAnalysis[📈 Trend Analysis]
    PerformanceCharts --> KPIMetrics[🎯 KPI Metrics]
    PerformanceCharts --> HistoricalData[📅 Historical Performance]
    
    %% Comparison & Analysis
    Tab4 --> ComparisonAnalysis[📈 Comparison Analysis]
    ComparisonAnalysis --> BatchComparison[📦 Batch-to-Batch Comparison]
    ComparisonAnalysis --> BenchmarkAnalysis[🎯 Benchmark Analysis]
    ComparisonAnalysis --> TrendPrediction[🔮 Trend Prediction]
    
    %% Alert System
    AlertSystem[🚨 Alert & Monitoring System]
    AlertSystem --> TempAlerts[🌡️ Temperature Alerts]
    AlertSystem --> HumidityAlerts[💧 Humidity Alerts]
    AlertSystem --> ScheduleAlerts[⏰ Schedule Reminders]
    AlertSystem --> MaintenanceAlerts[🔧 Maintenance Alerts]
    
    %% Data Processing Engine
    DataEngine[(🔄 Data Processing Engine)]
    EggQuality --> DataEngine
    Fertility --> DataEngine
    QA --> DataEngine
    Residue --> DataEngine
    
    DataEngine --> Analytics[📊 Analytics Generation]
    Analytics --> Tab2
    Analytics --> Tab3
    Analytics --> Tab4
    
    %% Database Integration
    DataEngine --> Database[(🗄️ Supabase Database)]
    Database --> Batches[📦 Batches Table]
    Database --> Flocks[🐔 Flocks Table]
    Database --> Machines[🏭 Machines Table]
    Database --> QualityData[📊 Quality Data Tables]
    Database --> Alerts[🚨 Alerts Table]
    
    %% Real-time Monitoring
    Database --> RealTimeSync[⚡ Real-time Sync]
    RealTimeSync --> AlertSystem
    RealTimeSync --> Dashboard
    
    %% Export & Reporting
    Analytics --> Reports[📄 Reports & Export]
    Reports --> PDFExport[📄 PDF Reports]
    Reports --> ExcelExport[📊 Excel Export]
    Reports --> DataVisualization[📊 Data Visualization]
    
    %% Styling
    classDef primary fill:#3b82f6,stroke:#1e40af,stroke-width:2px,color:#fff
    classDef secondary fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    classDef accent fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    classDef data fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff
    classDef storage fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
    
    class Dashboard,Tab1,Tab2,Tab3,Tab4 primary
    class DataEntry,EggQuality,Fertility,QA,Residue secondary
    class Management,BatchMgmt,SOPMgmt,FlockMgmt,MachineMgmt accent
    class DataEngine,Analytics,AlertSystem data
    class Database,Batches,Flocks,Machines,QualityData,Alerts storage
  `;

  useEffect(() => {
    if (mermaidRef.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        }
      });

      mermaid.render('mermaid-diagram', flowchartDefinition).then((result) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = result.svg;
          setIsLoading(false);
        }
      });
    }
  }, []);

  const downloadAsImage = async () => {
    if (mermaidRef.current) {
      try {
        const canvas = await html2canvas(mermaidRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true
        });
        
        const link = document.createElement('a');
        link.download = 'hatchery-system-flowchart.png';
        link.href = canvas.toDataURL();
        link.click();
      } catch (error) {
        console.error('Error generating image:', error);
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Hatchery Management System Flowchart
          </CardTitle>
          <Button 
            onClick={downloadAsImage}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <Download className="h-4 w-4" />
            Download Image
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Complete system architecture and data flow visualization
        </p>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Loading flowchart...
            </div>
          )}
          <div ref={mermaidRef} className="min-h-[600px] w-full" />
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemFlowchart;