
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PerformancePage from "./pages/PerformancePage";

import AnalyticsPage from "./pages/AnalyticsPage";
import DataEntryPage from "./pages/DataEntryPage";
import EggPackEntryPage from "./pages/EggPackEntryPage";
import FertilityEntryPage from "./pages/FertilityEntryPage";
import QAEntryPage from "./pages/QAEntryPage";
import ResidueEntryPage from "./pages/ResidueEntryPage";
import ManagementPage from "./pages/ManagementPage";
import ChecklistPage from "./pages/ChecklistPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import InitializeApp from "./components/InitializeApp";
import ProjectReport from "./pages/ProjectReport";
import ChatPage from "./pages/ChatPage";
import { ModernSidebar } from "./components/ModernSidebar";
import { TopBar } from "./components/TopBar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <InitializeApp>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <SidebarProvider defaultOpen={true}>
                  <div className="flex min-h-screen w-full bg-background">
                    <ModernSidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <TopBar />
                      <main className="flex-1 overflow-auto">
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/performance" element={<PerformancePage />} />
                          
                          <Route path="/analytics" element={<AnalyticsPage />} />
                          <Route path="/data-entry" element={<DataEntryPage />} />
                          <Route path="/data-entry/house/:houseId" element={<DataEntryPage />} />
                          <Route path="/data-entry/house/:houseId/egg-pack" element={<EggPackEntryPage />} />
                          <Route path="/data-entry/house/:houseId/fertility" element={<FertilityEntryPage />} />
                          <Route path="/data-entry/house/:houseId/qa" element={<QAEntryPage />} />
                          <Route path="/data-entry/house/:houseId/residue" element={<ResidueEntryPage />} />
                          <Route path="/checklist" element={<ChecklistPage />} />
                          <Route path="/checklist/house/:houseId" element={<ChecklistPage />} />
                          <Route path="/management" element={<ManagementPage />} />
                          <Route path="/report" element={<ProjectReport />} />
                          <Route path="/chat" element={<ChatPage />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </InitializeApp>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
