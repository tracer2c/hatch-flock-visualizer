

## Fix: Update vite.config.ts to Stop Service Worker from Blocking Sign-In

### What to Change

In `vite.config.ts`, make **two small additions** inside the `workbox` section:

---

### Change 1: Add Auth Rules to runtimeCaching

Find the line that says `runtimeCaching: [` (around line 68) and add these two blocks **immediately after it**, before the existing GET/POST rules:

```typescript
runtimeCaching: [
  // NEW: Auth requests must ALWAYS bypass service worker
  {
    urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/i,
    handler: 'NetworkOnly',
    method: 'POST',
    options: {
      cacheName: 'supabase-auth-no-cache',
    }
  },
  {
    urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/i,
    handler: 'NetworkOnly',
    method: 'GET',
    options: {
      cacheName: 'supabase-auth-get-no-cache',
    }
  },
  // ... all existing rules stay exactly as they are below
```

---

### Change 2: Update navigateFallbackDenylist

Find this line:

```typescript
navigateFallbackDenylist: [/^\/api/, /^\/auth\/callback/],
```

Change it to:

```typescript
navigateFallbackDenylist: [/^\/api/, /^\/auth\/callback/, /^\/auth\/v1/],
```

---

### That's It -- Just Those Two Changes

After saving and publishing, the updated service worker will auto-install on Corey's and your tablets the next time you open the app in Chrome. Sign-in requests will go straight to Supabase without any interference.

