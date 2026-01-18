import FlockManager from "@/components/dashboard/FlockManager";
import MachineManager from "@/components/dashboard/MachineManager";
import BatchStatusSettings from "@/components/dashboard/BatchStatusSettings";
import SOPManager from "@/components/dashboard/SOPManager";
import SOPDashboard from "@/components/dashboard/SOPDashboard";
import UserManager from "@/components/dashboard/UserManager";
import UnitManager from "@/components/dashboard/UnitManager";
import { TargetManager } from "@/components/management/TargetManager";
import { ResidueScheduleManager } from "@/components/management/ResidueScheduleManager";
import ReportsManager from "@/components/management/ReportsManager";
import ActivityLogViewer from "@/components/management/ActivityLogViewer";
import { Clock, FileText, Users, Cog, UserCheck, Home, Target, Calendar, ListChecks, Download, ClipboardList } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
const ManagementPage = () => {
  return (
    <div className="p-6">
      {/* Management Sections */}
      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="sop-dashboard" className="bg-white rounded-lg shadow-sm border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <ListChecks className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">Daily SOP Dashboard</h3>
                <p className="text-gray-600 text-sm">View today's SOPs for houses, machines, transfers, and alerts</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <SOPDashboard />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="unit-manager" className="bg-white rounded-lg shadow-sm border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-teal-600" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">Hatchery Manager</h3>
                <p className="text-gray-600 text-sm">Hatchery Management</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <UnitManager />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="batch-status" className="bg-white rounded-lg shadow-sm border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">House Status Automation</h3>
                <p className="text-gray-600 text-sm">Configure automatic batch progression rules</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <BatchStatusSettings />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sop-manager" className="bg-white rounded-lg shadow-sm border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">SOP Manager</h3>
                <p className="text-gray-600 text-sm">Manage standard operating procedures and templates</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <SOPManager />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="flock-manager" className="bg-white rounded-lg shadow-sm border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-orange-600" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">Flock Manager</h3>
                <p className="text-gray-600 text-sm">Add, edit, and manage your bird flocks</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <FlockManager />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="machine-manager" className="bg-white rounded-lg shadow-sm border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Cog className="h-5 w-5 text-purple-600" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">Machine Manager</h3>
                <p className="text-gray-600 text-sm">Configure and maintain incubator machines</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <MachineManager />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="user-manager" className="bg-white rounded-lg shadow-sm border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">User Management</h3>
                <p className="text-gray-600 text-sm">Manage user accounts, roles, and permissions</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <UserManager />
          </AccordionContent>
        </AccordionItem>


        <AccordionItem value="custom-targets" className="bg-white rounded-lg shadow-sm border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-emerald-600" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">Custom Targets</h3>
                <p className="text-gray-600 text-sm">Set performance targets for hatcheries, flocks, and houses</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <TargetManager />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="residue-schedule" className="bg-white rounded-lg shadow-sm border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-amber-600" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">Residue Analysis Schedule</h3>
                <p className="text-gray-600 text-sm">Monitor and manage residue analysis schedules</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <ResidueScheduleManager />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="reports" className="bg-white rounded-lg shadow-sm border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-cyan-600" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">Reports</h3>
                <p className="text-gray-600 text-sm">Generate and download PDF reports for houses and weekly summaries</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <ReportsManager />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="activity-log" className="bg-white rounded-lg shadow-sm border">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-rose-600" />
              <div className="text-left">
                <h3 className="font-semibold text-lg">User Activity Log</h3>
                <p className="text-gray-600 text-sm">View all user actions with IP addresses and timestamps</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <ActivityLogViewer />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ManagementPage;
