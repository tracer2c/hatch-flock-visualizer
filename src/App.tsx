import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createIDBPersister } from "@/lib/idbPersister";
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
import SOPDashboardPage from "./pages/management/SOPDashboardPage";
import HatcheriesPage from "./pages/management/HatcheriesPage";
import HouseAutomationPage from "./pages/management/HouseAutomationPage";
import SOPManagerPage from "./pages/management/SOPManagerPage";
import FlocksPage from "./pages/management/FlocksPage";
import MachinesPage from "./pages/management/MachinesPage";
import UsersPage from "./pages/management/UsersPage";
import TargetsPage from "./pages/management/TargetsPage";
import ResidueSchedulePage from "./pages/management/ResidueSchedulePage";
import ReportsPage from "./pages/management/ReportsPage";
import ActivityLogPage from "./pages/management/ActivityLogPage";
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
import InstallPage from "./pages/InstallPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SupportPage from "./pages/SupportPage";
import { ModernSidebar } from "./components/ModernSidebar";
import { TopBar } from "./components/TopBar";
import { HelpProvider } from "./contexts/HelpContext";
import ContextualHelpBot from "./components/ContextualHelpBot";
import { useIsMobile, useIsTablet } from "./hooks/use-mobile";
import { OfflineBanner } from "./components/OfflineBanner";
import { SyncManager } from "./components/SyncManager";
import { useOfflinePrefetch } from "./hooks/useOfflinePrefetch";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep data longer for offline
      refetchOnWindowFocus: false,
      retry: 1,
      networkMode: 'offlineFirst', // Prefer cached data when offline
    },
  },
});

const persister = createIDBPersister();

// Component to handle prefetching inside the provider
function AppContent() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  // Prefetch essential data for offline use
  useOfflinePrefetch();
  
  return (
    <>
      <OfflineBanner />
      <SyncManager />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/install" element={<InstallPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <SidebarProvider defaultOpen={!isMobile && !isTablet}>
              <div className="flex min-h-screen w-full bg-background">
                <ModernSidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <TopBar />
                  <main className="flex-1 overflow-auto pt-12">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/performance" element={<PerformancePage />} />
                      <Route path="/process-flow" element={<ProcessFlowPage />} />
                      <Route path="/embrex-data-sheet" element={<EmbrexDataSheetPage />} />
                      <Route path="/embrex-timeline" element={<EmbrexTimelinePage />} />
                      <Route path="/live-tracking" element={<LiveTrackingPage />} />
                      <Route path="/machine-utilization" element={<MachineUtilizationPage />} />
                      <Route path="/analytics" element={<AnalyticsDashboard />} />
                      <Route path="/residue-breakout" element={<ResidueBreakoutPage />} />
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
                      <Route path="/checklist/machine/:machineId" element={<ChecklistPage />} />
                      <Route path="/management" element={<ManagementPage />} />
                      <Route path="/management/sop-dashboard" element={<SOPDashboardPage />} />
                      <Route path="/management/hatcheries" element={<HatcheriesPage />} />
                      <Route path="/management/house-automation" element={<HouseAutomationPage />} />
                      <Route path="/management/sop-manager" element={<SOPManagerPage />} />
                      <Route path="/management/flocks" element={<FlocksPage />} />
                      <Route path="/management/machines" element={<MachinesPage />} />
                      <Route path="/management/users" element={<UsersPage />} />
                      <Route path="/management/targets" element={<TargetsPage />} />
                      <Route path="/management/residue-schedule" element={<ResidueSchedulePage />} />
                      <Route path="/management/reports" element={<ReportsPage />} />
                      <Route path="/management/activity-log" element={<ActivityLogPage />} />
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
    </>
  );
}

const App = () => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        buster: 'v1', // Change this to invalidate cache on major updates
      }}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <InitializeApp>
            <HelpProvider>
              <AppContent />
            </HelpProvider>
          </InitializeApp>
        </BrowserRouter>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
