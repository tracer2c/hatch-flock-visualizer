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
import HatchHOIEntryPage from "./pages/HatchHOIEntryPage";
import FlockEggPackEntryPage from "./pages/FlockEggPackEntryPage";
import FlockFertilityEntryPage from "./pages/FlockFertilityEntryPage";
import FlockResidueEntryPage from "./pages/FlockResidueEntryPage";
import FlockClearsInjectedEntryPage from "./pages/FlockClearsInjectedEntryPage";
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
import VisualOptionsPage from "./pages/management/VisualOptionsPage";
import ArchivePage from "./pages/management/ArchivePage";
import RoomsPage from "./pages/management/RoomsPage";
import MultiStagePage from "./pages/MultiStagePage";
import SingleStagePage from "./pages/SingleStagePage";
import ChecklistPage from "./pages/ChecklistPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
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
import DocumentationWhitePaper from "./pages/DocumentationWhitePaper";
import { ModernSidebar } from "./components/ModernSidebar";
import { TopBar } from "./components/TopBar";
import { HelpProvider } from "./contexts/HelpContext";
import { AuthProvider } from "./hooks/useAuth";
import { useIsMobile, useIsTablet } from "./hooks/use-mobile";

import { SyncManager } from "./components/SyncManager";
import { useOfflinePrefetch } from "./hooks/useOfflinePrefetch";
import { AnalyticsFilterProvider } from "./contexts/AnalyticsFilterContext";
import { AppBreadcrumbs } from "./components/uui/AppBreadcrumbs";
import { RouteHistoryTracker } from "./components/RouteHistoryTracker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

const persister = createIDBPersister();

function AppContent() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  useOfflinePrefetch();
  
  return (
    <>
      
      <SyncManager />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/install" element={<InstallPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <SidebarProvider defaultOpen={!isMobile && !isTablet}>
              <AnalyticsFilterProvider>
                <div className="flex min-h-screen w-full bg-background">
                  <ModernSidebar />
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <TopBar />
                    <main className="flex-1 overflow-auto pt-12">
                    <RouteHistoryTracker />
                    <div className="px-4 sm:px-6 pt-3">
                      <AppBreadcrumbs />
                    </div>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/multi-stage" element={
                        <RoleProtectedRoute featureKey="multi_stage"><MultiStagePage /></RoleProtectedRoute>
                      } />
                      <Route path="/single-stage" element={
                        <RoleProtectedRoute featureKey="single_stage"><SingleStagePage /></RoleProtectedRoute>
                      } />
                      <Route path="/performance" element={
                        <RoleProtectedRoute featureKey="performance"><PerformancePage /></RoleProtectedRoute>
                      } />
                      <Route path="/process-flow" element={
                        <RoleProtectedRoute featureKey="process_flow"><ProcessFlowPage /></RoleProtectedRoute>
                      } />
                      <Route path="/embrex-data-sheet" element={
                        <RoleProtectedRoute featureKey="embrex_data_sheet"><EmbrexDataSheetPage /></RoleProtectedRoute>
                      } />
                      <Route path="/embrex-timeline" element={
                        <RoleProtectedRoute featureKey="embrex_timeline"><EmbrexTimelinePage /></RoleProtectedRoute>
                      } />
                      <Route path="/live-tracking" element={
                        <RoleProtectedRoute featureKey="live_tracking"><LiveTrackingPage /></RoleProtectedRoute>
                      } />
                      <Route path="/machine-utilization" element={
                        <RoleProtectedRoute featureKey="machine_utilization"><MachineUtilizationPage /></RoleProtectedRoute>
                      } />
                      <Route path="/analytics" element={
                        <RoleProtectedRoute featureKey="analytics"><AnalyticsDashboard /></RoleProtectedRoute>
                      } />
                      <Route path="/residue-breakout" element={
                        <RoleProtectedRoute featureKey="residue_breakout"><ResidueBreakoutPage /></RoleProtectedRoute>
                      } />
                      <Route path="/house-flow" element={
                        <RoleProtectedRoute featureKey="house_flow"><HouseFlowPage /></RoleProtectedRoute>
                      } />
                      <Route path="/qa-hub" element={
                        <RoleProtectedRoute featureKey="qa_hub"><QAHubPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry" element={
                        <RoleProtectedRoute featureKey="data_entry"><DataEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry/house/:houseId" element={
                        <RoleProtectedRoute featureKey="data_entry"><DataEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry/house/:houseId/egg-pack" element={
                        <RoleProtectedRoute featureKey="data_entry"><EggPackEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry/house/:houseId/fertility" element={
                        <RoleProtectedRoute featureKey="data_entry"><FertilityEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry/house/:houseId/qa" element={
                        <RoleProtectedRoute featureKey="data_entry"><QAEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry/house/:houseId/residue" element={
                        <RoleProtectedRoute featureKey="data_entry"><ResidueEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry/house/:houseId/clears-injected" element={
                        <RoleProtectedRoute featureKey="data_entry"><ClearsInjectedEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry/flock/:flockKey/hoi" element={
                        <RoleProtectedRoute featureKey="data_entry"><HatchHOIEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry/flock/:flockKey/egg-pack" element={
                        <RoleProtectedRoute featureKey="data_entry"><FlockEggPackEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry/flock/:flockKey/fertility" element={
                        <RoleProtectedRoute featureKey="data_entry"><FlockFertilityEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry/flock/:flockKey/residue" element={
                        <RoleProtectedRoute featureKey="data_entry"><FlockResidueEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/data-entry/flock/:flockKey/clears-injected" element={
                        <RoleProtectedRoute featureKey="data_entry"><FlockClearsInjectedEntryPage /></RoleProtectedRoute>
                      } />
                      <Route path="/checklist" element={
                        <RoleProtectedRoute featureKey="checklist"><ChecklistPage /></RoleProtectedRoute>
                      } />
                      <Route path="/checklist/house/:houseId" element={
                        <RoleProtectedRoute featureKey="checklist"><ChecklistPage /></RoleProtectedRoute>
                      } />
                      <Route path="/checklist/machine/:machineId" element={
                        <RoleProtectedRoute featureKey="checklist"><ChecklistPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management" element={
                        <RoleProtectedRoute featureKey="management"><ManagementPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/sop-dashboard" element={
                        <RoleProtectedRoute featureKey="sop_dashboard"><SOPDashboardPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/hatcheries" element={
                        <RoleProtectedRoute featureKey="hatcheries"><HatcheriesPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/rooms" element={
                        <RoleProtectedRoute featureKey="hatcheries"><RoomsPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/house-automation" element={
                        <RoleProtectedRoute featureKey="house_automation"><HouseAutomationPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/sop-manager" element={
                        <RoleProtectedRoute featureKey="sop_manager"><SOPManagerPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/flocks" element={
                        <RoleProtectedRoute featureKey="flocks_management"><FlocksPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/machines" element={
                        <RoleProtectedRoute featureKey="machines_management"><MachinesPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/users" element={
                        <RoleProtectedRoute featureKey="user_management"><UsersPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/targets" element={
                        <RoleProtectedRoute featureKey="targets"><TargetsPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/residue-schedule" element={
                        <RoleProtectedRoute featureKey="residue_schedule"><ResidueSchedulePage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/reports" element={
                        <RoleProtectedRoute featureKey="reports"><ReportsPage /></RoleProtectedRoute>
                      } />
                      <Route path="/management/activity-log" element={
                        <RoleProtectedRoute featureKey="activity_log"><ActivityLogPage /></RoleProtectedRoute>
                      } />
                      {/* Visual Options is per-user personalization — open to all authenticated users */}
                      <Route path="/management/visual-options" element={<VisualOptionsPage />} />
                      {/* Archive is read-open; restore actions self-gate via usePermissions */}
                      <Route path="/management/archive" element={<ArchivePage />} />
                      <Route path="/bulk-import" element={
                        <RoleProtectedRoute featureKey="bulk_import"><BulkDataImportPage /></RoleProtectedRoute>
                      } />
                      <Route path="/report" element={
                        <RoleProtectedRoute featureKey="report"><ProjectReport /></RoleProtectedRoute>
                      } />
                      <Route path="/chat" element={
                        <RoleProtectedRoute featureKey="chat"><ChatPage /></RoleProtectedRoute>
                      } />
                      <Route path="/documentation" element={<DocumentationWhitePaper />} />
                      <Route path="/profile" element={<UserProfilePage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </div>
              </AnalyticsFilterProvider>
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
        maxAge: 24 * 60 * 60 * 1000,
        buster: 'v1',
      }}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <InitializeApp>
              <HelpProvider>
                <AppContent />
              </HelpProvider>
            </InitializeApp>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
