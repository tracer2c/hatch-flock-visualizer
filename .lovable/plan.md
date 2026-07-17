## Goal
Refactor `src/components/ModernSidebar.tsx` so it feels like a deliberate enterprise sidebar: narrower, tighter spacing, independently scrolling nav, fixed footer, and a cleaner active state — following the spec the user pasted.

## Scope
Frontend only. Single file: `src/components/ModernSidebar.tsx`. No route, permission, or nav-content changes.

## Layout & dimensions
- Sidebar width: expanded **264 px**, collapsed rail **72 px** (currently 260 / 56).
- Enforce three fixed regions using flex on the `Sidebar` root:
  - `SidebarHeader` — `h-20`, shrink-0, brand left + collapse button right (single button, no floating tooltip below).
  - `SidebarContent` — `flex-1 overflow-y-auto px-3 py-4` (independent scroll).
  - `SidebarFooter` — `shrink-0 border-t`, target ~150–165 px.
- Remove the current `pt-14` header padding hack; brand + collapse live inside the 80 px header.

## Header
- Left: `Hatchery Pro` wordmark, 20 px, `font-semibold`, hidden when collapsed.
- Right: collapse button (`PanelLeftClose`, rotates 180° when collapsed), 28 px hit area, centered when collapsed.
- No secondary/floating collapse trigger below the header.

## Navigation spacing
- Group label: `text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`, `mt-6 mb-2 px-3` (first group `mt-0`).
- Item: `h-11`, `rounded-xl`, `px-3`, `gap-3`, icon `h-5 w-5`, text `text-[15px]`.
- Gap between items: `gap-1` (4 px).
- Active item:
  - `bg-primary/10 text-primary font-medium` (slightly stronger than today).
  - Left indicator: `absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary` — inset 4 px from the sidebar edge (achieved by removing the current outer border overlap; indicator sits inside the item).
  - Pill no longer spans edge-to-edge — item has `mx-0` inside the `px-3` nav container so the rounded background is inset.
- Hover (inactive): `hover:bg-muted/60 hover:text-foreground`.

## Nested items (Data Entry, QA Hub, Management)
- Parent is expandable; chevron on the right, rotates 90° when open.
- Children only render when parent is open.
- Children container: `ml-6 border-l border-border pl-3 mt-1 space-y-0.5`.
- Child row: `h-10 rounded-lg px-2 gap-2 text-sm text-muted-foreground`.
- Active child: `bg-primary/10 text-primary font-medium` (no left bar on children).
- In collapsed rail, sub-items are hidden; hovering the parent icon shows the existing shadcn tooltip.

## Footer
- Compact two-item nav row (Support, Settings), same `h-11` styling as main nav but no group label.
- Divider (`border-t`) above the profile row.
- Profile row: `h-14`, avatar 32 px + name only (no email inline). Email moves to `title` tooltip.
  - `[SN] Sai Sruthi` on line 1, `View profile` in `text-[11px] text-muted-foreground` on line 2.
- When collapsed: only avatar shown, centered; Support/Settings become icon-only with tooltips.

## Collapsed rail (72 px) behaviour
- Set `--sidebar-width-icon: 72px`.
- Header: only the collapse button, centered.
- Items: icon centered, label hidden, tooltip via shadcn `SidebarMenuButton` `tooltip` prop (already wired).
- Nested items and chevrons hidden.
- Footer: Support/Settings icons + avatar only.

## Active-state logic
Keep existing `isParentActive` / `isSubActive`. No changes to route detection or `useExpanded` persistence.

## Out of scope
- Nav content, groupings, and permissions unchanged.
- No changes to `TopBar`, `AppBreadcrumbs`, or routes.
- No new dependencies.

## Verification
- Build passes.
- Visual pass at 967 px viewport (current preview): sidebar 264 px, brand + collapse in header, groups tightly spaced, active Dashboard shows inset bar + inset pill, footer sits at bottom with Support/Settings + compact profile.
- Collapsed: 72 px rail, icons centered, tooltips work, footer avatar centered.
- Nested Weekly Rollup only visible when Data Entry is expanded; guide line visible.
