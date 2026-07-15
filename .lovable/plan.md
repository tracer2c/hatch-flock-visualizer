## Why you're seeing "You're offline / Sign in online first"

- `src/components/OfflineBanner.tsx` renders the orange banner whenever `navigator.onLine === false`.
- `src/components/ProtectedRoute.tsx` (lines 29–42) shows the "Sign in online first" screen when there's no session AND `navigator.onLine === false`, instead of redirecting to `/auth`.
- The browser is reporting `onLine: false` (leftover PWA/SW state, VPN, or a flaky signal). Because this app is **cloud-only — offline is not supported** (project memory), that entire code path should not exist.

## Fix (frontend only, no logic change)

1. **`src/components/ProtectedRoute.tsx`** — remove the `useOnlineStatus` import and the `if (!isOnline)` branch. When there is no user, always `Navigate to="/auth"`.
2. **`src/App.tsx`** — remove the `<OfflineBanner />` render (and its import) so the orange top banner never appears.
3. Leave `useOnlineStatus`, `OfflineBanner.tsx`, and the offline queue files on disk untouched (they're referenced by unrelated hooks/services); we just stop rendering the offline UI. No behavior change for online users.

## Result

- No more orange "You're offline" banner.
- Unauthenticated visits go straight to the login page instead of the offline placeholder.
- Everything else stays the same.