import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import DocCoverPage from '@/components/documentation/DocCoverPage';
import DocTableOfContents from '@/components/documentation/DocTableOfContents';
import DocSection, { DocSubSection, DocTable, DocNote, DocIconCard } from '@/components/documentation/DocSection';
import { TempGridDiagram, ProcessFlowDiagram, StatusLifecycleDiagram, SidebarLayoutDiagram } from '@/components/documentation/DocDiagrams';
import {
  Home, FileInput, ClipboardCheck, Grid3X3, TrendingUp, CheckSquare, MessageSquare, Settings,
  Lock, Users, Target, Activity, Upload, Wifi, Bell, Brain, Shield, Building2, Egg,
  Thermometer, Droplets, Scale, BarChart3, Search, Command
} from 'lucide-react';

const DocumentationWhitePaper = () => {
  const reportRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    const el = reportRef.current;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight - pageHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    while (heightLeft > 0) {
      pdf.addPage();
      position -= pageHeight;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }
    pdf.save('Hatchery_Management_System_Documentation.pdf');
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Documentation White Paper</h1>
        </div>
        <Button onClick={downloadPDF} variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Download PDF
        </Button>
      </div>

      <div ref={reportRef} className="bg-white text-gray-900 p-8 md:p-12 shadow-lg rounded-xl space-y-6" style={{ fontFamily: 'Georgia, serif' }}>
        <DocCoverPage />
        <DocTableOfContents />

        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 text-center mb-6">
          <p className="text-red-600 font-bold text-lg">
            ⚠️ This application requires an active internet connection to function properly.
          </p>
          <p className="text-red-500 text-sm mt-1">
            The current version does not support offline usage. Please ensure you have a stable internet connection before using the system.
          </p>
        </div>

        {/* 1. Introduction */}
        <DocSection id="introduction" number="1" title="Introduction">
          <p>The Hatchery Management System is a comprehensive, cloud-based platform designed for commercial poultry hatchery operations. It digitises every stage of the 21-day incubation cycle — from egg receipt and setter loading through candling, transfer, hatch-out, and residue analysis.</p>
          <DocSubSection title="Who Is It For?">
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Company Administrators</strong> – full oversight of multi-hatchery operations, user management, and target configuration.</li>
              <li><strong>Operations Heads</strong> – real-time tracking, QA monitoring, performance analytics, and machine utilization dashboards.</li>
              <li><strong>Hatchery Staff</strong> – daily data entry, QA checks, SOP checklists, and house-level task management.</li>
            </ul>
          </DocSubSection>
          <DocSubSection title="Key Value Propositions">
            <div className="grid grid-cols-2 gap-3">
              <DocIconCard icon={Activity} title="Real-Time Tracking" description="Monitor every house through the 21-day incubation cycle with live progress bars and critical window alerts." />
              <DocIconCard icon={Brain} title="AI-Powered Analytics" description="Natural language queries for instant insights, predictions, and chart explanations." />
              <DocIconCard icon={Shield} title="Multi-Tenant Security" description="Row-level security isolates each company's data with role-based access control." />
              <DocIconCard icon={Wifi} title="Cloud-Based Platform" description="Access your hatchery data securely from any device with an internet connection." />
            </div>
          </DocSubSection>
        </DocSection>

        {/* 2. Getting Started */}
        <DocSection id="getting-started" number="2" title="Getting Started">
          <DocSubSection title="Sign In">
            <p>Navigate to <code className="bg-gray-100 px-1 rounded">/auth</code>. Enter your email and password, then click <strong>Sign In</strong>. If two-factor authentication is enabled, a 6-digit code from your authenticator app is required.</p>
          </DocSubSection>
          <DocSubSection title="Sign Up">
            <p>On the same page, switch to the <strong>Create Account</strong> tab. Provide your first name, last name, email, and a strong password. A password strength indicator guides you. After submission, verify your email address.</p>
          </DocSubSection>
          <DocSubSection title="Password Reset">
            <p>Click <strong>"Forgot password?"</strong> on the Sign In page. Enter your email to receive a reset link. The link opens <code className="bg-gray-100 px-1 rounded">/reset-password</code> where you set a new password.</p>
          </DocSubSection>
          <DocSubSection title="Two-Factor Authentication (2FA)">
            <p>Enable 2FA from your Profile page. Scan the QR code with Google Authenticator or Authy. Recovery codes are provided for emergency access if your device is lost.</p>
          </DocSubSection>
        </DocSection>

        {/* 3. Navigation & Layout */}
        <DocSection id="navigation" number="3" title="Navigation & Layout">
          <SidebarLayoutDiagram />
          <DocSubSection title="Sidebar Navigation">
            <DocTable
              headers={['Menu Item', 'Icon', 'Description', 'URL']}
              rows={[
                ['Dashboard', '🏠', 'Main overview with KPIs and active houses', '/'],
                ['Data Entry', '📝', 'Create/manage houses and enter production data', '/data-entry'],
                ['QA Hub', '📋', 'Quality assurance temperature and monitoring entry', '/qa-hub'],
                ['Data Sheet', '📊', 'View all data in sortable table format', '/embrex-data-sheet'],
                ['Timeline', '📈', 'Charts and trend analysis over time', '/embrex-timeline'],
                ['Daily Tasks', '☑️', 'SOP checklists for houses and machines', '/checklist'],
                ['HatchAI Assistant', '💬', 'AI-powered insights and natural language queries', '/chat'],
                ['Management', '⚙️', 'Admin settings (Company Admin only)', '/management'],
              ]}
            />
          </DocSubSection>
          <DocSubSection title="Command Palette (Cmd+K)">
            <p>Press <strong>Cmd+K</strong> (Mac) or <strong>Ctrl+K</strong> (Windows) to open a universal search modal. Search for houses, flocks, machines, or hatcheries by name or number. Quick actions include "Create new house," "Start QA check," and "View reports."</p>
          </DocSubSection>
          <DocSubSection title="Top Bar">
            <p>A fixed header at the top of every page showing the current page title, breadcrumb path, search icon (opens Command Palette), notification bell with unread count, and user avatar dropdown.</p>
          </DocSubSection>
        </DocSection>

        {/* 4. Dashboard Overview */}
        <DocSection id="dashboard" number="4" title="Dashboard Overview">
          <DocSubSection title="KPI Cards">
            <DocTable
              headers={['Card', 'Metric', 'Calculation']}
              rows={[
                ['All Houses', 'Total count of houses', 'COUNT(all batches)'],
                ['Avg Fertility', 'Average fertility %', 'AVG(fertility_percent)'],
                ['Average HOF%', 'Hatch of Fertile %', 'AVG(hof_percent)'],
                ['Average HOI%', 'Hatch of Injection %', 'AVG(hoi_percent)'],
                ['Avg Flock Age', 'Age range in weeks', 'MIN–MAX(flock age)'],
              ]}
            />
          </DocSubSection>
          <DocSubSection title="Active Houses Pipeline">
            <p>The main section (~70% width) displays house cards with status badges, set dates, expected hatch dates, and day of incubation. Filter by status tabs (All, Active, In Setter, In Hatcher, Completed), machine, or text search.</p>
          </DocSubSection>
          <DocSubSection title="Right Sidebar Panel">
            <p>Toggle between <strong>QA Alerts</strong> (temperature/humidity warnings with severity colours) and <strong>Machine Utilization</strong> (status lights and capacity bars).</p>
          </DocSubSection>
          <DocSubSection title="Hatchery Filter">
            <p>A dropdown at the top filters all dashboard data by hatchery unit: All, DHN, SAM, TROY, ENT.</p>
          </DocSubSection>
        </DocSection>

        {/* 5. Data Entry */}
        <DocSection id="data-entry" number="5" title="Data Entry">
          <DocSubSection title="House Selection">
            <p>A responsive grid of house cards with search and filter capabilities. Click any card to choose a data type. The <strong>"+ New House"</strong> button opens a creation dialog with fields for hatchery, flock, machine, set date/time, total eggs, and house number.</p>
          </DocSubSection>
          <DocSubSection title="Data Type Selection">
            <p>Four large clickable cards in a 2×2 grid:</p>
            <div className="grid grid-cols-2 gap-2">
              <DocIconCard icon={Egg} title="Egg Pack Quality" description="Grading (A/B/C), size distribution, shell quality, weight averages." />
              <DocIconCard icon={Search} title="Fertility Analysis" description="Sample size, infertile count, auto-calculated fertility %, technician notes." />
              <DocIconCard icon={BarChart3} title="Residue Analysis" description="Early/mid/late dead, cull chicks, pips, contamination, malformations." />
              <DocIconCard icon={Target} title="Clears & Injected" description="Clear egg counts, auto-calculated injection numbers and clear %." />
            </div>
          </DocSubSection>
          <DocSubSection title="Fertility Analysis Form">
            <DocTable
              headers={['Field', 'Type', 'Notes']}
              rows={[
                ['Sample Size', 'Number + presets', 'Presets: 648, 360, 324, 180, 100'],
                ['Infertile Eggs', 'Number input', 'Count of infertile eggs'],
                ['Fertile Eggs', 'Auto-calculated', 'Sample Size − Infertile'],
                ['Fertility %', 'Auto-calculated', '(Fertile / Sample) × 100'],
                ['Analysis Date', 'Date picker', 'Shows "Day X" badge'],
                ['Technician Name', 'Text input', 'Required'],
                ['Notes', 'Text area', 'Optional'],
              ]}
            />
          </DocSubSection>
          <DocSubSection title="Residue Analysis Form">
            <DocTable
              headers={['Field', 'Description']}
              rows={[
                ['Sample Size', 'Number with preset dropdown'],
                ['Infertile', 'Infertile egg count'],
                ['Early Dead (0-7d)', 'Embryo mortality in first week'],
                ['Mid Dead (8-14d)', 'Embryo mortality in second week'],
                ['Late Dead (15-21d)', 'Embryo mortality in third week'],
                ['Cull Chicks', 'Chicks culled after hatch'],
                ['Live / Dead Pips', 'Pipped eggs with live or dead embryo'],
                ['Contaminated', 'Eggs showing contamination'],
                ['Malformed', 'Chicks with deformities'],
              ]}
            />
            <p><strong>Auto-calculated:</strong> Residue %, HOI % = (Chicks Hatched / Eggs Injected) × 100, HOF % = (Chicks Hatched / Fertile Eggs) × 100.</p>
          </DocSubSection>
        </DocSection>

        {/* 6. QA Hub */}
        <DocSection id="qa-hub" number="6" title="QA Hub">
          <DocSubSection title="Overview">
            <p>The QA Hub provides two workflows: <strong>Single Stage Setter QA</strong> and <strong>Multi Stage Setter QA</strong>. Both begin with machine selection (by hatchery) and technician details.</p>
          </DocSubSection>
          <DocSubSection title="18-Point Temperature Grid (Multi Stage)">
            <TempGridDiagram />
            <p>3 zones (Front/Middle/Back) × 3 levels (Top/Mid/Bottom) × 2 sides (Left/Right) = 18 temperature readings. Zone averages and overall average are calculated automatically. Colour-coded zone headers: Front = Blue, Middle = Green, Back = Purple.</p>
          </DocSubSection>
          <DocSubSection title="QA Entry Tabs">
            <DocTable
              headers={['Tab', 'Purpose', 'Key Fields']}
              rows={[
                ['Rectal Temps', 'Chick body temperatures', 'Hatcher, Chick Room, Separator Room (°C)'],
                ['Tray Wash', 'Cleaning water temperatures', 'Wash temp, Rinse temp, Detergent/Sanitizer checks'],
                ['Cull Checks', 'Culled chick counts', 'Male culls, Female culls, Total, Cull Rate %'],
                ['Specific Gravity', 'Eggshell quality via float test', 'Concentration, Sample, Float/Sink counts'],
                ['Hatch Progression', 'Hatch % over time', '−24h, −12h, At hatch, +12h readings'],
                ['Moisture Loss', 'Egg weight tracking', 'Initial weight, Current weight, Target/Actual loss %'],
              ]}
            />
          </DocSubSection>
        </DocSection>

        {/* 7. Data Sheet */}
        <DocSection id="data-sheet" number="7" title="Data Sheet">
          <DocSubSection title="Tab Navigation">
            <DocTable
              headers={['Tab', 'Data Displayed']}
              rows={[
                ['Embrex/HOI', 'Clear counts, Injected counts, HOI%'],
                ['Residue Analysis', 'All mortality categories, residue metrics'],
                ['Egg Quality', 'Pack inspection results, grading'],
                ['Hatch Results', 'Fertility%, HOF%, total hatched'],
                ['Quality Assurance', 'Temperature and humidity readings'],
              ]}
            />
          </DocSubSection>
          <p>All tabs share common columns (Flock #, Name, House #, Age, Set Date) plus tab-specific metrics. Column headers are sortable. Filters support multi-select by hatchery, machine, and date range. Export to CSV or Excel via the dropdown.</p>
        </DocSection>

        {/* 8. Live Tracking */}
        <DocSection id="live-tracking" number="8" title="Live Tracking">
          <StatusLifecycleDiagram />
          <DocSubSection title="Summary Statistics">
            <p>A row of cards shows counts for Scheduled, In Setter, In Hatcher, Critical Windows (pulsing red), and Average Progress.</p>
          </DocSubSection>
          <DocSubSection title="House Cards">
            <p>Each card displays house number, phase badge, progress bar (Setting → Incubating → Hatching), flock name, machine, set/hatch dates, day of incubation, and colour-coded performance metrics (Fertility, HOF, HOI). Critical window alerts appear as red indicators.</p>
          </DocSubSection>
          <DocSubSection title="Critical Windows">
            <DocTable
              headers={['Window', 'Days', 'Action Required']}
              rows={[
                ['Candling', 'Day 10–13', 'QA fertility verification check'],
                ['Transfer', 'Day 17–19', 'Move eggs from setter to hatcher'],
                ['Hatch', 'Day 20–22', 'Monitor hatch, enter residue data'],
              ]}
            />
          </DocSubSection>
        </DocSection>

        {/* 9. Machine Utilization */}
        <DocSection id="machine-util" number="9" title="Machine Utilization">
          <ProcessFlowDiagram />
          <DocSubSection title="KPI Cards">
            <p>Four cards: Avg Setter Utilization, Avg Hatcher Utilization, Houses in Setters, Houses in Hatchers — each with colour-coded borders and metric summaries.</p>
          </DocSubSection>
          <DocSubSection title="Performance Rankings">
            <p>Two side-by-side cards: <strong>Top Performers</strong> (green, 5 highest HOF%) and <strong>Needs Attention</strong> (orange, 5 lowest HOF%).</p>
          </DocSubSection>
          <DocSubSection title="Machine Grid">
            <p>Each machine card shows: machine number, type badge (Setter/Hatcher), status indicator (Green=Available, Yellow=In-Use, Orange=Maintenance, Red=Offline), utilization bar, eggs loaded vs. capacity.</p>
          </DocSubSection>
        </DocSection>

        {/* 10. Daily Tasks */}
        <DocSection id="daily-tasks" number="10" title="Daily Tasks">
          <DocSubSection title="House Daily Checklist">
            <p>Select an active house to see day-specific SOP items. Tasks are grouped into Required (red) and Optional (blue) sections. Each item has a checkbox, title, description, optional notes, and timestamp on completion.</p>
          </DocSubSection>
          <DocSubSection title="Machine Daily Checklist">
            <p>Select a machine to see maintenance tasks: Required Maintenance (updates Last Maintenance date), Routine Checks, and Optional tasks. Completing required maintenance automatically updates the machine record.</p>
          </DocSubSection>
        </DocSection>

        {/* 11. HatchAI Assistant */}
        <DocSection id="smart-analytics" number="11" title="HatchAI Assistant (AI Chat)">
          <DocSubSection title="Interface">
            <p>A chat-based interface with AI-aligned messages on the left and user messages on the right. A text input with send button is fixed at the bottom. Suggested question buttons appear when the chat is empty.</p>
          </DocSubSection>
          <DocSubSection title="Suggested Questions">
            <ul className="list-disc pl-6 space-y-1 text-xs">
              <li>"Show me today's house overview with charts"</li>
              <li>"Compare fertility rates between houses"</li>
              <li>"Generate performance trends for the last month"</li>
              <li>"Show machine utilization analytics"</li>
              <li>"What houses need attention today?"</li>
              <li>"Summarize this week's hatch performance"</li>
            </ul>
          </DocSubSection>
          <DocSubSection title="Response Types">
            <DocTable
              headers={['Type', 'Description']}
              rows={[
                ['Text Summary', 'Bulleted or paragraph explanation with markdown'],
                ['Data Table', 'Sortable columns with "Download CSV" button'],
                ['Line / Bar Chart', 'Interactive, hoverable visualizations'],
                ['Pie / Donut Chart', 'Proportional breakdowns'],
                ['Follow-up Buttons', 'Suggested next questions as clickable chips'],
              ]}
            />
          </DocSubSection>
        </DocSection>

        {/* 12. Management Console */}
        <DocSection id="management" number="12" title="Management Console">
          <DocNote>The Management section is only visible to users with the <strong>Company Admin</strong> role.</DocNote>
          <DocSubSection title="Settings Hub">
            <p>Organised into accordion groups: Operations, Asset Management, Configuration, and Administration. A search bar filters settings by keyword.</p>
          </DocSubSection>
          <DocSubSection title="Asset Managers">
            <DocTable
              headers={['Manager', 'URL', 'Key Fields']}
              rows={[
                ['Hatcheries', '/management/hatcheries', 'Name, Code, Description, Status'],
                ['Flocks', '/management/flocks', 'Flock #, Name, Breed, Age, Birds, Hatchery'],
                ['Machines', '/management/machines', 'Machine #, Type, Mode, Capacity, Status'],
                ['Users', '/management/users', 'Name, Email, Role, Status, Last Login'],
              ]}
            />
          </DocSubSection>
          <DocSubSection title="Configuration">
            <DocTable
              headers={['Feature', 'URL', 'Purpose']}
              rows={[
                ['Custom Targets', '/management/targets', 'Set thresholds for Fertility%, HOF%, HOI%, Clear%, Moisture Loss%'],
                ['SOP Manager', '/management/sop-manager', 'Create day-specific procedure templates'],
                ['Residue Schedule', '/management/residue-schedule', 'Schedule residue analysis reminders'],
                ['Batch Automation', '/management/house-automation', 'Configure automatic status transitions'],
                ['Reports', '/management/reports', 'Generate house, weekly, flock, or custom reports'],
                ['Activity Log', '/management/activity-log', 'Audit trail of all user actions'],
              ]}
            />
          </DocSubSection>
        </DocSection>

        {/* 13. Advanced Features */}
        <DocSection id="advanced" number="13" title="Advanced Features">
          <div className="grid grid-cols-2 gap-3">
            <DocIconCard icon={Upload} title="Bulk Import" description="Import houses and data from Excel files with column mapping, validation, and progress tracking." />
            <DocIconCard icon={Wifi} title="Cloud-Based Access" description="Access the system from any modern browser with an active internet connection. No installation required." />
            <DocIconCard icon={Bell} title="Push Notifications" description="Browser push alerts for temperature anomalies, critical days, maintenance reminders, and schedule alerts." />
            <DocIconCard icon={TrendingUp} title="Predictions Panel" description="AI-powered predictions using OpenAI via Supabase Edge Functions for fertility, hatch rate, and utilization forecasts." />
            <DocIconCard icon={Brain} title="AI Chart Insights" description="Click any chart's insight button to get an AI-generated explanation of trends and anomalies." />
            <DocIconCard icon={Bell} title="Alert System" description="Configurable alerts for temperature, humidity, critical days, and maintenance schedules with severity levels." />
          </div>
        </DocSection>

        {/* 14. RBAC */}
        <DocSection id="rbac" number="14" title="Role-Based Access Control">
          <DocSubSection title="Roles">
            <DocTable
              headers={['Role', 'Access Level']}
              rows={[
                ['Super Admin', 'Platform-wide access across all companies (internal only)'],
                ['Company Admin', 'Full access to all features including Management, Users, Targets'],
                ['Operations Head', 'View all data, enter data, manage flocks/machines — no user management'],
                ['Staff', 'Enter data, view own entries, complete checklists — no management access'],
              ]}
            />
          </DocSubSection>
          <DocSubSection title="Feature Permissions Matrix">
            <p>Company Admins can configure granular feature access per role via the User Management page. Each feature (Dashboard, Data Entry, QA Hub, etc.) can be independently enabled or disabled per role, with optional <strong>read-only mode</strong> that prevents data mutations.</p>
          </DocSubSection>
        </DocSection>

        {/* 15. Multi-Tenant Architecture */}
        <DocSection id="multi-tenant" number="15" title="Multi-Tenant Architecture">
          <DocSubSection title="Company Isolation">
            <p>Every table in the database includes a <code className="bg-gray-100 px-1 rounded">company_id</code> column. Supabase Row-Level Security (RLS) policies ensure that users can only access data belonging to their company. This is enforced at the database level — even direct API calls cannot bypass company boundaries.</p>
          </DocSubSection>
          <DocSubSection title="Per-Company Configuration">
            <p>Each company has independent: hatcheries, machines, flocks, targets, SOP templates, automation rules, alert configurations, and user roles. Companies are created with a domain and subscription type.</p>
          </DocSubSection>
          <DocNote>The system uses the term "House" (user-facing) for what is stored as "Batch" in the database, and "Hatchery" for what is stored as "Unit."</DocNote>
        </DocSection>

        {/* 16. Formulas */}
        <DocSection id="formulas" number="16" title="Formulas & Calculations">
          <DocTable
            headers={['Metric', 'Formula']}
            rows={[
              ['Fertility %', '(Fertile Eggs / Sample Size) × 100'],
              ['HOF %', '(Chicks Hatched / Fertile Eggs) × 100'],
              ['HOI %', '(Chicks Hatched / Eggs Injected) × 100'],
              ['Clear %', '(Clear Eggs / Sample Size) × 100'],
              ['Residue %', '(Total Residue Count / Sample Size) × 100'],
              ['Machine Utilization', '(Eggs in Active Batch / Machine Capacity) × 100'],
              ['Moisture Loss %', '((Initial Weight − Current Weight) / Initial Weight) × 100'],
              ['Progress %', '(Days Since Set / 21) × 100'],
              ['Egg Quality Score', '((A×1.0 + B×0.8 + C×0.6) / Sample) × 100'],
              ['Days Since Set', 'FLOOR((Current Date − Set Date) / 86400000 ms)'],
            ]}
          />
          <DocNote>All percentages are rounded to whole numbers. Division by zero returns 0 or N/A. Machine utilization is capped at 100% for display but flags over-capacity.</DocNote>
        </DocSection>

        {/* 17. Glossary */}
        <DocSection id="glossary" number="17" title="Glossary">
          <DocTable
            headers={['Term', 'Definition']}
            rows={[
              ['House (Batch)', 'A single incubation cycle — eggs set in a machine through to hatch completion.'],
              ['Hatchery (Unit)', 'A physical facility containing multiple machines. Examples: DHN, SAM, TROY, ENT.'],
              ['HOI', 'Hatch of Injection — (Chicks Hatched / Eggs Injected) × 100.'],
              ['HOF', 'Hatch of Fertile — (Chicks Hatched / Fertile Eggs) × 100.'],
              ['Fertility %', 'Percentage of eggs that are fertile in a sample.'],
              ['Residue', 'Unhatched egg analysis performed post-hatch to identify mortality causes.'],
              ['Candling', 'QA check performed on Days 10–13 to verify egg fertility via light inspection.'],
              ['Transfer', 'Moving eggs from setter machine to hatcher machine around Day 18.'],
              ['Setter', 'Incubation machine used for Days 0–17 of the cycle.'],
              ['Hatcher', 'Machine used for Days 18–21 (final stage before hatch).'],
              ['Single Stage', 'All eggs in the machine are from the same set date.'],
              ['Multi Stage', 'Machine contains eggs from multiple set dates (different zones/levels).'],
              ['Critical Window', 'Time period requiring specific action (Candling, Transfer, or Hatch).'],
              ['SOP', 'Standard Operating Procedure — day-specific checklist items.'],
              ['RLS', 'Row-Level Security — database policy enforcing per-company data isolation.'],
              
            ]}
          />
        </DocSection>

        {/* Footer */}
        <div className="border-t-2 border-gray-800 pt-4 mt-12 text-center text-xs text-gray-500">
          <p>Hatchery Management System — Documentation v1.2 — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          <p className="mt-1">Confidential — For Internal Use Only</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentationWhitePaper;
