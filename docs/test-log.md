# Test log

Recorded checkpoints from 2-5 October 2026 (New Zealand time).
Emulator: Carry_C_API33, Android 13/API 33; app: `com.eirikenriquez.carry`.

## Automated checkpoints

| Increment | Jest tests / suites | Main coverage |
| --- | --- | --- |
| Bundled Bible, after cleanup | 37 / 6 | Domain rules, loader recovery, reader failures |
| Browsing | 41 / 7 | Retry, repository reuse, chapter changes, empty results |
| Selection | 45 / 8 | Tap progression, backwards ordering, reset, stale previews |
| Reference lookup | 51 / 10 | Parsing, bounds, invalid references, retry, duplicate/stale requests |
| Readability audit | 53 / 10 | Invalid dates, explicit cancellation, consistent fixtures, shared hook setup |
| Final lookup fix | 55 / 10 | Dependency changes cancel pending requests, reset feedback, and allow retry |
| Carry creation | 67 / 13 | Validation/clock recheck, draft preservation, save locking, list/detail loading and retry |
| Creation review fix | 68 / 14 | Late lookup cannot navigate after Books loses focus; lookup works after returning |
| Carry editing | 83 / 17 | Eligibility/clock rechecks, validation, prefill/retry, draft preservation, save locking and picker routing |
| Carry deletion | 95 / 21 | Upcoming-only deletion, transaction-lock clock check, missing IDs, confirmation, double-tap locking and stale callbacks |
| Local reminders | 107 / 24 | Permission/cutoff handling, notification linkage/compensation, saved-Carry preservation, launch/live tap routing and deduplication |
| Reminder synchronization | 116 / 26 | Repeated refresh ordering, cancellation/link failures, deletion warnings, save locking and feedback routing |
| Carry status refresh | 119 / 27 | Clock after delayed loading, resume across a schedule, focus refresh and listener cleanup |
| Reflection entry | 137 / 30 | Validation, guarded save, draft/retry state, duplicate/stale requests, form feedback and ready-only navigation |

- Format, lint, strict TypeScript, and scoped Git whitespace checks passed at these checkpoints.
- Real SQLite checks covered all 66 books, 1,189 chapters, and 31,103 entries,
  including ordered content, passage endpoints, empty text, and invalid selections.
- Lookup additionally checked John 3:16, James 1:19-20, 1 John 3:16, Luke 17:36,
  and rejection of a missing verse.
- Four Python source-data tests passed at the bundled-data checkpoint.
- Initial Bible tests numbered 43; six duplicate mocked success cases were replaced
  by stronger real-SQLite assertions, leaving 37 before later increments.
- Final lookup fix passed all automated checks above. Its two new dependency-change
  cases use controlled promises; the native audit below predates this final fix.
- Personal storage foundation: 55 Jest tests/10 suites remain unchanged; three
  Node SQLite schema checks pass for fields, category links/uniqueness, reflection
  ownership, ratings, and deletion cleanup. Format/lint/typecheck, Bible integration,
  four Python tests, and scoped whitespace checks pass. In-memory schema tests only;
  no Carry adapter, installed personal database, or restart persistence checked yet.
- Personal database opener: seven grouped Node SQLite checks now pass (three schema,
  four opener), including file reopen, incompatible-schema preservation, rollback/retry,
  and controlled opening/foreign-key failures. Format/lint/typecheck and all 55 Jest
  tests/10 suites pass. Native persistence had not been checked at this checkpoint.
- Personal reads/category reuse: nine grouped Node SQLite checks pass, including
  stable category identity/spelling, optional reminder/reflection reads, date conversion,
  deterministic latest-reflection ordering, missing records, and invalid stored dates.
  TypeScript/lint pass; repository operations reopen an isolated desktop database file.
- Personal writes: 12 grouped Node SQLite checks pass for full-field round trips,
  updates, nullable reminder IDs, reflection preservation/ownership, deletion cascade,
  and save/delete rollback with retry. SQL triggers simulate write failures, not disk
  exhaustion. Format/lint/typecheck, 55 Jest tests/10 suites, Bible integration, and
  four Python tests pass. Native restart verification followed; results are recorded below.
- Carry creation: 15 grouped Node SQLite checks pass, adding atomic category/Carry
  insertion, category reuse, duplicate-ID rejection and rollback without orphan categories.
  Format/lint/typecheck, all 67 Jest tests, Bible integration and four Python tests pass.
- Review fix (3 October): a controlled navigation regression failed before the fix
  and passed afterward. It covers blur cancellation, refocus/retry and loss of focus
  before blur cleanup. All 68 Jest tests/14 suites and existing integration checks pass;
  the delayed-result race is a controlled test, not native fault injection.
- Editing: 19 grouped Node SQLite checks pass, including update-only missing-record
  handling, canonical metadata, category reassignment, rollback and eligibility
  after acquiring the transaction lock. All 83 Jest tests, Bible integration,
  four Python checks, format/lint/typecheck and whitespace checks pass.
- Deletion: 20 grouped Node SQLite checks pass. The added case isolates eligibility
  after the deletion write lock; existing checks cover isolation, category retention
  and rollback. All 95 Jest tests, Bible integration and four Python checks pass.
  Final ViewModel formatting, lint and strict TypeScript checks pass.
- Reflection entry: 24 grouped Node SQLite checks pass, including three new cases
  for insert-only reflection writes, rollback/ownership and eligibility after the
  write lock. All 137 Jest tests/30 suites, Bible integration, four Python checks,
  format/lint/typecheck and Git whitespace checks pass after the native callback fix.

## Offline Android acceptance

Prototype release builds ran without Metro, with airplane mode on and Wi-Fi off.
Original radio settings were restored; later feature checks did not clear app data.

- Bundled data: first launch and cold restart displayed the setup passage.
  Packaged and copied database hashes matched the recorded dataset.
- Browsing: Books -> Genesis -> chapter 1, Back navigation, another chapter after
  restart, and Luke 17:36's explicit empty-text label passed.
- Selection: single verse, backwards range, highlighting, bounded preview scroll,
  third-tap replacement, Clear, chapter reset, and selection after restart passed.
- Lookup: single/range and numbered-book references passed, including cold restart.
  Invalid book/chapter/verse and descending range stayed on Books with feedback.
  Back, fresh-tap replacement, Clear, and empty-entry preview passed.
- Audit recheck: a rebuilt release passed offline cold launch, John 3:16 lookup,
  fresh-tap replacement, forward/backwards ranges, third-tap reset, Clear, Back,
  descending-range feedback, and Genesis chapter-change reset. Format, lint,
  TypeScript, all 53 Jest tests, real SQLite checks, and four Python tests passed.
  Radios were restored and the temporary drive mapping removed. No new visual
  or accessibility audit was performed; cancellation races remain mocked checks.

### Copy-recovery recheck

- Fix `aaf670d` stages and validates a temporary database before promotion.
- A native recheck removed a stale empty temporary file and rebuilt the Bible offline;
  cold restart passed and the original database was restored afterward.
- The mocked regression covers an actual copy throwing mid-operation; the native
  recheck covers a leftover temporary file, not a mid-copy exception.

### Personal storage acceptance

- A temporary startup hook ran `scripts/verify_carry_native.ts` in a prototype
  release without Metro, in airplane mode with Wi-Fi off. Two labelled Carries
  covered every field, optional reminder ID, and an owned reflection.
- Save and force-stop/reopen passed (process 8192 -> 8270). Emulator reboot changed
  the boot ID and process (1581); both records still matched every field, including
  Date values, normalized category reuse, and latest reflection.
- `carry.db` was at `/data/user/0/com.eirikenriquez.carry/files/SQLite/carry.db`,
  with owner-only file permissions, separately from the unchanged Bible database.
- Source inspection found no network calls/remote DB configuration in personal
  storage. Historical UID traffic existed; shown accounting buckets were unchanged
  across the offline app-restart check. This is not packet capture or proof of no
  attempted connections, and does not identify the historical traffic's cause.
- Cleanup removed only the two verified test Carries and owned reflection/category.
  The startup hook was removed; the manual probe remains outside the normal app.
  Normal release rebuilt/installed successfully; radios restored and drive mapping removed.
  This verifies repository persistence, not a Carry form, lifecycle UI, or notifications.

To repeat: temporarily call `verifyCarryStorage()` from startup, restart without
clearing data, then call `verifyCarryStorage(true)` to clean up. Remove the hook and
rebuild the normal app afterward; do not leave test startup code enabled.

### Carry creation acceptance

- The normal release UI ran offline without Metro; no startup test hook was used.
  Empty Save showed category, situation, schedule and intention errors. A filled
  form with a past date showed future-time feedback without losing entered text.
- Native date/time selection passed; changing either preserved the other.
  Dismissing the time picker left the schedule unchanged.
- Changing James 1:19-20 to John 3:16 preserved category, situation, schedule and
  intention. Back from Scripture picking also preserved the draft.
- Save displayed one Upcoming Carry. My Carries reopened it; force-stop/relaunch
  with airplane mode on and Wi-Fi off preserved every entered value and Scripture.
  SQLite readback confirmed UTC schedule, passage keys, no reminder and no reflection.
- Cancelling a second draft created neither a Carry nor its typed category.
  Exact-ID cleanup removed only the saved verification Carry and unused category;
  a database backup was retained outside the repo. Radios/root mode were restored.
- Native linking initially used stale generated data and the app failed to launch.
  Regenerating that cache included the picker. Windows mixed-root code generation
  and long CMake paths required code generation from the real checkout followed by
  compilation through a temporary short drive mapping. The rebuilt release launched
  successfully; no app-source workaround or dependency downgrade was added.
  The mapping was removed after verification.
- Review-fix release (3 October) rebuilt/installed successfully. Offline My Carries
  -> Back -> John 3:16 lookup, then Back/repeat lookup passed. No new records;
  radios and temporary mapping restored. Full creation acceptance above predates
  this navigation-only fix; delayed completion is covered by the regression test.

### Carry editing acceptance

- Release rebuilt/installed on 3 October; normal UI used offline without Metro.
  Edit prefilled category, situation, schedule, passage and intention.
- Empty category and past schedule were rejected; SQLite retained the original.
  Cancel returned unchanged detail. Back from the Scripture picker preserved the
  draft; John 3:16 -> James 1:19-20 changed only its passage selection.
- Save changed category/situation/intention and the native date/time selection
  from 5 October 12:40 to 6 October 14:15 NZDT. Updated detail and list refreshed;
  force-stop/reopen retained every value, including keys `JAS.1.19`–`JAS.1.20`.
- SQLite read-back retained Carry ID `fa5a0938-598f-42dd-97b5-e6fd14bb9bde`
  and creation time `2026-10-02T23:41:18.231Z`. Updated schedule is
  `2026-10-06T01:15:00.000Z`; the original category was not renamed.
  Other-record isolation and reminder/reflection preservation use real SQLite tests.
- Backed up and removed only the disposable Carry and its two unused categories.
  No app reset; airplane mode, Wi-Fi, non-root adb and temporary mapping restored.
  Expiry/lock-wait and duplicate-save races use controlled tests, not native timing.

### Carry deletion acceptance

- Normal x86_64 release rebuilt/installed on API 33, offline without Metro.
  Two labelled, disposable Carries sharing a category were seeded through SQLite;
  this is deletion acceptance, not another creation-form test.
- Upcoming detail showed the permanent-deletion confirmation. Cancel and Android
  Back gesture dismissed it; complete Carry/category/reflection database snapshots
  matched after both actions. The original database was empty and backed up.
- Confirmed deletion returned to the refreshed list with only the other Carry.
  SQLite comparison verified every remaining field and the shared category stayed
  unchanged. Offline force-stop/relaunch (process 17845 -> 19521) kept the target
  absent; the reopened database matched the post-deletion snapshot exactly.
- Guarded exact-ID cleanup removed only the remaining fixture and unused category;
  the original empty personal database state was restored without app reset.
  Backups remain outside Git; radios/non-root adb restored, no drive mapping left.
- Expiry, failed writes, repeated requests and stale confirmations use controlled
  tests, not native timing/fault injection. Reminder cancellation remains separate.

## Local reminder acceptance (4 October)

- 21 real SQLite checks, complete Bible integration and four Python source checks pass.
- Reminder tests use controlled notification APIs/clocks; they do not establish delivery reliability.
- Native build initially mixed C:/R: codegen paths, then Java 25 caused Prefab warning rejection.
  The retry with CLI Java 20 and a short mapping built and installed successfully.
  The normal API 33 release opens without Metro.
- The user denied Android notification permission on an eligible Save. The saved
  detail retained the Carry and explained that notification permission was off.
  Permission choices are manual; this is a native denial check, not delivery evidence.
- A second eligible Save linked one reminder ID. Android queued an exact alarm for
  4 October 02:20 NZDT, 15 minutes before its 02:35 situation time.
- With airplane mode on, Wi-Fi off and the background app process killed (not
  force-stopped), one notification arrived at 02:20. Its ID matched SQLite.
  Tapping it cold-opened the correct detail, including passage, situation and intention.
- Normal force-stop/launcher reopening returned to Bible books, not the consumed
  notification. SQLite comparison retained every Carry field and reminder ID.
- Warm tap routing, cutoff/storage failures and compensation use controlled tests;
  this single emulator trial does not establish ten-trial reliability.
- Guarded exact-ID cleanup removed only the two disposable Carries and their unused
  test category. Database backups remain outside Git; airplane/Wi-Fi and non-root adb
  were restored. Notification permission remains enabled as chosen by the user.
- Edit/delete notification synchronization and formal ten-trial evaluation are not included.

## Reminder synchronization checkpoint (4 October)

- 116 Jest tests, 21 SQLite checks, complete Bible integration, four Python checks,
  format/lint/typecheck and Git whitespace checks pass.
- Controlled tests cover cancel -> unlink -> schedule ordering, repeated edits,
  permission/cutoff failures, pending/delivered notification cancellation and deletion warnings.
- Normal x86_64 release built successfully with CLI Java 20 and the short R: mapping.
  Installation and native acceptance were not completed: emulator activation timed
  out twice and its ADB shell did not respond. The pending diagnostic was cancelled;
  no fixture or personal-data mutation was performed. The build mapping was removed.
- Next: install the release, verify replacement/no duplicate alarms after edits,
  confirm test-record deletion cancels its alarm, and inspect offline restart behaviour.
  No native synchronization or ten-trial reliability claim is made at this checkpoint.

### Native follow-up

- After the emulator recovered, the same release installed without resetting data.
  The empty personal database was backed up; one labelled fixture was seeded through
  SQLite. This checks synchronization, not creation-form acceptance.
- Saving an eligible edit linked one alarm at 14:15 NZDT for a 14:30 Carry.
  Changing its time to 14:35 replaced that alarm with one at 14:20 and a new stored ID.
  A text-only edit refreshed the ID again, kept the edited text and left only one alarm.
- Airplane mode/Wi-Fi off, background process kill (not force-stop) and launcher
  reopening changed PID 4460 -> 4904. Detail retained all fields; database snapshots
  matched byte-for-byte, including the latest reminder ID.
- At 14:15:28, no active Carry notification existed and only the 14:20 replacement
  remained queued. This is one representative cancellation check, not ten-trial reliability.
- Paused at confirmation before deleting the disposable Carry. Deletion cancellation
  and fixture cleanup remain pending; radios/non-root adb restored while awaiting approval.
  Backups: Local Temp/carry-reminder-sync-4ea5d248-78ad-4c78-86d3-c895e5ff7833.

### Deletion follow-up

- The fixture became overdue during the approval pause. Only its backed-up schedule
  was reset to a future time through guarded SQLite test setup; no app rule changed.
  Saving through Edit cleared its previously delivered tray notification and linked
  a fresh alarm for 17:15:45 NZDT. This is cancellation evidence, not a timing trial.
- User-approved Delete returned to the empty list. SQLite held no Carries/reflections;
  Android held no queued Carry alarm or active Carry notification.
- Offline force-stop/relaunch (PID 4904 -> 6725) kept the Carry absent. Post-deletion
  database snapshots matched byte-for-byte. Notification absence was checked before
  force-stop, so stopping the app did not establish the cancellation result.
- Guarded cleanup removed only the unused fixture category, restoring the original
  empty personal tables. Backups retained outside Git; radios/non-root adb restored.
  Native cancellation acceptance is complete; formal ten-trial evaluation remains separate.

## Carry status refresh checkpoint (4 October)

- Code commit `40b330e`; three new lifecycle tests, existing list/detail cases updated
  for the explicit clock. Main-agent review corrected a test remount that could hide
  stale time. Format/lint/types, all 119 Jest tests, 21 SQLite checks, Bible integration
  and four Python checks pass. Existing domain boundary/invalid-date tests are retained.
- Normal x86_64 release built in 1m 26s with Java 20 and installed without resetting data.
  No new dependencies, schema or generated native configuration changes.
- The first native attempt paused: after installation the emulator returned black window
  captures and both activation attempts failed, although Android shell checks responded.
  Native acceptance resumed after the window recovered, as recorded below.
- Backed up the empty database; seeded four labelled Carry fixtures, one category and
  one reflection. Before/after-block snapshots matched. Guarded cleanup restored zero
  personal records; radios, non-root ADB and the temporary drive mapping were restored.

### Native follow-up

- Airplane mode/Wi-Fi off: list crossed its 17:48:59 NZDT schedule and showed Ready
  to reflect on resume at 17:49:47. Detail crossed 17:50:29 and resumed Ready at
  17:51:18, with Edit/Delete removed. Both retained process ID 8481.
- Future and reflected fixtures stayed Upcoming/Completed. Offline force-stop/reopen
  changed PID to 8637; an emulator reboot also retained all four correct statuses.
- Database snapshots before testing, after app restart and after device restart had
  identical SHA-256 hashes; counts stayed four Carries, one category and one reflection.
- Guarded cleanup removed only fixtures and restored empty tables, radios and non-root
  ADB. Backups retained. The reflection was seeded: this does not verify reflection entry.

## Reflection entry acceptance (5 October)

- Normal x86_64 release ran on API 33 without Metro, with Wi-Fi/mobile data off.
  Three labelled Carries sharing a category were seeded through SQLite; their
  reflections were not seeded. This checks reflection entry, not the whole creation loop.
- The form had no default rating. Empty Save showed all three required-field errors;
  Cancel after a partial draft left all personal records unchanged. Upcoming detail
  offered no Reflect action.
- A real form submission saved rating 4, what happened `Listened` and insight `Pause`.
  Detail/list changed to Completed; saved answers were read-only, without Edit/Delete/Reflect.
  SQLite verified exactly one reflection and unchanged Carry/category fields.
- Offline force-stop/reopen and emulator reboot retained every saved value in both
  the UI and database. Foreign-key and integrity checks passed at each snapshot.
- Native Back navigation exposed an existing tap event being passed as a reminder
  message. Fix `8bf91a6` drops the event; the regression failed before the fix and
  passed afterward, and actual Back navigation was retested successfully.
- Guarded exact-ID cleanup restored the original empty personal tables. Backups
  remain outside Git; database ownership/permissions, radios, non-root ADB and the
  temporary build mapping were restored. No app reset or test startup hook was used.

## Screenshots

- Setup: [Expo Go](evidence/setup/carry-expo-go-emulator-c-api33.png),
  [development build](evidence/setup/carry-development-build-api33.png).
- Bundled data: [offline preview](evidence/bible/carry-bible-offline-api33.png),
  [copy recovery](evidence/bible/carry-copy-recovery-api33.png).
- Browsing: [books](evidence/browser/books-offline-api33.png),
  [chapters](evidence/browser/chapters-offline-api33.png),
  [verses](evidence/browser/verses-offline-api33.png),
  [empty entry](evidence/browser/empty-verse-offline-api33.png).
- Selection: [single](evidence/selection/single-offline-api33.png),
  [range](evidence/selection/range-offline-api33.png).
- Lookup: [single](evidence/lookup/single-offline-api33.png),
  [range](evidence/lookup/range-offline-api33.png),
  [invalid range](evidence/lookup/invalid-offline-api33.png),
  [empty entry](evidence/lookup/empty-offline-api33.png).
- Creation: [validation](evidence/creation/validation.png),
  [populated form](evidence/creation/form.png), [saved detail](evidence/creation/saved.png),
  [list](evidence/creation/list.png), [offline reopening](evidence/creation/reopened-offline.png).
- Editing: [before](evidence/editing/before.png), [validation](evidence/editing/validation.png),
  [saved changes](evidence/editing/saved.png), [offline reopening](evidence/editing/reopened-offline.png).
- Deletion: [confirmation](evidence/deletion/confirmation.png),
  [Cancel leaves detail unchanged](evidence/deletion/cancelled.png),
  [refreshed list](evidence/deletion/deleted-list.png),
  [offline reopening](evidence/deletion/reopened-offline.png).
- Reminders: [offline delivery](evidence/reminders/delivered-offline.png),
  [tap destination](evidence/reminders/opened-offline.png),
  [normal restart](evidence/reminders/restarted-offline.png).
- Reminder synchronization: [edited detail](evidence/reminder-sync/edited.png),
  [offline reopening](evidence/reminder-sync/reopened-offline.png),
  [deleted list](evidence/reminder-sync/deleted.png),
  [deleted after offline restart](evidence/reminder-sync/deleted-reopened-offline.png).
- Status refresh: [list before](evidence/status-refresh/list-before.png),
  [list resumed](evidence/status-refresh/list-resumed-offline.png),
  [detail before](evidence/status-refresh/detail-before.png),
  [detail resumed](evidence/status-refresh/detail-resumed-offline.png),
  [app restart](evidence/status-refresh/app-restarted-offline.png),
  [device restart](evidence/status-refresh/device-restarted-offline.png).
- Reflection: [validation](evidence/reflection/validation.jpg),
  [saved answers](evidence/reflection/saved-reflection.jpg),
  [completed list](evidence/reflection/completed-list.jpg),
  [device restart](evidence/reflection/reopened-reflection.jpg).

## Limits and environment

- These are representative emulator checks, not physical-device, TalkBack,
  large-font, or user-study results. Screenshots were visually inspected.
- Retry and stale-result failures use mocks/controlled promises, not corrupted
  installed databases. Native empty-selection coverage was added at lookup.
- The early Bible check found no recorded traffic for the app UID; this was
  network accounting, not packet capture or proof of no attempted connections.
- Long Windows paths required a temporary drive mapping; it was removed after verification.
  Native cache/deprecation warnings remain; no dependency downgrade was applied.
- Ten moderate transitive Expo CLI audit advisories were recorded at the
  bundled-data checkpoint; that historical count is not a current security audit.
- The creation dependency audit reported 13 advisories (8 moderate, 5 high).
  The picker flag traces through Expo; suggested fixes include incompatible
  downgrades. No automatic fix was applied; runtime exploitability was not assessed.
- Lookup starts at the chapter beginning; the preview shows the selected passage.
  No automatic scroll, keyword search or cross-chapter lookup was tested.
- Creation duplicate-save races, failure/retry and stale reads use controlled tests.
  Native checks cover representative input, not every timing race or storage failure.
  Reflection duplicate/stale submissions and write failures also use controlled tests.
  Representative native reflection, status-refresh and reminder acceptance are recorded;
  formal ten-trial notification reliability remains untested.
