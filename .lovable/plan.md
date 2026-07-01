## What I found in the data

Pulled the actual rows for flocks 6342 / 6343 straight from the database:

- Flock 6343 "Hen valley" exists as **two separate `flocks` rows** with different `flock_id`s — one per hatchery (`3348bd29…` on ENT-01, `719c85f6…` on the other). Total eggs: 120,000 + 92,000 = 212,000.
- Flock 6342 "sun valley" exists as **two separate `flocks` rows** — one on DHN-09, one on ENT-26. Total eggs: 28,000 + 28,000 = 56,000.

This matches the project's documented multi-hatchery pattern: the same flock number is re-created as a fresh `flocks` row for each hatchery it's placed into.

## Why By Flock still shows duplicates

My last fix keyed the grouping by `flock_number + normalized(flock_name)`. That should have collapsed them, but two things can still split the buckets in production data:

1. **Case / whitespace drift in `flock_name`** — e.g. "Hen valley" vs "Hen Valley " on one row. `normalizeName` handles it, but any hidden character (non-breaking space, tab) survives.
2. **A trailing enrichment field polluting the key** — not currently the case, but adding name to the key adds fragility without upside: the client's mental model is that flock number is the identity.

Since the memory rule `[Flock Mult-Hatchery Setup]` says flock numbers are intentionally re-used across hatcheries as the same logical flock, grouping by **flock number alone** is the correct identity for the By Flock view.

## The change

**`src/components/dashboard/FlockSummaryView.tsx`**

1. Change the group key from `flock_number + name` to just the normalized flock number.
2. Skip rows with a blank/null flock number (they can't be grouped meaningfully — surface them separately at the bottom of the table instead of merging them into an "empty" bucket).
3. Show the farm/flock name from the first row of the group, and if names diverge across the group (rare), append a subtle "+N variants" chip so the user knows.
4. Keep the existing badge showing house/machine count and the proportional save logic — those already handle multi-hatchery slices correctly because `batch_slices` is collected from every row in the group regardless of `flock_id`.

## Expected result after the change

```text
Flock  Farm         Age  Eggs Set   Hatch  Hatch%  Culls  Cull%  Clear
6343   Hen valley   46   212,000    [   ]  0.0%    [   ]  0.0%   [   ]   (2 houses)
6342   sun valley   55    56,000    [   ]  0.0%    [   ]  0.0%   [   ]   (2 houses)
6420   Ammu Valley  41    10,000    [   ]  0.0%    [   ]  0.0%   [   ]
…
```

Editing Hatch / Clear / Culls on the 6343 row will split proportionally by egg share (120k / 212k → 56.6% to ENT-01's batch, 92k / 212k → 43.4% to the other), writing straight into the `batches` table for those two houses.

## If it's still duplicated after this ships

Fall-through diagnostic (only if needed): add a one-time `console.debug` in the grouping loop printing the raw `flock_number` bytes and length for each row, so we can catch invisible-character contamination if it ever recurs.
