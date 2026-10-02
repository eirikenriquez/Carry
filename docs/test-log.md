# Test log

Historical checks from 2 October 2026 (New Zealand time), not a fresh test run.
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
  tests/10 suites pass. No Android personal-data persistence check yet.
- Personal reads/category reuse: nine grouped Node SQLite checks pass, including
  stable category identity/spelling, optional reminder/reflection reads, date conversion,
  deterministic latest-reflection ordering, missing records, and invalid stored dates.
  TypeScript/lint pass; repository operations reopen an isolated desktop database file.
- Personal writes: 12 grouped Node SQLite checks pass for full-field round trips,
  updates, nullable reminder IDs, reflection preservation/ownership, deletion cascade,
  and save/delete rollback with retry. SQL triggers simulate write failures, not disk
  exhaustion. Format/lint/typecheck, 55 Jest tests/10 suites, Bible integration, and
  four Python tests pass. Android personal-data restart checks remain outstanding.

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
- Lookup starts at the chapter beginning; the preview shows the selected passage.
  No automatic scroll, keyword search, cross-chapter lookup, or Carry saving was tested.
