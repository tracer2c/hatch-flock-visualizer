

## Documentation White Paper - Hatchery Management System

### Overview
Create a new dedicated page (`/documentation`) that renders a professional, print-ready white paper covering the full usability of the application. The page will include a "Download as PDF" button (using the existing html2canvas + jsPDF approach from `ProjectReport.tsx`) and will be structured as a formal product documentation document with screenshots/illustrations.

### Document Structure (Sections)

1. **Cover Page** - Product name, logo (Egg icon), tagline, version number (v1.2), date
2. **Table of Contents** - Clickable section links
3. **Introduction** - What the system does, who it's for, key value propositions
4. **Getting Started** - Login/signup, password reset, 2FA setup, first-time onboarding
5. **Navigation & Layout** - Sidebar, TopBar, Command Palette (Cmd+K), responsive behavior
6. **Dashboard Overview** - KPI cards, active houses pipeline, QA alerts panel, machine utilization panel, hatchery filtering
7. **Data Entry** - House creation, data type selection, Fertility/Residue/Clears/Egg Pack forms with field descriptions
8. **QA Hub** - Single-stage and multi-stage workflows, 18-point temperature grid, rectal temps, tray wash, cull checks, specific gravity, hatch progression, moisture loss
9. **Data Sheet** - Tabs (Embrex/HOI, Residue, Egg Quality, Hatch Results, QA), filters, export
10. **Live Tracking** - Active/completed houses, progress bars, critical windows, phase tracking
11. **Machine Utilization** - Filters, KPIs, process flow diagram, performance rankings, machine grid
12. **Daily Tasks** - House checklists, machine checklists, SOP completion tracking
13. **Smart Analytics (AI Chat)** - Suggested questions, response types (charts, tables, summaries)
14. **Management Console** - Hatcheries, flocks, machines, users/roles, targets, SOP manager, residue schedule, reports, activity logs, batch status automation, house automation
15. **Advanced Features** - Bulk import, offline mode/PWA, push notifications, predictions panel, AI chart insights, alerts system
16. **Role-Based Access Control** - Roles (super_admin, company_admin, operations_head, staff), feature permissions matrix, read-only mode
17. **Multi-Tenant Architecture** - Company isolation, RLS, per-company data
18. **Glossary** - Key terms (House/Batch, Hatchery/Unit, HOI, HOF, Fertility%, etc.)

### Image Strategy
Since we cannot take live screenshots programmatically, each section will include:
- **Icon illustrations** using Lucide icons rendered inline (same icons used in the app)
- **Schematic diagrams** built with styled divs showing UI layouts (e.g., the 18-point temperature grid, process flow diagram)
- **Color-coded reference cards** showing the actual color tokens used in the app

### Technical Approach

**Files to create:**
1. `src/pages/DocumentationWhitePaper.tsx` - Main page component with all sections rendered as styled cards, optimized for both screen viewing and PDF export
2. `src/components/documentation/DocSection.tsx` - Reusable section wrapper component
3. `src/components/documentation/DocTableOfContents.tsx` - Clickable TOC component
4. `src/components/documentation/DocCoverPage.tsx` - Cover page with branding
5. `src/components/documentation/DocDiagrams.tsx` - Visual diagrams (18-point grid, process flow, navigation layout)

**Files to modify:**
1. `src/App.tsx` - Add route `/documentation` pointing to the new page
2. `src/lib/featureKeys.ts` - Add `documentation` feature key
3. `src/components/ModernSidebar.tsx` - Optionally add a sidebar link (or keep it accessible only via direct URL / Command Palette)

**PDF Export:**
- Reuse the existing `html2canvas` + `jsPDF` pattern from `ProjectReport.tsx`
- Add proper page-break hints (`page-break-before`, `page-break-inside: avoid`) for clean multi-page PDF output
- White background forced for print fidelity

**Styling:**
- Professional typography with clear heading hierarchy
- Print-friendly color scheme (dark text on white background)
- Section numbering for easy reference
- Tables with borders for field documentation
- Consistent spacing and padding optimized for A4 output

### Content Sources
All content will be derived from:
- The existing `CONTACT_CENTER_KNOWLEDGE_BASE.md` (1,332 lines of detailed feature documentation)
- The `FORMULAS_DOCUMENTATION.md` for calculation references
- Route definitions in `App.tsx` and sidebar items in `ModernSidebar.tsx`
- Database schema for data model documentation

