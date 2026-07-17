# Top nav, sidebar, and Filter dialog cleanup

Three focused fixes, all UI-only. No business logic changes.

## 1) Top nav (`src/components/TopBar.tsx`)

- Remove the **back arrow** button (the `!isOnDashboard && <ArrowLeft />` block). Breadcrumbs + per-page smart-back already cover this.
- Remove the **"Hatchery Pro"** gradient title. The brand lives inside the sidebar now.
- Keep the sidebar toggle button, but restyle it to match the reference: a small square icon button using the same `PanelLeft` / `PanelLeftClose` glyphs, subtle border, no primary-tint hover — matching the "panel" icon in image 1/2.
- Net effect: the left edge of the top bar becomes just the panel-toggle icon, freeing horizontal space.

## 2) Sidebar collapse into an icon rail (`src/components/ModernSidebar.tsx` + `src/components/ui/sidebar.tsx`)

Right now the sidebar uses `collapsible="offcanvas"`, so "collapse" hides it completely. The reference (image 3) wants a **thin icon-only rail** when collapsed.

- Switch the desktop sidebar to `collapsible="icon"` (keep offcanvas behavior on mobile as-is).
- Set `--sidebar-width-icon` to about **56px** so it matches the reference rail width.
- In collapsed state:
  - Hide group headings ("Monitor", "Data", …), the expand chevron on parent items, and the sub-menu tree.
  - Render each top-level item as a **centered icon-only button** with a tooltip showing the label (shadcn `SidebarMenuButton` already supports `tooltip` prop).
  - Active item gets the same `bg-primary/10 text-primary` treatment as today, rendered as a rounded square, matching image 3's highlighted Home icon.
  - Footer collapses to just the avatar circle (image 3 shows a single "P" avatar pinned at the bottom).
- In expanded state: keep the current 260px layout exactly as it is (image 2 style — sections with subheadings, search-like feel already present via CommandPalette in the top bar).
- Add an in-sidebar collapse button at the top-right of the sidebar header (small `PanelLeftClose` icon) so users can collapse from inside the sidebar too — mirrors the icon in image 2's top-right corner. Clicking it calls `toggleSidebar()`.

Detection of collapsed state uses `useSidebar().state === "collapsed"`.

## 3) Data Sheet Filter dialog (`src/components/dashboard/DataSheetCenteredFilterDialog.tsx`)

Fix the "double close" and give it a finished look.

**Double-close fix**
- shadcn's `DialogContent` already renders its own top-right `×` close button. Remove the redundant custom `<Button>X Clear</Button>` from the header. Move the **Clear** action to the footer (left side) as a text button — a common pattern that pairs naturally with Cancel/Apply on the right.

**Modern layout**
- Widen slightly (`max-w-[720px]`), increase padding, add a short helper subtitle under the title ("Refine what's shown in the data sheet").
- Group each section into a **soft card** (`rounded-xl border bg-muted/30 p-4`) with a small colored icon next to the section title:
  - Sorting → `ArrowUpDown`
  - Date Range → `CalendarRange`
  - Technician → `UserSearch`
  - Hatcheries → `Building2`
  - Machines → `Cpu`
- Replace the plain checkbox lists for Hatcheries and Machines with a **chip/toggle grid** (`flex flex-wrap gap-2` of pill buttons that toggle `selected`/`unselected`) — same data, denser and more modern than a scrolling checkbox column. Add a small "Select all / Clear" mini-link above each grid.
- Show a live **active-filter count pill** next to the title (e.g. "Filter Options · 3 active").
- Footer: `Clear all` on the left (ghost, disabled when nothing is set), `Cancel` + `Apply Filters` on the right. Apply button keeps the check icon.
- Respect existing draft-then-apply behavior — no logic changes to `handleApply` / `setFilters`.

## Out of scope
- No routing, permissions, data, or breadcrumb changes.
- Command palette (`⌘K`) stays in the top bar unchanged.
- Mobile sidebar keeps its current offcanvas + overlay behavior.

## Verification
- Toggle sidebar on desktop: rail appears at ~56px, icons centered, tooltips on hover, active item highlighted.
- Top bar shows only: sidebar toggle · (spacer) · search · analytics · home · bell · avatar.
- Open Filters in Data Sheet: single close (top-right ×), sections in cards, hatchery/machine chips toggle, footer has Clear/Cancel/Apply.
