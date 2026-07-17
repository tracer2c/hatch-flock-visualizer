## Goal
Ship a lightweight changelog system so users see a "What's new" modal once per new release, and can browse full history anytime at `/changelogs`. Content stays in user-friendly language (no tech jargon).

## How it works
1. Changelog entries are stored as a static, versioned list in code (`src/data/changelog.ts`) — no DB table needed. Each entry: `version`, `releaseDate`, `title`, `highlights` (4–6 short bullets), optional `category` tags (New, Improved, Fixed).
2. The latest `version` string is the "current" release. On app load, we compare it to the version the user last acknowledged, stored in `localStorage` under `hp:lastSeenChangelogVersion` (scoped per user id when signed in: `hp:lastSeenChangelogVersion:<uid>`).
3. If the stored version is missing or older than current → show `WhatsNewDialog` once. Clicking "Got it" (or closing) writes the current version to localStorage so it never reappears until the next release.
4. First-ever visitors (no stored value) get the modal seeded to current version silently — they don't get spammed with old releases. Only actual version bumps trigger the modal.
5. A "View full changelog" link in the modal, and a sidebar item under the "Admin" (or footer) group, routes to `/changelogs` — a clean timeline page listing every release with date, title, and bullets, newest first.

## Files to add
- `src/data/changelog.ts` — typed array of releases (source of truth).
- `src/components/changelog/WhatsNewDialog.tsx` — shadcn Dialog with UUI styling, highlights list, category chips, "View full changelog" link.
- `src/hooks/useWhatsNew.ts` — reads current version, compares with localStorage, exposes `{ open, setOpen, entry }`.
- `src/pages/ChangelogsPage.tsx` — timeline view (uses existing card + typography tokens; internal scroll only, matches recent single-page layout preference).

## Files to edit
- `src/App.tsx` — mount `<WhatsNewDialog />` inside the authenticated layout so it appears on first refresh after deploy; add route `/changelogs`.
- `src/components/ModernSidebar.tsx` — add "What's new" link in the Admin group (with a small dot indicator when unseen).
- `src/lib/breadcrumbRoutes.ts` — register `/changelogs` → "What's New".

## Seed content — v1.3 (today's release, user-language)
Push platform to **v1.3.0** with these highlights covering today's work:
- **Redesigned Data Sheet** — cleaner single-row toolbar, expandable search, click any row to edit instantly.
- **Smarter filters** — Machines filter now groups by hatchery with search and quick select; only relevant machines appear.
- **Refined navigation** — slim collapsible sidebar with modern icons, brand moved to top bar, no duplicate labels.
- **Better breadcrumbs** — every step is clickable and remembers your selected week, so back never dumps you at the dashboard.
- **HatchAI Assistant** — renamed from Smart Analytics, with richer formatted responses and charts.
- **QA Hub polish** — unified date selector, room-based humidity with "+ Add Room" shortcut, technician auto-filled from your profile.

Also include a couple of prior releases in the history for context:
- **v1.2** — Weekly Flock Rollup, flock-scoped entries (Egg Pack, Fertility, Residue), HOF/HOI fallback calculations.
- **v1.1** — QA Hub reorganization (Machine / Room / Flock scopes), Tray Wash PPM columns, resumable day-scoped entries.

## Out of scope (can be added later)
- Admin UI to edit changelog entries from the app (currently code-managed — fastest and versioned with the deploy).
- Email / push notifications for new releases.
- Per-entry "read more" detail pages.
