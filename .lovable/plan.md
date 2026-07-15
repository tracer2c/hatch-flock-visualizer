## Why you're seeing the Lovable logo

Your `index.html` points to `/uploads/dc09391b-...png` for `rel="icon"`, but browsers *also* auto-request `/favicon.ico` at the site root. The file `public/favicon.ico` is still the **default Lovable icon** that ships with every new project — that's what's showing in the tab (especially on published/custom domain builds and after browser cache).

`public/pwa-192x192.png` and `public/pwa-512x512.png` (used for the installed PWA icon and Apple touch icon) are likely also the Lovable defaults.

## Fix plan

1. **Replace the branded favicon source.** Use the existing Hatchery Pro logo at `/uploads/dc09391b-b8b4-4ebe-956c-6977f2d8e528.png` (already referenced in `index.html`) as the master.
2. **Overwrite `public/favicon.ico`** with a copy of that logo (renamed) so the default browser request stops returning the Lovable mark.
3. **Regenerate `public/pwa-192x192.png` and `public/pwa-512x512.png`** from the same logo so installed-app and Apple touch icons match the brand.
4. **Bump the icon cache-buster** in `index.html` by appending `?v=2` to the `rel="icon"` and `apple-touch-icon` hrefs so browsers/service workers stop serving the old cached Lovable icon.
5. Leave `index.html` metadata otherwise unchanged.

## Confirm before I build

Do you want me to reuse the existing Hatchery Pro logo (`/uploads/dc09391b-...png`) for the favicon, or do you have a different icon image you'd like uploaded?