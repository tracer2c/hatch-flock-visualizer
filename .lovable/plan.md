

## Documentation Page Updates

### Changes

1. **Add internet requirement notice** at the very top of the document (inside the white paper content, after the cover page area), a prominent red-colored text banner stating that this application requires an active internet connection to function properly in the current version.

2. **Remove the "Offline-First PWA" card** from Section 1 (Introduction > Key Value Propositions) -- the icon card on line 72 that says "Full functionality without internet -- data syncs automatically when connectivity returns."

3. **Remove or update the "Offline Mode (PWA)" card** from Section 13 (Advanced Features) on line 342 that describes the installable PWA with IndexedDB caching.

4. **Remove the PWA glossary entry** from Section 17 (Glossary) on line 419.

### Technical Details

**File to modify:** `src/pages/DocumentationWhitePaper.tsx`

- After `<DocCoverPage />` and `<DocTableOfContents />` (around line 56), insert a red notice block:
  ```jsx
  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 text-center mb-6">
    <p className="text-red-600 font-bold text-lg">
      This application requires an active internet connection to function properly.
    </p>
    <p className="text-red-500 text-sm mt-1">
      The current version does not support offline usage. Please ensure you have a stable internet connection before using the system.
    </p>
  </div>
  ```
- Remove the `Offline-First PWA` DocIconCard from the Introduction grid (line 72)
- Remove the `Offline Mode (PWA)` DocIconCard from Advanced Features (line 342)
- Remove the PWA row from the Glossary table (line 419)

