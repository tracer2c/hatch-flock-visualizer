## Audit — "Resume today's partial entry" + "clock defaults to now" across the app

Corey's ask, in plain terms:

- When a form is a **multi-check daily log** (Tray Wash = 5 PPM + 3 temp checks), the user often can't finish it in one sitting. If they enter 1–2 checks, leave, and come back the same day, the form should be **pre-populated with what they already saved** so they can continue.
- **Time inputs** should default to the user's **current local time** when the picker is opened/focused (right now most time fields default to empty or `--:-- --`).
- When they **navigate to a previous day**, they should be able to **see the saved values (read-only)** — never lose historical context, but also don't let them edit yesterday's numbers by accident.

Everything below is what I found and what I'd change. No code yet — just the audit + fix map.

---

### 1. Audit results — which pages have this pattern

| Screen | Multi-part daily entry? | Currently resumes today's partial data? | Time field default = now? | Historical (past date) view? |
|---|---|---|---|---|
| **QA Hub → Tray Wash** | ✅ 3 temp + 5 PPM in one daily row | ❌ Blank on reload — user loses prior checks | ❌ PPM time fields blank | ❌ No past-day view |
| **QA Hub → Rectal Temps** | ✅ many readings per day (hatcher / chick room / separator) | ❌ Form clears after each save; no list of today's readings | ⚠️ Time set once at mount, doesn't refresh between readings | ❌ Only global "Recent Entries" table |
| **QA Hub → Culls** | ✅ multiple checks per flock/day | ❌ No today-list; no check time field at all | n/a | ❌ |
| **QA Hub → Specific Gravity** | ⚠️ usually one per flock/week, but re-tests happen | ❌ | n/a | ❌ |
| **QA Hub → Hatch Progression** | ✅ multiple hour checks per machine/day (Stage A/B/C) | ❌ | ❌ `checkHour` free text | ❌ |
| **QA Hub → Moisture Loss** | ⚠️ per weigh event | ❌ | n/a | ❌ |
| **QA Hub → Machine-wide Temps/Angles/Humidity** | ⚠️ one per shift, often 2–3/day | ❌ | ❌ no time field | ❌ |
| **Data Sheet → Egg Pack Quality** | ✅ many rows per house | ✅ history table already shown & editable | n/a | ✅ shows all past rows |
| **Data Sheet → Fertility Analysis** | ✅ many rows per house | ✅ history table already shown | n/a | ✅ |
| **Data Sheet → Residue Analysis** | ✅ many rows per house | ✅ history table already shown | n/a | ✅ |
| **Daily Checklist** | ✅ item-by-item all day | ✅ completions persist and re-render checked | n/a | ⚠️ date-scoped but limited |

**Verdict:** the *Data Sheet* forms already do the right thing (they show a history table under the form). The **QA Hub entries do not** — they're one-shot forms that clear on save with no "today so far" view. Tray Wash is the worst offender because its whole design is "one row per day filled across 5 checks."

---

### 2. What I'd build (phased, one gate per phase like before)

#### Phase A — Tray Wash: proper daily-log resume + current-time defaults *(the trigger case)* ✅ DONE

Assumptions used (defaults from my questions): keyed on `(machine_id, check_date, candling_results->>type='tray_wash')`; past-day view is truly read-only for everyone; time defaults to browser local time.

Implementation:
- New hook **`useTodaysTrayWash(machineId, checkDate)`** — returns the most recent tray-wash `qa_monitoring` row for that machine+date (or null).
- **`TrayWashEntry`** rewritten:
  - Prefills 3 temps + 5 PPM values + 5 PPM times from `existingRow` on mount / when the row or date changes.
  - Button label switches: `Save Progress` while daily log is partial, `Save Daily Tray Wash Record` once all filled, `Read-only (historical entry)` on past dates.
  - Header shows *"Resuming today's log — last saved 2:14 PM"* when an existing row is loaded.
  - PPM time inputs prefill **current local time** on focus (and on blur of the PPM value if the operator forgot); never overwrites an existing time.
  - Read-only mode disables every input and hides the submit; shows an amber "Viewing {date} — read-only" banner.
  - Partial saves allowed — any non-empty field is enough to save; empty slots persist as `null`.
- **`SingleSetterQAWorkflow` + `MultiSetterQAWorkflow`**:
  - Call `useTodaysTrayWash(selectedMachine.id, checkDate)`, pass through as `existingRow` + `readOnly` (when `checkDate < todayISO`) + `loadingExisting`.
  - `handleSubmitTrayWash` now branches: if `existingId` → direct `supabase.from('qa_monitoring').update(...).eq('id', existingId)`; else the original INSERT (via `useOfflineSubmit` / `submitGenericQAOffline`, preserving offline + linkage behaviour).
  - After save, invalidates `['tray-wash-daily']` so the form reflects the freshly-saved row.
- **Bonus (Phase C sneak-in):** `RectalTempEntry`'s Check Time input now also prefills current local time on focus when empty.

Typecheck: `tsgo --noEmit` clean.

**Verify:** QA Hub → any single/multi setter machine → Tray Wash tab. Enter 1st PPM (60) + optional time, hit *Save Progress*. Refresh the page. The row should still be there and the button now shows the "Resuming today's log — last saved HH:MM" hint. Enter 2 more PPMs, save again. Switch the date to yesterday → whole card renders read-only with the amber banner.

---

- On mount, look up **today's tray_wash record** for the selected machine's house/company + `checkDate`. If it exists, load its `firstCheck / secondCheck / thirdCheck / ppm_check_1..5 / ppm_check_*_time` into the form.
- Change the submit button from **"Add Daily Tray Wash Record"** (INSERT-only) to **"Save Progress"** — behavior: UPSERT on `(company_id, machine_id or batch_id, check_date, type='tray_wash')`. So user can save with 1 PPM filled, come back later, add 2 more, save again — always one row per day.
- Show a small **"1 of 5 PPM checks entered · last saved 2:14 PM"** status line so they know where they are.
- Each PPM time input: **on focus, if empty, prefill current local time** (`HH:MM`). User can still overwrite.
- When user picks a **prior day** in the date picker: fetch that day's row and render the whole card **read-only** with a "Viewing Jun 12 — read-only" banner and no Save button.

#### Phase B — Extend the same "today so far" pattern to other QA daily logs

For each of these, add a small "**Today's entries**" list *inside the form card* (not just the global Recent Entries table) so the operator sees what they've already logged for the selected machine + date:

- **Rectal Temps** — list of today's readings by location + time, with delete.
- **Culls** — today's cull checks for this flock (male/female/defect breakdown running total).
- **Hatch Progression** — today's hour checks for this machine (A/B/C stages).
- **Machine-wide Temps / Angles / Humidity** — today's shift readings for this machine.

These stay as **append-only** (each Save = new row); the improvement is *visibility of what's already there today* so the user doesn't re-enter or forget a slot.

#### Phase C — Time picker default = current local time (system-wide)

Sweep every `<Input type="time">` and shadcn `<TimePicker>` used in data entry:

- If value is empty **and** the picker gains focus (or the row is added), prefill `new Date().toTimeString().slice(0,5)` in the **user's local timezone**.
- Files touched: `TrayWashEntry`, `RectalTempEntry`, `HatchProgressionEntry` (checkHour → could become a time picker), any other data-entry form that has a time field.
- Never overwrite an existing value — only fill blanks.

#### Phase D — Previous-day view = read-only, current-day = editable (shared rule)

Add a single helper (e.g. `useDayScopedEntry`) that returns `{ mode: 'edit' | 'view', existingRow, lastSavedAt }` based on whether `checkDate === today`. Apply it to Tray Wash first, then the other QA daily-log forms in Phase B.

- Yesterday's data → readable, disabled inputs, no Save button, "Viewing historical entry" banner.
- Today → editable, resume-aware.
- Future dates → blocked with a clear message ("Cannot log future dates").

---

### 3. Data model impact

- **No schema change needed for Tray Wash / QA logs** — everything is already inside `qa_monitoring.candling_results` JSON. I just need a fetch-by-`(machine_id, check_date, candling_results->>type)` query and an UPSERT path. If UPSERT via JSON key proves noisy, I'll add a small `qa_daily_log_key` generated column, but only if needed.
- Nothing changes for Egg Pack / Fertility / Residue — they already work correctly.

---

### 4. Rollout order & verification gates

1. **Phase A** — ship Tray Wash resume + time defaults + read-only past day. You verify by entering 2 PPMs, refreshing, confirming they're still there; then flipping the date back one day and confirming read-only.
2. **Phase B** — Rectal Temps first (highest volume), then Culls, Hatch Progression, Machine-wide temps/angles/humidity. Each verified independently.
3. **Phase C** — global time-default sweep (small, low-risk).
4. **Phase D** — extract the shared helper once patterns settle; no user-visible change beyond consistency.

Ask before I start Phase A:

1. **Tray Wash "one row per day"** — confirm: **one row per (machine + house + date)**, right? Or per (house + date) regardless of machine? (Corey's PDF said process-level — I'll default to *house + date* if you don't say otherwise.)
2. For the **read-only past-day view**, do you want an **"Edit"** button behind a permissions check (for admins to correct a bad reading), or truly read-only for everyone?
3. Time default — **user's browser local time** is fine (that's what "current time of the users location" implies)? Or should it come from the hatchery's configured timezone?