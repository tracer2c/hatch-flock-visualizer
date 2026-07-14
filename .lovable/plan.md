## What's actually happening

Nothing was removed from source. The current code still has the grouped sidebar (Monitor / Data / Quality / Intelligence / Admin), the Support/Settings footer + user card, and the `WeekPickerCard` with the preset rail. Your screenshot shows an older build ("v1.2" footer, flat sidebar list, plain calendar) — that's a stale **service worker** (`vite-plugin-pwa`) still serving cached HTML/JS in your browser, even after hard refresh.

Root cause:
- `vite.config.ts` registers `vite-plugin-pwa` with `registerType: 'autoUpdate'` and auto-injects registration.
- It registers even in Lovable preview, so the preview iframe is pinned to the SW's cached bundle.
- Once installed, hard-refresh doesn't help — only a replacement worker at the same `/sw.js` path can evict it.

## Fix — kill-switch worker (per Lovable PWA skill)

### 1. Remove `vite-plugin-pwa` from `vite.config.ts`
- Delete the `VitePWA({...})` plugin block and its import.
- No new SW will be generated; the old one remains registered in browsers until the kill-switch runs.

### 2. Ship a kill-switch worker at `public/sw.js`
Same path the old SW lived at, so returning browsers pick it up on next navigation. It:
- `skipWaiting` + `clients.claim()` immediately.
- Deletes only Workbox caches scoped to this registration (leaves any Firebase Messaging / OneSignal caches alone).
- Reloads open clients so they get the fresh HTML/JS.
- Calls `registration.unregister()` in `finally` so future loads have no SW at all.

Exact worker body from the PWA skill (no modifications).

### 3. Also ship `public/service-worker.js` with the same kill-switch body
Belt-and-braces in case an older build ever registered at that path.

### 4. Note on push notifications
`src/hooks/usePushNotifications.ts` uses `navigator.serviceWorker.ready`, which currently resolves against the Workbox SW. After the kill-switch runs there is no app SW, so push subscription calls will hang until a dedicated messaging worker is added. Out of scope for this fix — flag it, don't rebuild it now.

## Verification

- Typecheck.
- In the preview: reload once → kill-switch installs → reload again → new bundle loads and the grouped sidebar, footer user card, and calendar preset rail all appear.
- DevTools → Application → Service Workers should show "no service workers" after the second reload.
- No further hard-refresh required for other users; their next visit auto-evicts.

## Out of scope

- Rebuilding offline support or push notifications.
- Any UI/design change — the components are already correct in source.
