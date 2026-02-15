

## Fix: Auto-Redirect on Invalid Session

### Problem
When a user's refresh token expires or becomes invalid, the app silently fails and keeps redirecting to the dashboard instead of sending the user to the login page. This is what Sruthi is experiencing -- every page navigation reloads back to the dashboard because the auth session cannot be refreshed.

### Immediate Fix (for Sruthi)
Sruthi should clear her browser data for the published app or visit `/auth` directly to sign in fresh. This will establish a new valid session.

### Code Fix
Update `useAuth.ts` to detect the `TOKEN_REFRESHED` failure and `SIGNED_OUT` events, then clear local state and let `ProtectedRoute` redirect to `/auth`.

**File: `src/hooks/useAuth.ts`**

In the `onAuthStateChange` callback, add handling for the `SIGNED_OUT` event to immediately clear state, and add an error handler in `getSession` to catch invalid refresh tokens:

```typescript
// In onAuthStateChange handler, add explicit SIGNED_OUT handling:
if (event === 'SIGNED_OUT') {
  setUser(null);
  setSession(null);
  setProfile(null);
  setRoles([]);
  setMfaStatus({ hasMFA: false, factors: [], isVerified: false });
  setLoading(false);
  return;
}
```

Also add a global auth error listener to catch refresh token failures and force sign-out:

```typescript
// After getSession, add error recovery:
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && !session) {
    // Token refresh failed - force clean sign out
    supabase.auth.signOut();
  }
});
```

### Impact
- Users with expired/invalid sessions will be automatically redirected to the login page instead of getting stuck in a reload loop
- No impact on users with valid sessions
- Single file change in `useAuth.ts`
