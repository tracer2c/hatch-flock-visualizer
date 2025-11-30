
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PerformancePage from "./pages/PerformancePage";
import ProcessFlowPage from "./pages/ProcessFlowPage";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import DataEntryPage from "./pages/DataEntryPage";
import EggPackEntryPage from "./pages/EggPackEntryPage";
import FertilityEntryPage from "./pages/FertilityEntryPage";
import QAEntryPage from "./pages/QAEntryPage";
import ResidueEntryPage from "./pages/ResidueEntryPage";
import ClearsInjectedEntryPage from "./pages/ClearsInjectedEntryPage";
import ManagementPage from "./pages/ManagementPage";
import ChecklistPage from "./pages/ChecklistPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import InitializeApp from "./components/InitializeApp";
import ProjectReport from "./pages/ProjectReport";
import ChatPage from "./pages/ChatPage";
import HouseFlowPage from "./pages/HouseFlowPage";
import EmbrexDataSheetPage from "./pages/EmbrexDataSheetPage";
import EmbrexTimelinePage from "./pages/EmbrexTimelinePage";
import ResidueBreakoutPage from "./pages/ResidueBreakoutPage";
import BulkDataImportPage from "./pages/BulkDataImportPage";
import UserProfilePage from "./pages/UserProfilePage";
import LiveTrackingPage from "./pages/LiveTrackingPage";
import MachineUtilizationPage from "./pages/MachineUtilizationPage";
import QAHubPage from "./pages/QAHubPage";
import { ModernSidebar } from "./components/ModernSidebar";
import { TopBar } from "./components/TopBar";
import { ViewModeProvider } from "./contexts/ViewModeContext";
import { HelpProvider } from "./contexts/HelpContext";
import ContextualHelpBot from "./components/ContextualHelpBot";
import { useIsMobile, useIsTablet } from "./hooks/use-mobile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // Data fresh for 30 seconds
      gcTime: 300000, // Garbage collection time for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch on tab switch
      retry: 1, // Only retry once on failure
    },
  },
});

const App = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <InitializeApp>
            <ViewModeProvider>
              <HelpProvider>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/*" element={
                  <ProtectedRoute>
                    <SidebarProvider defaultOpen={!isMobile && !isTablet}>
                    <div className="flex min-h-screen w-full bg-background">
                      <ModernSidebar />
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <TopBar />
                        <main className="flex-1 overflow-auto">
                          <Routes>
                            <Route path="/" element={<Index />} />
                            <Route path="/performance" element={<PerformancePage />} />
                            <Route path="/process-flow" element={<ProcessFlowPage />} />
                            <Route path="/embrex-data-sheet" element={<EmbrexDataSheetPage />} />
                            <Route path="/embrex-timeline" element={<EmbrexTimelinePage />} />
                            <Route path="/live-tracking" element={<LiveTrackingPage />} />
                            <Route path="/machine-utilization" element={<MachineUtilizationPage />} />
                            <Route path="/analytics" element={<AnalyticsDashboard />} />
                            <Route path="/residue-breakout" element={<EmbrexDataSheetPage />} />
                            <Route path="/house-flow" element={<HouseFlowPage />} />
                            <Route path="/qa-hub" element={<QAHubPage />} />
                            <Route path="/data-entry" element={<DataEntryPage />} />
                            <Route path="/data-entry/house/:houseId" element={<DataEntryPage />} />
                            <Route path="/data-entry/house/:houseId/egg-pack" element={<EggPackEntryPage />} />
                            <Route path="/data-entry/house/:houseId/fertility" element={<FertilityEntryPage />} />
                            <Route path="/data-entry/house/:houseId/qa" element={<QAEntryPage />} />
                            <Route path="/data-entry/house/:houseId/residue" element={<ResidueEntryPage />} />
                            <Route path="/data-entry/house/:houseId/clears-injected" element={<ClearsInjectedEntryPage />} />
                            <Route path="/checklist" element={<ChecklistPage />} />
                            <Route path="/checklist/house/:houseId" element={<ChecklistPage />} />
                            <Route path="/management" element={<ManagementPage />} />
                            <Route path="/bulk-import" element={<BulkDataImportPage />} />
                            <Route path="/report" element={<ProjectReport />} />
                            <Route path="/chat" element={<ChatPage />} />
                            <Route path="/profile" element={<UserProfilePage />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                        <ContextualHelpBot />
                      </div>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              } />
            </Routes>
            </HelpProvider>
          </ViewModeProvider>
        </InitializeApp>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
