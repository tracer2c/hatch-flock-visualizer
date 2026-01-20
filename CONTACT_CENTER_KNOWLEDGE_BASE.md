# Hatchery Management System - Contact Center Knowledge Base

> **Purpose**: This document is designed for contact center agents to help users navigate the Hatchery Management System. It provides detailed descriptions of all features, page layouts, and field locations.

---

## TABLE OF CONTENTS

1. [Navigation & Access](#section-1-navigation--access)
2. [Dashboard (Home Page)](#section-2-dashboard-home-page)
3. [Data Entry](#section-3-data-entry)
4. [QA Hub](#section-4-qa-hub)
5. [Data Sheet](#section-5-data-sheet)
6. [Live Tracking](#section-6-live-tracking)
7. [Machine Utilization](#section-7-machine-utilization)
8. [Daily Tasks](#section-8-daily-tasks)
9. [Smart Analytics (AI Chat)](#section-9-smart-analytics-ai-chat)
10. [Management (Admin Only)](#section-10-management-admin-only)
11. [User Profile & Settings](#section-11-user-profile--settings)
12. [Terminology Reference](#section-12-terminology-reference)
13. [Status Lifecycle](#section-13-status-lifecycle)
14. [Common User Questions](#section-14-common-user-questions)

---

## SECTION 1: NAVIGATION & ACCESS

### 1.1 Sidebar Navigation (Left Side of Screen)

The sidebar is **always visible** on the left side of the screen. It can be collapsed on mobile devices by tapping the hamburger menu icon (three horizontal lines) in the top-left corner.

| Menu Item | Icon | Description | URL Path |
|-----------|------|-------------|----------|
| Dashboard | Home icon (house shape) | Main overview page with KPIs and active houses | `/` |
| Data Entry | File input icon (document with arrow) | Create/manage houses and enter production data | `/data-entry` |
| QA Hub | Clipboard icon with checkmark | Quality assurance temperature and monitoring entry | `/qa-hub` |
| Data Sheet | Spreadsheet icon (grid) | View all data in sortable table format | `/embrex-data-sheet` |
| Timeline | Trending up icon (line graph) | Charts and trend analysis over time | `/embrex-timeline` |
| Daily Tasks | Checkbox icon (square with check) | SOP checklists for houses and machines | `/checklist` |
| Smart Analytics | Message bubble icon | AI-powered insights and natural language queries | `/chat` |
| Management | Gear/Settings icon | Admin settings (visible only to Company Admin) | `/management` |

**Bottom of Sidebar:**
- **User Profile**: Click the avatar/initials at the bottom to access profile settings
- **Collapse Button**: Arrow icon to minimize sidebar to icons only

---

### 1.2 Command Palette (Quick Search)

**How to Access:**
- **Keyboard Shortcut**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
- **Mouse**: Click the magnifying glass icon in the top bar (right side)

**What it Searches:**
- Houses by number or flock name
- Flocks by name or number
- Machines by number
- Hatcheries (DHN, SAM, TROY, ENT)

**Quick Actions Available:**
- "Create new flock" - Opens flock creation dialog
- "Create new house" - Opens house creation dialog
- "Start QA check" - Navigates to QA Hub
- "View reports" - Navigates to Reports page

**Interface Layout:**
- **Search Input**: Large text field at the top of the modal
- **Results List**: Grouped by category (Houses, Flocks, Machines, Actions)
- **Keyboard Navigation**: Use arrow keys to navigate, Enter to select, Escape to close

---

### 1.3 Top Bar (Frozen at Top of Every Page)

| Element | Position | Description |
|---------|----------|-------------|
| Back Arrow | Far left | Returns to previous page (browser history) |
| Page Title | Center-left | Shows current page name and breadcrumb path |
| Search Icon | Right side | Opens Command Palette (same as Cmd+K) |
| Notification Bell | Right side, next to search | Shows alerts and system notifications; red badge shows unread count |
| User Avatar | Far right | Dropdown menu with Profile, Settings, Sign Out options |

---

### 1.4 Login & Authentication

**Sign In Page** (`/auth`):
- **Email Field**: Top input field, accepts email format
- **Password Field**: Below email, with eye icon to show/hide password
- **Sign In Button**: Blue button below password field
- **Forgot Password Link**: Below Sign In button, opens password reset dialog

**Sign Up Page** (Same page, different tab):
- **First Name / Last Name**: Two fields side by side at top
- **Email Field**: Below name fields
- **Password Field**: With strength indicator bar below
- **Confirm Password Field**: Must match password exactly
- **Create Account Button**: Disabled until all fields valid

**Password Reset Flow:**
1. Click "Forgot password?" on Sign In page
2. Enter email in dialog that appears
3. Click "Send Reset Link"
4. Check email for reset link
5. Click link → Opens Reset Password page
6. Enter new password twice
7. Click "Reset Password"

**Two-Factor Authentication (2FA):**
- If enabled, after entering password, user sees 6-digit code input
- Code comes from authenticator app (Google Authenticator, Authy, etc.)
- "Use recovery code" link available if phone is lost

---

## SECTION 2: DASHBOARD (Home Page)

**URL**: `/` (root)
**Access**: Click "Dashboard" in sidebar

### 2.1 Header Controls (Top of Dashboard)

| Element | Location | Description |
|---------|----------|-------------|
| Analytics Dropdown | Top-left corner, first dropdown button | Navigate to: Live Tracking, House Flow, Process Flow, Machine Utilization |
| Hatchery Filter | Top-left, second dropdown (has building icon) | Filter all dashboard data by hatchery: All, DHN, SAM, TROY, ENT |
| Simple/Detailed Toggle | Top-right area, switch control | **Simple**: Compact house cards with minimal info; **Detailed**: Expanded cards with all metrics |
| Import Button | Top-right, "Import" text with upload icon | Opens bulk Excel import wizard |
| Refresh Button | Top-right, circular arrow icon | Manually reload all dashboard data |
| Download Button | Top-right, download arrow icon | Export current dashboard view as CSV or Excel |

---

### 2.2 KPI Cards (Horizontal Row Below Header)

Five statistic cards displayed in a single row:

| Card | Position | Shows | Color Indicator |
|------|----------|-------|-----------------|
| All Houses | 1st (leftmost) | Total count of houses in system | Blue icon |
| Avg Fertility | 2nd | Average fertility percentage across all houses | Green/Red trend arrow |
| Average HOF% | 3rd | Hatch of Fertile percentage average | Green/Red trend arrow |
| Average HOI% | 4th | Hatch of Injection percentage average | Green/Red trend arrow |
| Avg Flock Age | 5th (rightmost) | Age range displayed as "XX-YY weeks" | Blue icon |

**Clicking any KPI card** shows a detailed breakdown in a popup or navigates to filtered data.

---

### 2.3 Active Houses Pipeline (Main Left Section)

**Location**: Takes up approximately 70% of the dashboard width, left side

**Header Row Components:**
| Element | Position | Function |
|---------|----------|----------|
| View Tabs | Left side of section header | All, Active, In Setter, In Hatcher, Completed |
| Machine Filter | Center | Dropdown to filter by specific machine |
| Search Input | Right side | Real-time text search for house number or flock name |

**House Cards Display:**
Each house is displayed as a card with:
- **Top Left**: House number in bold (e.g., "House #1005")
- **Top Right**: Status badge with color (In Setter = Blue, In Hatcher = Orange, Completed = Green, Scheduled = Gray)
- **Middle**: Flock name and hatchery
- **Bottom Row**: Set Date, Expected Hatch Date, Day of Incubation
- **Metrics Row** (Detailed view only): Fertility%, HOF%, HOI% as small badges

**Card Interactions:**
- **Click anywhere on card**: Opens house detail page
- **Right-click or long-press**: Context menu with Quick Actions (Enter Data, View QA, Delete)

---

### 2.4 Right Sidebar Section (~30% Width)

**Toggle Switch at Top**: Switches between "QA Alerts" and "Machine Utilization" views

**QA Alerts View:**
| Element | Description |
|---------|-------------|
| Alert Cards | Each alert shows: Machine name, Alert type, Severity badge |
| Severity Colors | Critical = Red with pulse animation, Warning = Amber/Orange |
| "View All" Link | Bottom of section, navigates to full Alerts page |

**Machine Utilization View:**
| Element | Description |
|---------|-------------|
| Machine List | Each row: Machine number, Status light, Utilization bar |
| Status Lights | Green = Operational, Yellow = Maintenance Due, Red = Offline |
| Utilization Bar | Visual percentage showing current capacity usage |

---

## SECTION 3: DATA ENTRY

**URL**: `/data-entry`
**Access**: Click "Data Entry" in sidebar

### 3.1 House Selection Screen (Initial View)

**Top Section:**
| Element | Position | Description |
|---------|----------|-------------|
| Page Title | Top-left | "Data Entry" with subtitle |
| Search Bar | Top-center | Search by house number, flock name, or machine |
| Filters Button | Right of search | Opens filter dialog (Date Range, Hatchery, Machine Type, Technician) |
| New House Button | Top-right corner | Blue button with "+" icon, text "New House" |

**House Cards Grid:**
- Cards arranged in responsive grid (4 columns on desktop, 2 on tablet, 1 on mobile)
- Each card shows: House #, Flock Name, Status Badge, Set Date, Hatchery
- **Hover**: Card elevates slightly with shadow
- **Click**: Opens Data Type Selection for that house

---

### 3.2 Creating a New House (Dialog Window)

**Triggered by**: Clicking "New House" button

**Dialog Layout** (Fields arranged in rows):

| Row | Column 1 | Column 2 | Column 3 |
|-----|----------|----------|----------|
| 1 | **Hatchery** (Dropdown): DHN, SAM, TROY, ENT | **Flock** (Dropdown): Lists flocks for selected hatchery | **Machine** (Dropdown): Lists machines for selected hatchery |
| 2 | **Set Date** (Date Picker): Calendar popup | **Set Time** (Time Picker): Hour/minute selection | **Total Eggs Set** (Number Input): Required field |
| 3 | **House Number** (Text Input): Custom identifier | **Technician Name** (Read-only): Auto-filled with logged-in user | - |

**Bottom of Dialog:**
- **Cancel Button**: Left side, gray, closes dialog without saving
- **Next Button**: Right side, blue, proceeds to confirmation

**Important Notes:**
- If no flocks exist for selected hatchery, a yellow alert appears: "No Flocks Available"
- If no machines exist for selected hatchery, a yellow alert appears: "No Machines Available"
- "Next" button is disabled if required resources are missing

---

### 3.3 Data Type Selection (After Selecting a House)

**URL**: `/data-entry?houseId=[id]`

Four large clickable cards arranged in a 2x2 grid:

| Card | Position | Icon | Color | Description |
|------|----------|------|-------|-------------|
| Egg Pack Quality | Top-left | Package/box icon | Blue | Enter egg grading, size distribution, shell quality |
| Fertility Analysis | Top-right | Flask/beaker icon | Green | Enter fertility rates, early/mid/late dead counts |
| Residue Analysis | Bottom-left | Lab dish icon | Orange | Enter unhatched egg analysis post-hatch |
| Clears & Injected | Bottom-right | Syringe icon | Blue | Enter clear egg counts and injection data |

**Card Details:**
- Each card shows the entry type name, icon, brief description, and "Last entered: [date]" if data exists
- Checkmark badge appears on cards with completed data
- Click any card to open that specific data entry form

---

### 3.4 Fertility Analysis Form

**URL**: `/data-entry/fertility?houseId=[id]`

**Form Layout:**

| Row | Field | Position | Type | Notes |
|-----|-------|----------|------|-------|
| 1 | Sample Size | Column 1 | Number input with dropdown | Presets: 648, 360, 324, 180, 100 eggs |
| 1 | Infertile Eggs | Column 2 | Number input | Enter count of infertile eggs |
| 1 | Analysis Date | Column 3 | Date picker | Shows "Day X" badge below based on set date |
| 1 | Fertile Eggs | Column 4 | Read-only (grayed) | Auto-calculated: Sample Size - Infertile |
| 2 | Fertility % | Column 1 | Read-only (grayed) | Auto-calculated: (Fertile / Sample) × 100 |
| 2 | Technician Name | Column 2 | Text input | Required field |
| 2 | Notes | Column 3-4 (wide) | Text area | Optional, multiline |

**Bottom Buttons:**
- **Cancel**: Left, returns to Data Type Selection
- **Save**: Right, blue, saves and returns to Data Type Selection
- **Save & Continue**: Right, outlined, saves and resets form for next entry

---

### 3.5 Residue Analysis Form

**URL**: `/data-entry/residue?houseId=[id]`

**Header Section (Read-only, Gray Background):**
| Field | Position | Description |
|-------|----------|-------------|
| Flock Name | Left | Auto-filled from house data |
| Flock Number | Center | Auto-filled from house data |
| House Number | Right | Auto-filled from house data |

**Data Entry Section:**

| Row | Field | Position | Notes |
|-----|-------|----------|-------|
| 1 | Sample Size | Column 1 | Number input with preset dropdown |
| 1 | Eggs Injected | Column 2 | Read-only, pulled from Clears & Injected data |
| 1 | Infertile | Column 3 | Count of infertile eggs in sample |
| 2 | Early Dead (0-7 days) | Column 1 | Embryo mortality in first week |
| 2 | Mid Dead (8-14 days) | Column 2 | Embryo mortality in second week |
| 2 | Late Dead (15-21 days) | Column 3 | Embryo mortality in third week |
| 3 | Cull Chicks | Column 1 | Chicks culled after hatch |
| 3 | Live Pips | Column 2 | Pipped eggs with live embryo |
| 3 | Dead Pips | Column 3 | Pipped eggs with dead embryo |
| 4 | Contaminated | Column 1 | Eggs showing contamination |
| 4 | Malformed | Column 2 | Chicks with deformities |
| 4 | Technician | Column 3 | Required text field |
| 5 | Notes | Full width | Optional text area |

**Calculated Fields (Displayed in Summary Card):**
- Residue %: Calculated automatically
- HOI %: (Chicks Hatched / Eggs Injected) × 100
- HOF %: (Chicks Hatched / Fertile Eggs) × 100

---

### 3.6 Clears & Injected Form

**URL**: `/data-entry/clears?houseId=[id]`

| Row | Field | Position | Notes |
|-----|-------|----------|-------|
| 1 | Sample Size | Column 1 | Required number input |
| 1 | Clear Number | Column 2 | Count of clear eggs; shows Clear % below automatically |
| 1 | Injected | Column 3 | Auto-calculated (Sample Size - Clear Number) |
| 2 | Technician Name | Column 1 | Required field |
| 2 | Notes | Column 2-3 | Optional text area |

**Clear % Indicator:**
- Displayed as badge below Clear Number field
- Color coded: Green (<5%), Yellow (5-10%), Red (>10%)

---

### 3.7 Egg Pack Quality Form

**URL**: `/data-entry/egg-pack?houseId=[id]`

| Section | Fields |
|---------|--------|
| **Size Distribution** | Sample Size, Large eggs count, Small eggs count |
| **Grading** | Grade A, Grade B, Grade C counts |
| **Quality Issues** | Cracked, Dirty eggs counts |
| **Measurements** | Avg Weight (grams), Shell Thickness (mm) |
| **Meta** | Inspector Name, Inspection Date, Notes |

---

## SECTION 4: QA HUB

**URL**: `/qa-hub`
**Access**: Click "QA Hub" in sidebar

### 4.1 Page Header

**Top Section:**
| Element | Position | Description |
|---------|----------|-------------|
| Page Title | Top-left | "QA Hub" with subtitle "Quality Assurance Data Entry" |
| Current Date | Top-right | Shows today's date |
| Statistics | Below title | Shows count of Single Stage and Multi Stage machines |

### 4.2 Quick Access Cards

Two large cards below the header:

| Card | Position | Description | Button Text |
|------|----------|-------------|-------------|
| Single Stage Setter QA | Left | For single-stage incubation machines | "Start Single Setter QA" |
| Multi Stage Setter QA | Right | For multi-stage machines with 18-point temperature grid | "Start Multi Setter QA" |

Clicking either card switches to the corresponding workflow tab below.

---

### 4.3 Single Stage Setter QA Workflow

**Tab Location**: Below Quick Access cards, "Single Stage Setter" tab

**Step 1: Machine Selection Card**
| Field | Position | Description |
|-------|----------|-------------|
| Hatchery | Left dropdown | Select DHN, SAM, TROY, or ENT |
| Machine Search | Right, wider field | Search/select specific machine by number |

**Step 2: Technician & Context Card**
| Field | Position | Description |
|-------|----------|-------------|
| Technician Name | Left | Required text input |
| Check Date | Center | Date picker, defaults to today |
| Notes | Right | Optional text area for general notes |

**Step 3: QA Entry Tabs** (6 tabs in horizontal row)

| Tab # | Tab Name | Icon | What to Enter |
|-------|----------|------|---------------|
| 1 | Rectal Temps | Thermometer | Chick rectal temperatures by location |
| 2 | Tray Wash | Droplet | Tray wash water temperature |
| 3 | Cull Checks | AlertCircle | Male and female cull counts |
| 4 | Specific Gravity | Scale | Float test results for shell quality |
| 5 | Hatch Progression | TrendingUp | Hatch percentage at intervals |
| 6 | Moisture Loss | Droplet | Egg weight tracking for moisture loss calculation |

---

#### 4.3.1 Rectal Temps Tab

**Purpose**: Record chick body temperatures at different locations

**Input Grid:**
| Location | Field Type | Expected Range |
|----------|------------|----------------|
| Hatcher | Number input | 38.0 - 41.0 °C |
| Chick Room | Number input | 32.0 - 36.0 °C |
| Separator Room | Number input | 30.0 - 34.0 °C |

**Visual Indicator**: Temperature field turns red if outside expected range

---

#### 4.3.2 Tray Wash Tab

**Purpose**: Record cleaning water temperature

**Fields:**
| Field | Description |
|-------|-------------|
| Wash Temperature | Water temperature in °C |
| Rinse Temperature | Rinse water temperature |
| Detergent Used | Checkbox |
| Sanitizer Used | Checkbox |

---

#### 4.3.3 Cull Checks Tab

**Purpose**: Record culled chick counts by gender

**Layout:**
| Field | Position | Description |
|-------|----------|-------------|
| Male Culls | Left | Count of male chicks culled |
| Female Culls | Right | Count of female chicks culled |
| Total Culls | Below (calculated) | Auto-sum of male + female |
| Cull Rate % | Below | Calculated percentage |

---

#### 4.3.4 Specific Gravity Tab

**Purpose**: Measure eggshell quality via float test

**Fields:**
| Field | Description |
|-------|-------------|
| Flock Selection | Dropdown to choose flock |
| Age (weeks) | Auto-filled based on flock |
| Concentration | Solution concentration (1.075, 1.080, etc.) |
| Sample Size | Number of eggs tested |
| Float Count | Eggs that floated |
| Sink Count | Auto-calculated (Sample - Float) |
| Float Percentage | Auto-calculated |
| Standard Range | Shows expected range for flock age |
| Meets Standard | Yes/No indicator |

---

#### 4.3.5 Hatch Progression Tab

**Purpose**: Track hatch percentage over time

**Input Table:**
| Time Point | Field |
|------------|-------|
| 24 hours before hatch | Percentage input |
| 12 hours before hatch | Percentage input |
| At hatch | Percentage input |
| 12 hours after hatch | Percentage input |

**Progress Bar**: Visual representation of hatch progression

---

#### 4.3.6 Moisture Loss Tab

**Purpose**: Calculate egg weight loss during incubation

**Fields:**
| Field | Description |
|-------|-------------|
| Initial Weight (Day 0) | Starting egg weight in grams |
| Current Weight | Weight at check time |
| Target Loss % | Expected moisture loss percentage |
| Actual Loss % | Auto-calculated |
| Variance | Difference from target |

---

### 4.4 Multi Stage Setter QA Workflow

**Tab Location**: "Multi Stage Setter" tab

**Step 1: Machine Selection** (Same as Single Stage)

**Step 2: 18-Point Temperature Grid**

This is the key feature of Multi Stage QA - a grid representing physical positions in the incubator.

**Grid Structure:**
```
                 FRONT (Zone A)    MIDDLE (Zone B)    BACK (Zone C)
              ┌─────────────────┬─────────────────┬─────────────────┐
      TOP     │  Left  │ Right  │  Left  │ Right  │  Left  │ Right  │
              ├────────┼────────┼────────┼────────┼────────┼────────┤
      MID     │  Left  │ Right  │  Left  │ Right  │  Left  │ Right  │
              ├────────┼────────┼────────┼────────┼────────┼────────┤
      BOTTOM  │  Left  │ Right  │  Left  │ Right  │  Left  │ Right  │
              └────────┴────────┴────────┴────────┴────────┴────────┘
```

**Visual Elements:**
- **Zone Color Coding**: Front/A = Blue header, Middle/B = Green header, Back/C = Purple header
- **Each Cell**: Temperature input field accepting decimal values (e.g., 37.5)
- **Zone Averages**: Displayed in colored badges below each zone column
- **Overall Average**: Large display below the grid

**Flock & House Legend** (Above Grid):
- Shows colored badges for each zone
- Format: "FLOCK NAME (Number) - House #X"
- Color matches the zone it occupies

**Additional Tabs** (Same as Single Stage):
- Rectal Temps, Tray Wash, Cull Checks, Specific Gravity, Hatch Progression, Moisture Loss

---

## SECTION 5: DATA SHEET

**URL**: `/embrex-data-sheet`
**Access**: Click "Data Sheet" in sidebar

### 5.1 Header Controls

| Element | Position | Description |
|---------|----------|-------------|
| Page Title | Top-left | "Data Sheet" with subtitle "View and manage all hatchery data" |
| Show Percentages Toggle | Top-right area | Switch between showing raw counts or percentages |
| Refresh Button | Top-right | Circular arrow icon, reloads data |
| Timeline View Button | Top-right | Navigate to Timeline Analysis page |
| Export Dropdown | Top-right | Options: Download as CSV, Download as Excel |

---

### 5.2 Tab Navigation

Five tabs below header, displayed as horizontal buttons:

| Tab | Position | Data Displayed |
|-----|----------|----------------|
| Embrex/HOI | 1st (Default) | Clear counts, Injected counts, HOI% |
| Residue Analysis | 2nd | All mortality categories, residue metrics |
| Egg Quality | 3rd | Pack inspection results, grading |
| Hatch Results | 4th | Fertility%, HOF%, total hatched |
| Quality Assurance | 5th | Temperature and humidity readings |

---

### 5.3 Filter Controls

| Element | Position | Description |
|---------|----------|-------------|
| Filters Button | Left of search | Opens dialog with: Hatchery multi-select, Machine multi-select, Date Range pickers |
| Search Input | Right side of filter bar | Real-time text search across flock name, house number |
| Active Filters | Below filter bar | Blue chips showing applied filters with X to remove |

---

### 5.4 Data Table Structure

**Common Columns (All Tabs):**
| Column | Description | Position |
|--------|-------------|----------|
| Flock # | Flock number | 1st column |
| Flock Name | Full flock name | 2nd column |
| House # | House number | 3rd column |
| Age (weeks) | Flock age at set time | 4th column |
| Set Date | Date eggs were set | 5th column |

**Tab-Specific Columns:**

**Embrex/HOI Tab:**
| Column | Position After Common | Description |
|--------|----------------------|-------------|
| Total Eggs Set | 6th | Number of eggs set |
| Clears | 7th | Clear egg count or % |
| Injected | 8th | Eggs that received injection |
| Chicks Hatched | 9th | Total hatched chicks |
| HOI % | 10th | (Hatched / Injected) × 100 |

**Residue Analysis Tab:**
| Column | Description |
|--------|-------------|
| Sample Size | Eggs examined |
| Infertile | Infertile egg count |
| Early Dead | 0-7 day mortality |
| Mid Dead | 8-14 day mortality |
| Late Dead | 15-21 day mortality |
| Cull Chicks | Culled after hatch |
| Live Pips | Live pipped eggs |
| Dead Pips | Dead pipped eggs |
| Contaminated | Contaminated eggs |
| Malformed | Malformed chicks |
| Residue % | Calculated percentage |

**Actions Column (Far Right on All Tabs):**
| Icon | Action |
|------|--------|
| Pencil/Edit | Opens edit dialog for that row |
| Trash | Deletes record (with confirmation) |
| Eye | View full details in modal |

**Table Interactions:**
- **Column Headers**: Click to sort ascending/descending
- **Row Hover**: Row highlights with light background
- **Pagination**: Bottom of table shows page numbers, rows per page selector

---

## SECTION 6: LIVE TRACKING

**URL**: `/live-tracking`
**Access**: Dashboard → Analytics Dropdown → "Live Tracking" OR Command Palette

### 6.1 Page Header

| Element | Position | Description |
|---------|----------|-------------|
| Page Title | Top-left | "Live House Tracking" |
| Subtitle | Below title | "Real-time incubation progress and phase tracking" |
| Activity Icon | Left of title | Pulsing green dot when connected |

---

### 6.2 Tab Navigation

| Tab | Description |
|-----|-------------|
| Active Houses | Shows houses currently in incubation (In Setter or In Hatcher) |
| Completed Houses | Shows hatched houses from last 7 days |

---

### 6.3 Summary Statistics Bar

Horizontal row of statistic cards below tabs:

| Card | Color | Shows |
|------|-------|-------|
| Scheduled | Gray | Count of houses scheduled but not yet started |
| In Setter | Blue | Houses in Day 0-17 |
| In Hatcher | Orange | Houses in Day 18-21 |
| Critical Windows | Red/pulsing | Houses requiring attention today |
| Avg Progress | Blue | Average completion percentage |

---

### 6.4 Filter Bar

| Filter | Position | Options |
|--------|----------|---------|
| Hatchery | Left | All, DHN, SAM, TROY, ENT |
| Phase | Center-left | Scheduled, In Setter, In Hatcher, All Active |
| Critical Windows | Center | Candling (Day 10-13), Transfer (Day 17-19), Hatch (Day 20-22) |
| Search | Center-right | Text input for house, flock, machine |
| View Toggle | Right | Card Grid view or Table view |

---

### 6.5 House Cards (Card Grid View)

Each card displays:

**Card Header:**
| Element | Position | Description |
|---------|----------|-------------|
| House Number | Left, bold | e.g., "House #1005" |
| Phase Badge | Right | Blue "In Setter" or Orange "In Hatcher" |
| Critical Alert | Top-right corner | Red exclamation if action needed today |

**Progress Bar:**
- Visual timeline spanning width of card
- Three sections: Setting (gray) → Incubating (blue) → Hatching (orange)
- Current position marked with indicator

**Card Body:**
| Row | Left Side | Right Side |
|-----|-----------|------------|
| 1 | Flock name | Machine number |
| 2 | Set Date | Expected Hatch |
| 3 | Day of Incubation (bold) | Phase duration |

**Card Footer (Metrics):**
| Metric | Position | Color |
|--------|----------|-------|
| Fertility % | Left | Green if >85%, Yellow 75-85%, Red <75% |
| HOF % | Center | Same color coding |
| HOI % | Right | Same color coding |

**Card Click Actions:**
Clicking a card navigates based on current day:
- **Candling Window (Day 10-13)**: Opens QA Hub with machine pre-selected
- **Transfer Day (Day 17-19)**: Opens Transfer Manager
- **Hatch Day (Day 20-22)**: Opens Residue Analysis entry

---

## SECTION 7: MACHINE UTILIZATION

**URL**: `/machine-utilization`
**Access**: Dashboard → Analytics Dropdown → "Machine Utilization"

### 7.1 Filter Bar (Top of Page)

| Filter | Position | Description |
|--------|----------|-------------|
| Date From | Left | Calendar picker for start date |
| Date To | Left, after From | Calendar picker for end date |
| Hatchery | Center-left | Dropdown: All, DHN, SAM, TROY, ENT |
| Machine Type | Center | Dropdown: All, Setter, Hatcher, Combo |
| Mode | Center-right | Dropdown: All, Single Stage, Multi Stage |
| Machines | Right | Multi-select checkboxes for specific machines |
| Export | Far right | Dropdown: Export as Excel, Export as CSV |

---

### 7.2 KPI Cards Row

Four cards with colored top borders:

| Card | Border Color | Metrics Shown |
|------|--------------|---------------|
| Avg Setter Utilization | Blue | Percentage, total egg count |
| Avg Hatcher Utilization | Purple | Percentage, total egg count |
| Houses in Setters | Blue | Count of active Day 0-17 houses |
| Houses in Hatchers | Purple | Count of Day 18-21 houses |

---

### 7.3 Process Flow Diagram

Horizontal flow visualization:

```
[ENTERED SETTERS] ──→ [TRANSFERRED] ──→ [HATCHED]
    (Blue)             (Orange)         (Green)
    Egg icon          Refresh icon     Check icon
```

Each node shows:
- Count of houses in that stage
- Total eggs in that stage
- Click to filter machine grid by stage

---

### 7.4 Performance Rankings (Two Cards Side by Side)

| Card | Border Color | Content |
|------|--------------|---------|
| Top Performers | Green | List of 5 machines with highest HOF%, each showing machine number and percentage |
| Needs Attention | Orange | List of 5 machines with lowest HOF%, each showing machine number and percentage |

---

### 7.5 Machine Grid (Bottom of Page)

Cards for each machine:

**Card Content:**
| Element | Position | Description |
|---------|----------|-------------|
| Machine Number | Top-left, bold | e.g., "Setter 01" |
| Type Badge | Top-right | "Setter" (blue) or "Hatcher" (orange) |
| Status Indicator | Below number | Colored dot: Green=Available, Yellow=In-Use, Orange=Maintenance, Red=Offline |
| Utilization Bar | Center | Visual bar showing capacity usage |
| Eggs Loaded | Bottom-left | Current egg count |
| Capacity | Bottom-right | Maximum capacity |

**Card States:**
- **Available**: Green glow, can receive new eggs
- **In-Use**: Blue glow, currently holding batches
- **Maintenance Due**: Yellow warning icon
- **Offline**: Grayed out, red border

---

## SECTION 8: DAILY TASKS

**URL**: `/checklist`
**Access**: Click "Daily Tasks" in sidebar

### 8.1 Task Type Selection (Top of Page)

Two cards:
| Card | Description | Icon |
|------|-------------|------|
| House Daily Checklist | SOPs for specific house/batch | House icon |
| Machine Daily Checklist | Maintenance tasks for specific machine | Gear icon |

---

### 8.2 House Daily Checklist

**Selector:**
| Field | Position | Description |
|-------|----------|-------------|
| House Selector | Top of checklist | Dropdown listing all active houses |
| Day of Incubation | Next to selector | Auto-calculated, e.g., "Day 15" |

**Task Card Structure:**
| Section | Header Color | Description |
|---------|--------------|-------------|
| Required Tasks | Red | Must-complete items for this day |
| Optional Tasks | Blue | Recommended but not mandatory |

**Individual Task Items:**
| Element | Position | Description |
|---------|----------|-------------|
| Checkbox | Left | Click to mark complete |
| Task Title | Center-left | Name of the task |
| Task Description | Below title | Detailed instructions |
| Notes Field | Right | Optional text input for observations |
| Time Stamp | Far right | Shows completion time when checked |

---

### 8.3 Machine Daily Checklist

**Selector:**
| Field | Description |
|-------|-------------|
| Machine Selector | Dropdown listing all machines |
| Last Maintenance | Shows date of last completed maintenance |

**Task Sections:**
| Section | Description |
|---------|-------------|
| Required Maintenance | Critical tasks that update Last Maintenance date |
| Routine Checks | Standard inspection items |
| Optional Tasks | Recommended cleaning/calibration |

**Completing Required Maintenance** automatically updates the machine's "Last Maintenance" field in the database.

---

## SECTION 9: SMART ANALYTICS (AI CHAT)

**URL**: `/chat`
**Access**: Click "Smart Analytics" in sidebar

### 9.1 Interface Layout

| Element | Position | Description |
|---------|----------|-------------|
| Chat Message Area | Main center area | Scrollable conversation history |
| Message Bubbles | Left-aligned (AI) / Right-aligned (User) | Shows message text and timestamp |
| Input Bar | Fixed at bottom | Text input with send button |
| Microphone Icon | Left of input | Voice input (if supported) |
| Send Button | Right of input | Paper airplane icon |

---

### 9.2 Suggested Questions (Empty State)

When chat has no messages, shows grid of prompt buttons:

| Button Text | What It Does |
|-------------|--------------|
| "Show me today's house overview with charts" | Generates dashboard summary with visualizations |
| "Compare fertility rates between houses" | Creates comparison table and chart |
| "Generate performance trends for the last month" | Time-series analysis |
| "Show machine utilization analytics" | Machine usage breakdown |
| "What houses need attention today?" | Lists critical window houses |
| "Summarize this week's hatch performance" | Weekly performance report |

---

### 9.3 Response Types from AI

| Response Type | Description | Visual |
|---------------|-------------|--------|
| Text Summary | Bulleted or paragraph explanation | Plain text with markdown formatting |
| Data Table | Tabular data with sortable columns | Has "Download CSV" button |
| Line Chart | Trends over time | Interactive, hoverable points |
| Bar Chart | Comparisons between items | Colored bars with labels |
| Donut/Pie Chart | Proportional data | Percentage breakdown |
| Follow-up Buttons | Suggested next questions | Clickable chips below response |

---

## SECTION 10: MANAGEMENT (Admin Only)

**URL**: `/management`
**Access**: Click "Management" in sidebar (only visible to Company Admin role)

### 10.1 Settings Hub Layout

**Search Bar**: Top of page, filters settings by keyword

**Category Groups** (Accordion sections):
1. **Operations** - Daily workflows and automation
2. **Asset Management** - Hatcheries, flocks, machines
3. **Configuration** - SOPs, targets, rules
4. **Administration** - Users, logs, reports

---

### 10.2 Settings Pages Detail

#### 10.2.1 Hatchery Manager
**URL**: `/management/hatcheries`

| Element | Description |
|---------|-------------|
| Hatchery List | Table showing: Name, Code, Status, Machine Count |
| Add Hatchery Button | Top-right, opens creation dialog |
| Edit Button | Per row, pencil icon |
| Status Toggle | Per row, switch for Active/Inactive |

**Add/Edit Hatchery Dialog:**
| Field | Description |
|-------|-------------|
| Name | Full hatchery name (e.g., "DHN Hatchery") |
| Code | Short code (e.g., "DHN") |
| Description | Optional notes |
| Status | Active/Inactive dropdown |

---

#### 10.2.2 Flock Manager
**URL**: `/management/flocks`

| Element | Description |
|---------|-------------|
| Flock Table | Columns: Flock #, Name, Breed, Age, Hatchery, Bird Count, Status |
| Add Flock Button | Top-right |
| Import Button | Bulk import from Excel |
| Filter by Hatchery | Dropdown above table |

**Add/Edit Flock Dialog:**
| Field | Row/Position | Description |
|-------|--------------|-------------|
| Flock Number | Row 1, Col 1 | Unique numeric identifier |
| Flock Name | Row 1, Col 2 | e.g., "DOVE FARM" |
| Breed | Row 2, Col 1 | Dropdown: Ross 308, Cobb 500, etc. |
| Age (weeks) | Row 2, Col 2 | Current flock age |
| Arrival Date | Row 3, Col 1 | Date flock arrived |
| Total Birds | Row 3, Col 2 | Number of birds in flock |
| Hatchery Assignment | Row 4 | Multi-select: Which hatcheries can use this flock |
| Notes | Row 5 | Optional text area |

---

#### 10.2.3 Machine Manager
**URL**: `/management/machines`

| Element | Description |
|---------|-------------|
| Machine Table | Columns: Machine #, Type, Mode, Capacity, Hatchery, Status |
| Add Machine Button | Top-right |
| Status Filter | Dropdown: All, Operational, Maintenance, Offline |

**Add/Edit Machine Dialog:**
| Field | Description |
|-------|-------------|
| Machine Number | Unique identifier (e.g., "Setter 01") |
| Type | Dropdown: Setter, Hatcher, Combo |
| Mode | Dropdown: Single Stage, Multi Stage |
| Capacity | Maximum egg capacity |
| Hatchery | Which hatchery this machine belongs to |
| Status | Operational, Maintenance, Offline |
| Notes | Optional maintenance notes |

---

#### 10.2.4 User Manager
**URL**: `/management/users`

| Element | Description |
|---------|-------------|
| User Table | Columns: Name, Email, Role, Status, Last Login |
| Invite User Button | Top-right |
| Role Filter | Dropdown: All, Company Admin, Operations Head, Staff |

**User Roles:**
| Role | Permissions |
|------|-------------|
| Company Admin | Full access to all features including Management |
| Operations Head | Can view all data, enter data, manage flocks/machines |
| Staff | Can enter data, view own entries, complete checklists |

**Invite User Dialog:**
| Field | Description |
|-------|-------------|
| Email | Email address for invitation |
| First Name | User's first name |
| Last Name | User's last name |
| Role | Select from dropdown |

---

#### 10.2.5 Custom Targets
**URL**: `/management/targets`

| Element | Description |
|---------|-------------|
| Target Cards | Grouped by metric type |
| Add Target Button | Per card group |

**Target Types:**
| Metric | Default Value | Description |
|--------|---------------|-------------|
| Fertility % | 90% | Minimum acceptable fertility |
| HOF % | 87% | Hatch of Fertile target |
| HOI % | 85% | Hatch of Injection target |
| Clear % | 5% | Maximum acceptable clears |
| Moisture Loss % | 12% | Target weight loss |

**Add/Edit Target Dialog:**
| Field | Description |
|-------|-------------|
| Metric | Dropdown selection |
| Target Value | Number input with % |
| Scope | Global, Hatchery-specific, or Flock-specific |
| Effective From | Start date |
| Effective To | End date (optional) |

---

#### 10.2.6 House Status Automation
**URL**: `/management/automation`

**Purpose**: Configure rules for automatic house status changes

**Rule Cards:**
| Rule | From Status | To Status | Trigger |
|------|-------------|-----------|---------|
| Start Incubation | Scheduled | In Setter | Set date reached |
| Transfer Ready | In Setter | In Hatcher | Day 18 reached + Candling done |
| Hatch Complete | In Hatcher | Completed | Day 21 + Residue entered |

**Rule Configuration:**
| Field | Description |
|-------|-------------|
| Enable/Disable | Toggle switch per rule |
| Days Required | Minimum days before transition |
| Data Required | Checkboxes: Fertility Data, QA Data, Residue Data |
| QA Checks Required | Number of QA entries needed |

---

#### 10.2.7 SOP Manager
**URL**: `/management/sop`

**Purpose**: Create standard operating procedure templates for specific incubation days

**SOP List:**
| Column | Description |
|--------|-------------|
| Title | SOP name |
| Day | Day of incubation (0-21) |
| Category | Pre-Set, Incubation, Transfer, Hatch, Post-Hatch |
| Status | Active/Inactive |

**Create SOP Dialog:**
| Field | Description |
|-------|-------------|
| Title | SOP name (e.g., "Day 10 Candling Procedure") |
| Day of Incubation | Which day this applies |
| Category | Select from dropdown |
| Description | Brief overview |
| Steps | Rich text editor for detailed instructions |
| Attachments | Optional file uploads (images, PDFs) |

---

#### 10.2.8 Activity Log
**URL**: `/management/activity-log`

**Purpose**: Audit trail of all user actions

**Log Table Columns:**
| Column | Description |
|--------|-------------|
| Timestamp | Date and time of action |
| User | Who performed the action |
| Action | What was done (Created, Updated, Deleted, Viewed) |
| Resource | What was affected (House, Flock, Machine, etc.) |
| Details | Expandable row showing old/new values |

**Filters:**
| Filter | Options |
|--------|---------|
| Date Range | Start and end date pickers |
| User | Dropdown of all users |
| Action Type | Created, Updated, Deleted, Login, Logout |
| Resource Type | House, Flock, Machine, User, etc. |

---

#### 10.2.9 Reports Manager
**URL**: `/management/reports`

**Report Types Available:**
| Report | Description |
|--------|-------------|
| House Report | Single house full history and metrics |
| Weekly Summary | All hatchery activity for past week |
| Flock Performance | Analysis by flock across houses |
| Machine Efficiency | Utilization and performance by machine |
| Custom Report | Build your own with selected metrics |

**Generate Report Dialog:**
| Field | Description |
|-------|-------------|
| Report Type | Select from above |
| Date Range | Start and end dates |
| Hatcheries | Multi-select (or All) |
| Flocks | Multi-select (or All) |
| Format | PDF or Excel |
| Email | Optional - send to email when complete |

---

## SECTION 11: USER PROFILE & SETTINGS

**URL**: `/profile`
**Access**: Click avatar in top-right → "Profile"

### 11.1 Profile Page Layout

**Header:**
- Large avatar (clickable to change)
- Full name
- Email address
- Role badge

**Personal Information Card:**
| Field | Description |
|-------|-------------|
| First Name | Editable text input |
| Last Name | Editable text input |
| Phone Number | Editable, optional |
| Update Button | Saves personal info changes |

**Security Card:**
| Field | Description |
|-------|-------------|
| Current Password | Required to change password |
| New Password | With strength indicator |
| Confirm Password | Must match new password |
| Change Password Button | Saves password change |

**Email Change Card:**
| Field | Description |
|-------|-------------|
| New Email | Email input field |
| Send Verification | Button to send confirmation link |
| Note | Email change requires verification |

**Two-Factor Authentication Card:**
| Element | Description |
|---------|-------------|
| Status | Enabled/Disabled badge |
| Enable 2FA Button | Opens setup flow with QR code |
| Disable 2FA Button | Requires current password confirmation |
| Recovery Codes | View/regenerate recovery codes |

---

## SECTION 12: TERMINOLOGY REFERENCE

| System Term | User-Facing Term | Notes |
|-------------|------------------|-------|
| Batch | House | A single incubation cycle |
| batch_number | House Number | Identifier for the house |
| Unit | Hatchery | Physical facility |
| unit_id | Hatchery | Database reference |
| HOI | Hatch of Injection | (Hatched / Injected) × 100 |
| HOF | Hatch of Fertile | (Hatched / Fertile) × 100 |
| Single Setter | Single Stage Setter | Single-stage incubation |
| Multi Setter | Multi Stage Setter | Multi-stage incubation |

**IMPORTANT**: Never use "Batch" or "Unit" in user-facing communication. Always say "House" and "Hatchery" respectively.

---

## SECTION 13: STATUS LIFECYCLE

| Status | Day Range | Color | Description |
|--------|-----------|-------|-------------|
| Scheduled | Before Day 0 | Gray | House created but eggs not set |
| In Setter | Day 0-17 | Blue | Eggs in setter machine |
| In Hatcher | Day 18-21 | Orange | Eggs transferred to hatcher |
| Completed | After Day 21 | Green | Hatch complete, data finalized |

**Critical Windows:**
| Window | Days | Action Required |
|--------|------|-----------------|
| Candling | Day 10-13 | QA check for fertility verification |
| Transfer | Day 17-19 | Move eggs from setter to hatcher |
| Hatch | Day 20-22 | Monitor hatch, enter residue data |

---

## SECTION 14: COMMON USER QUESTIONS

### Q1: "Where do I find the Fertility percentage?"
**Answer**: Fertility % can be found in multiple places:
1. **Dashboard**: KPI cards at top, second card from left
2. **House Cards**: Bottom of each card in Detailed view mode
3. **Data Sheet**: "Hatch Results" tab, Fertility % column
4. **Live Tracking**: Bottom metrics row on each house card

---

### Q2: "How do I enter data for a house?"
**Answer**:
1. Click "Data Entry" in the left sidebar
2. Find and click the house card you want to enter data for
3. Select the data type (Fertility, Residue, Clears, or Egg Pack)
4. Fill in the required fields
5. Click "Save" at the bottom

---

### Q3: "Where is the Machine Capacity information?"
**Answer**:
1. Go to "Management" in the sidebar (Admin only)
2. Click "Machine Manager" under Asset Management
3. The table shows "Capacity" column for each machine
4. Click the edit (pencil) icon on any machine row to view/edit capacity

---

### Q4: "How do I see which houses need attention today?"
**Answer**:
1. Go to "Live Tracking" (Dashboard → Analytics dropdown → Live Tracking)
2. Look at the "Critical Windows" card in the summary row
3. Use the "Critical Windows" filter to show only houses needing action
4. Alternatively, use Smart Analytics and ask "What houses need attention today?"

---

### Q5: "How do I export data?"
**Answer**:
1. **Dashboard**: Click the download icon (arrow pointing down) in top-right
2. **Data Sheet**: Click "Export" dropdown → Choose CSV or Excel
3. **Machine Utilization**: Click "Export" dropdown → Choose format
4. **Reports**: Go to Management → Reports → Generate custom report

---

### Q6: "Where do I change my password?"
**Answer**:
1. Click your avatar/initials in the top-right corner
2. Select "Profile" from the dropdown
3. Scroll to the "Security" card
4. Enter your current password, then new password twice
5. Click "Change Password"

---

### Q7: "How do I add a new flock?"
**Answer** (Admin only):
1. Click "Management" in the sidebar
2. Click "Flock Manager" under Asset Management
3. Click "+ Add Flock" button (top-right)
4. Fill in: Flock Number, Name, Breed, Age, Arrival Date
5. Select which Hatcheries can use this flock
6. Click "Create Flock"

---

### Q8: "What does the red badge on a house card mean?"
**Answer**: The red badge indicates the house is in a "Critical Window" and needs attention:
- **Candling Window (Day 10-13)**: Time for fertility QA check
- **Transfer Window (Day 17-19)**: Time to move eggs to hatcher
- **Hatch Window (Day 20-22)**: Time to monitor hatch and enter residue

Click the card to be taken to the appropriate action.

---

### Q9: "Why can't I see the Management section?"
**Answer**: The Management section is only visible to users with the "Company Admin" role. Regular staff and operations users don't have access. Contact your Company Admin if you need to change settings.

---

### Q10: "How do I view previous QA entries?"
**Answer**:
1. Go to "QA Hub" in the sidebar
2. Look for "Recent Entries" section at the bottom
3. Or go to "Data Sheet" → "Quality Assurance" tab
4. Use filters to find specific date ranges or machines

---

### Q11: "Where is the HOI percentage field in Residue Analysis?"
**Answer**: In the Residue Analysis form:
1. HOI % is displayed in the **Summary Card** on the right side
2. It's auto-calculated: (Chicks Hatched / Eggs Injected) × 100
3. The "Eggs Injected" value comes from the Clears & Injected entry (read-only)
4. You cannot manually edit HOI % - it updates automatically when you save

---

### Q12: "How do I search for a specific house quickly?"
**Answer**:
1. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows) to open Command Palette
2. Type the house number or flock name
3. Click the result to navigate directly
4. OR use the search bar at the top of Dashboard, Data Entry, or Data Sheet pages

---

*Last Updated: January 2026*
*Version: 1.0*
