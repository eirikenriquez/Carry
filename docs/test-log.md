# Test log

Current automated results: 9 October 2026, code checkpoint `970e2c2`.
Native evidence uses Carry_C_API33 (Android 13/API 33), app `com.eirikenriquez.carry`.
Earlier feature checks were recorded on 2-5 October; the grouped-list smoke check
and category-reflection checks on 6 October are distinguished below.
Full refactoring acceptance was not repeated.

## Current automated results

| Check | Result | Coverage |
| --- | --- | --- |
| Jest | 54 cases passed | Core domain, lifecycle, ViewModel, Home/category-preview UI and navigation behaviour |
| Personal SQLite | 9 checks passed | Category reuse, persistence, guarded writes, reflection integrity and rollback |
| Publisher source | 2 checks passed | Dataset integrity and exact comparison with the pinned publisher export |
| Bible integration | Passed | Actual bundled database: ordering, passage resolution, empty text and invalid selections |
| TypeScript, Expo lint and Prettier | Passed | Types and source consistency |

Run the commands in the [README](../README.md#checks). The Bible dataset size and
source hashes are recorded in [architecture](architecture.md#storage-and-source-data).
This log is the source of truth for current test totals; earlier checkpoints are
recoverable in Git and their PRs.

Coverage was consolidated around core workflows and realistic failures.
Repeated checks and less relevant defensive permutations were removed; production
safeguards remain. This is a scope/maintenance choice, not a measured performance gain.
Fixtures and controlled failures do not cover every possible race or damaged database.

## Recorded native evidence

Normal prototype release builds ran without Metro and used offline conditions.
Storage probes and seeded fixtures are identified below; they are not full-loop evidence.
Disposable records were backed up and cleaned up without resetting user data.

### Scripture and storage

- Bible browsing, Back navigation, cold restart and publisher-provided empty text passed.
- Selection covered a single verse, backwards range, highlighting, preview scrolling,
  third-tap replacement, Clear and chapter reset.
- Reference lookup covered full/numbered book names, valid single/range references,
  invalid book/chapter/verse and descending ranges. Fresh-tap replacement and restart passed.
- Copy recovery rebuilt the Bible from a stale temporary file and passed cold restart.
  An actual mid-copy exception was checked with mocks, not native fault injection.
- A temporary startup storage probe verified all Carry fields, categories, reminder IDs,
  reflection values and Date restoration after app restart and emulator reboot.
  Personal data remained separate from the unchanged Bible database.
  The probe/hook was removed and the normal app rebuilt after fixture cleanup.
- Personal storage source inspection and UID accounting found no added traffic in the
  checked offline interval. This is not packet capture or proof of no attempted connections.

### Creation, editing and deletion

- Creation: required/future-date feedback preserved the draft; native date/time controls
  preserved the other value, and dismissing the picker changed nothing.
  Changing Scripture or going Back preserved other fields. Save/reopen retained all values
  offline; cancelling another draft created neither a Carry nor a category.
- Editing: prefill, invalid edits, Cancel and passage changes passed. Saved changes
  survived offline reopening and retained identity/creation metadata.
  Category reassignment did not rename shared categories.
- Deletion used labelled seeded Carries. Cancel and Android Back left snapshots unchanged;
  confirming removed only the selected Carry, kept its shared category and stayed deleted
  after offline reopening. Reminder cancellation was checked separately below.
- A later native lookup/Back recheck passed. Delayed lookup cancellation remains controlled
  test coverage, not a native delayed-response trial.

### Reminders and status

- Permission denial preserved a saved Carry and explained that reminders were disabled.
- An eligible Save linked a reminder ID. One reminder arrived offline at its scheduled
  offset and a cold tap opened the correct passage, situation and intention.
  Normal restart retained fields/ID without reopening the consumed notification.
  Delivery was checked before force-stop; stopping the app does not prove alarm delivery.
- With a seeded Carry, time/text edits left one replacement alarm; no stale notification
  appeared at the old time. Offline process restart retained fields and the new reminder ID.
- Editing cleared a delivered notification; deletion cancelled the queued reminder.
  Offline reopening kept the Carry deleted. Notification absence was checked before
  force-stop, and exact-ID fixture cleanup restored the original empty tables.
- Seeded lifecycle fixtures changed to Ready on list/detail resume across their schedules.
  Future/reflected fixtures stayed Upcoming/Completed after app restart and emulator reboot;
  database snapshots were unchanged. A seeded reflection is not reflection-entry evidence.

### Reflection

- Carries were seeded, but reflections were submitted through the real form.
  No default rating; required-field feedback and Cancel preserved stored data.
  Upcoming detail offered no Reflect action.
- A valid submission saved the rating and both answers once, then showed read-only
  Completed detail. Offline app restart and emulator reboot retained every value.
- Native Back exposed a tap event being passed as a reminder message. The callback fix
  dropped that event; the regression and native Back recheck passed.

## Grouped-list verification

- Grouping preserves order, assigns each Carry once, covers the scheduled-time boundary
  and handles empty groups. Screen checks cover headings, empty feedback, detail taps,
  loading, retry, reminder warnings and the first-Carry Browse Bible prompt.
- A controlled ViewModel check regroups on app resume without writing/reloading storage.
  Refocus reloads fixture changes representing creation, editing, deletion and reflection.
  Existing domain, navigation and real SQLite checks also pass.
- The initial x86_64 release built and installed without clearing app data. API 33 launch,
  empty-list layout, Browse Bible and cold-restart reopening passed without Metro;
  no records were created or changed. Radio settings were not changed.
  That smoke check did not cover mixed groups or saved-record lifecycle/restart.
- Java 25 emitted a prefab native-access warning that blocked configuration. The
  installed JDK 20 and temporary short-path mapping allowed a successful build;
  no project configuration, dependencies or global Java settings changed.
- Later category-reflection checks verified mixed groups offline, a real reflection
  moving its seeded Carry from Ready to Completed, and correct groups after device
  restart. Every fixture appeared once. Creation/edit/delete/time-transition group
  refresh is automated coverage, not a newly repeated native full-loop result.

## Category-reflection verification

- Focused ViewModel checks cover normalized matching, no history/new categories,
  category switching with a late result, failed reads/retry and successful creation
  despite a history-read failure. The form check covers all displayed values,
  loading/no-history/error feedback, retry, Save availability and creation-only scope.
- Existing real SQLite checks verify reflection-time ordering and ID tie-breaking;
  each repository call opens a fresh connection. No new schema or write path.
- API 33 release checks ran in airplane mode without Metro. Labelled fixtures
  supplied two Work reflections, one Family reflection, an unreflected category
  and mixed lifecycle groups. Work showed the latest reflection, not schedule order;
  switching to Family never displayed Work values. Typed case/spacing matched Work.
- The empty-history message rendered correctly. Cancelling the draft added no
  Carry/category. A reflection was then submitted through the real form on a seeded
  Ready Carry; the grouped list refreshed to Completed. After emulator reboot, a
  fresh Work draft showed this newly saved rating, outcome and insight offline.
- Exact-ID fixture cleanup removed the test rows after backing them up. The database
  dump matched its original empty contents, and airplane mode was restored.
- Failures/races are controlled tests, not native fault injection. No-history Save
  is covered by creation logic checks, not a new native valid-creation trial.
  These checks do not repeat the entire create/edit/delete/reminder user loop.

## Refactoring verification

- Folder/layout cleanup preserved executable declarations, hook bodies and initialization.
  The Android JavaScript export included the Bible asset; Hermes compiler execution was
  permission-blocked, so that export is not a new native acceptance result.
- Form fields and reflection rating were compared with the original UI using mocked
  native controls: displayed text, host structure, styles, accessibility and callbacks matched.
  Bible wrapper bodies/props, routes and navigator initialization also matched.
  These temporary comparisons added no permanent tests.

## Screenshots

- Category reflection: [mixed groups offline](evidence/category-reflection/groups-offline.jpg),
  [latest Work reflection](evidence/category-reflection/latest-work-offline.jpg),
  [no previous reflection](evidence/category-reflection/no-history-offline.jpg),
  [new reflection after restart](evidence/category-reflection/latest-after-restart-offline.jpg).
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
- Grouped Carries: [empty list](evidence/grouped-carries/empty-list.jpg).

## Limits and environment

- Evidence is representative emulator work, not a physical-device, TalkBack, large-font
  or user-study evaluation. No complete selection-to-retrieval run is recorded yet.
- Formal reminder reliability evaluation remains pending; one delivery does not establish
  the Milestone 1 timing threshold. Warm taps, cutoff/permission failures, stale results,
  duplicate submissions, write failures and compensation primarily use controlled tests.
- Storage/data checks use the actual asset and desktop SQLite; seeded native checks do not
  replace normal creation/reflection acceptance. Native scenarios do not cover every timing race.
- Lookup does not test keyword search, abbreviations, cross-chapter lookup or automatic scroll.
- Windows builds needed a temporary short-path mapping and native code generation/toolchain
  retries. Temporary mappings/hooks were removed; no dependency downgrade was applied.
- Dependency advisories remain recorded as a limitation, not a current security verdict.
  Broad `eslint .` reports pre-existing Node-script `__dirname` globals; normal Expo lint passes.
- Detailed earlier build attempts, fixture IDs and numerical checkpoints remain in Git history.

## Home entry - 9 October

- Code checkpoint `970e2c2`: all automated gates above passed; the existing tests
  were updated for Home without increasing the case count.
- A fresh API 33 x86_64 release built in 1m 58s and installed without clearing data.
  The temporary drive mapping used the parent folder so Expo could locate the app.
- Offline, without Metro: cold launch opened Home; New Carry opened Scripture;
  Save opened detail and Back returned Home. Explicit Cancel returned Home, while
  Android Back from the form returned to Scripture. Back from Change passage
  preserved the mounted form's category, situation and passage.
- Detail's Back to Home action worked. Home refreshed after creation/deletion and
  retained the correct groups after app restart. Only the labelled disposable
  Carry was deleted; the earlier completed demo remained. Its reusable test
  category was retained. Original radio settings were restored.
- Empty Home is automated coverage, not a cleared-data native check. Native
  reminder delivery/tapping was not newly verified on this build; existing routing
  tests passed. This is a bounded navigation check, not formal NFR evaluation.
- Screenshots: [populated Home](evidence/home/populated-home.png),
  [draft after picker Back](evidence/home/draft-after-picker-back.png),
  [Home after cleanup and restart](evidence/home/home-after-restart.png).
