# Architecture

Carry uses lightweight MVVM, Repository, and Service boundaries from Milestone 1.
Views render state; ViewModels handle interaction; infrastructure handles SQLite and notifications.

## Current structure

- `src/app`: wires dependencies and React Navigation.
- `src/features/bible/views`: screens and reusable Bible components.
- `src/features/bible/view-models`: loading, selection, lookup, and retry state.
- `src/features/carry`: Carry forms, list and detail views with their ViewModels.
- `src/domain`: framework-independent entities, validation, and derived status.
- `src/application/ports`: repository and notification contracts.
- `src/application/services`: reference validation and Carry lifecycle coordination.
- `src/infrastructure/repositories`: database opening and SQLite repositories.
- `src/infrastructure/notifications`: the Expo local-notification adapter.

Views and ViewModels depend on the repository contract, not SQLite directly.
The composition layer supplies the concrete implementation.

## Domain decisions

- Carries hold a category ID, situation, schedule, intention, passage keys,
  optional reminder ID, and optional embedded reflection.
- Categories are matched ignoring case and repeated whitespace; no duplicate
  normalized name is stored.
- Reflections use a whole-number alignment rating from 1 to 5.
- Carry status is derived from schedule and reflection, not persisted.
- Form validation returns issues; invalid current times or stored schedules throw in lifecycle rules.

## Bible flows

- Browsing: Books -> Chapters -> Verses; navigation passes IDs, not Scripture text.
- Selection: first tap selects one verse, second completes an ordered same-chapter
  range, third starts again. Clear and chapter changes reset selection.
- Lookup: full book names plus verse/range; the repository validates the keys.
  Typed backwards ranges are rejected. Lookup opens a fresh reading screen;
  Back returns to Books and the next verse tap starts a new selection.
- Preview resolves through `BibleRepository.getPassage`. Selections store keys only.
- Loading/error/ready states expose Retry. Cleanup and request guards ignore stale results.
- Books cancels lookup on losing focus and checks focus again before navigating;
  a late result cannot open Scripture over My Carries.

## Storage and source data

- Bible reads use parameterized SQL and numeric canonical order, not string sorting.
- `openBundledBible` stages the first copy, validates its dataset version, then
  promotes it. Failed/stale temporary copies are cleaned up for retry.
- The versioned Bible is opened with `query_only`; personal data uses a
  separate writable database. Existing permanent Bible files are not auto-repaired.
- Keys follow publisher codes, e.g. `JAS.1.19`. Dataset updates need new assets,
  checksums, and compatibility review before migrating saved keys.
- Source: [eBible.org Protestant WEB](https://ebible.org/engwebp/) (`engwebp`,
  American spelling), [VPL archive](https://ebible.org/Scriptures/engwebp_vpl.zip).
  Retrieved 1 October 2026; XML dated 28 September 2026. The snapshot identifies
  the edition, not the rights page's older “2020 stable text” label.
- [Rights](https://ebible.org/engwebp/copyright.htm): public-domain text;
  World English Bible is a trademark. Changed text must not be labelled WEB.
  The retained archive includes `engwebp_about.htm`.
- Import: `python scripts/build_bible.py` verifies the pinned archive and creates
  `assets/bible/web-2026-09-28.db`; no runtime Scripture download.
- UTF-8 export whitespace is trimmed; wording/punctuation stay unchanged.
  Notes, formatting, introductions, and headings are absent from the VPL export.
- Dataset: 66 books, 1,189 chapters, 31,103 entries. Five empty entries remain empty:
  Luke 17:36, Acts 8:37, Acts 15:34, Acts 24:7, Romans 16:25.

SHA-256 checksums:

- Archive: `7d2e0b91ba43e2500fcab9c64d9db1962750deeff4e1186aed4c30220f5689be`
- XML: `ac0fe5d87ef7c192afa199eaf05a17e172c199e9b9776624daf89614224864f3`
- Database: `55d3853b9a27cee8541548baa0c0f731461a036d6e5ae998b60470fcb21fd311`

## Personal storage

- `CarryRepository` defines atomic creation, category reuse, save/read/delete,
  insert-only reflection recording and latest-reflection retrieval.
- The initial version-1 schema has categories, Carries, and reflections. Normalized
  category names are unique; each Carry owns at most one reflection, deleted with it.
- Dates use UTC ISO text; reminders are optional, and status is not stored.
  The SQLite Carry adapter matches categories and restores domain Date values.
- `openPersonalDatabase` opens a private connection, enables foreign keys before
  its transaction, and initializes only an empty version-0 database. Version 1
  is reused after column checks; unknown or damaged schemas fail without reset.
- The app supplies `SQLiteCarryRepository` to Carry ViewModels. Each operation
  opens the personal database and closes its private connection afterward.
  Schema/opener checks also use Node SQLite, including file reopen.
- The adapter opens/closes a private connection per operation. Category reuse,
  Carry save/read/delete and latest-reflection lookup are implemented.
  Carry lists sort by schedule/ID; latest reflections sort by creation time/ID.
- Saves transact the Carry and any supplied reflection together. Omitting a reflection
  preserves an existing one; deleting a Carry cascades to it, retaining the category.
  Parameterized writes return controlled failures and never schedule reminders.

## Carry creation flow

- Passage preview opens a draft. Change passage pushes the Bible picker above it;
  only the selected keys change when returning, so other fields remain intact.
- Native Android pickers combine local date/time into one Date, stored as UTC ISO.
  The intention is one free-text field, with an if-then example.
- `createCarryRecord` checks domain fields and resolves the passage before writing.
  It rechecks the clock after that asynchronous read to reject an expired schedule.
- `create` reuses/creates the category and inserts the Carry in one transaction.
  It rejects duplicate Carry IDs; the separate `save` operation remains an upsert.
- Per-draft UUIDs survive retries. An immediate save lock prevents double taps;
  navigation is blocked during saving/scheduling. Cancelling before Save writes nothing.
- Successful Save replaces the draft with read-only detail. My Carries lists all
  saved records for reopening; this is not the full grouped FR-06 history feature.

## Carry editing flow

- Detail offers Edit for upcoming Carries. The shared form has a separate edit
  ViewModel; Scripture picking changes only passage keys, not other draft fields.
- `prepareCarryDraft` shares field validation with creation. `updateCarryRecord`
  checks the original's eligibility and rechecks after asynchronous passage reads.
- Update-only storage reuses/creates a category atomically without renaming shared
  categories. It preserves ID, creation date, reminder ID and reflection; missing
  records are not recreated. The supplied clock also checks eligibility after
  SQLite acquires its write lock.
- Save returns to refreshed detail with reminder feedback; cancelling the draft writes nothing.
  After storing an edit, the application refreshes its reminder as described below.

## Carry deletion flow

- Upcoming detail offers native confirmation; Cancel/dismissal writes nothing.
- The detail ViewModel locks repeated requests and ignores old confirmations/results
  after focus, Carry ID, or repository changes. Leaving is blocked during deletion.
- `deleteUpcomingCarry` supplies the clock to repository deletion. SQLite checks
  the stored status after acquiring its write lock; overdue/reflected records stay.
- Missing IDs succeed without changes. SQLite returns the deleted record so the
  service cancels its actual reminder ID. Shared categories remain reusable.
  Cancellation failure does not undo deletion; a warning appears on the refreshed list.

## Reflection flow

- Ready detail opens a reflection form by Carry ID. Its ViewModel keeps the draft
  local, requires an explicit 1-5 rating and both answers, and preserves failed saves.
- `saveCarryReflection` reuses the existing `addReflection` domain rule. The narrow
  repository operation rechecks the stored Carry under its write lock and inserts
  only the reflection: it cannot recreate a missing Carry or overwrite a saved reflection.
- An immediate save lock blocks repeated submissions and leaving during a write;
  stale results cannot navigate after the screen's dependencies change.
- Success returns to refreshed, read-only detail. Reflection presence derives
  Completed status; no schema, status column or notification change is needed.

## Planned, not implemented

- Grouped history and latest-reflection presentation by category.

## Carry status refresh

- List/detail flows share `useCarryStatusClock`: capture time on focus, after a
  load-state change, and on app resume. Blurred/unmounted screens remove their listener.
- Screens pass this time to the existing domain rule: future means upcoming,
  overdue/unreflected means ready to reflect, and reflected means completed.
- No status column, background job or polling. A screen left continuously open
  refreshes at the next lifecycle trigger, not with a live countdown.
- Resume changes the clock only; it does not reload storage or reset pending operations.

## Local reminders

- `NotificationService` separates the application from Expo; Views and ViewModels
  never call Expo Notifications directly. No remote push token or server is used.
- Creation saves the Carry first, then requests notification access and schedules
  at its time minus 15 minutes. Denial/failure preserves the Carry with clear feedback.
  Check the cutoff again after permission; past reminder times are skipped.
- A narrow update stores the returned ID in the existing `reminder_id` column.
  Failed linkage triggers cancellation; failed cancellation warns of a possible orphan.
  SQLite and Android scheduling are separate operations, not an atomic transaction.
- Generic notification content contains only a Carry ID as data. The app layer
  handles launch/live taps, waits for navigation, and loads the existing detail screen.
  Consumed responses are deduplicated and cleared rather than reopened on startup.
- Android uses a reminder channel and exact-alarm manifest permission. Foreground
  presentation is configured at startup, but permission is requested only on Save.
  Delivery still depends on Android access/settings; native timing evaluation is separate.
- Every successful edit cancels the old reminder, clears its stored link, then
  schedules/links a replacement. Text-only edits also refresh, allowing cleanup retry
  after an earlier failed time change without adding persisted alarm state.
- Failed old-reminder cancellation keeps its ID and skips replacement to avoid duplicates.
  Cancellation removes both pending and already-delivered notifications. Representative
  native edit/delete and offline reopening checks are recorded in the test log;
  they are not a ten-trial timing reliability result.
