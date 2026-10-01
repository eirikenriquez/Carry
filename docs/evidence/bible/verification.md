# Bundled Bible verification

Verified on 2 October 2026 (New Zealand time), using Carry_C_API33,
Android 13 / API 33, package `com.eirikenriquez.carry`.

## Automated checks

- Prettier, Expo ESLint, strict TypeScript, and `git diff --check` passed.
- Jest: 43 tests across six suites, including 15 SQLite reader tests and six
  loader tests. These cover valid ranges, invalid selections, empty publisher
  text, malformed rows, database failures, initial copy, reuse, copy failure,
  and unexpected dataset metadata.
- `npm run test:bible`: the TypeScript repository read all 66 books, 1,189
  chapters, and 31,103 verse entries from the actual SQLite database. Checks
  include cross-chapter/cross-book ranges and invalid selections.
- `python scripts/test_bible_data.py`: four tests passed, including a comparison
  of every verse with the retained publisher XML, counts, integrity, foreign
  keys, representative verses, and the five empty entries.

## Installed Android app

- The prototype release variant built successfully, with an embedded JS bundle
  and database. The final verification rebuild took 17 seconds; the initial
  native release build took 7 minutes 6 seconds.
- The APK's `res/ID.db` is 7,245,824 bytes. Its SHA-256 is
  `55d3853b9a27cee8541548baa0c0f731461a036d6e5ae998b60470fcb21fd311`,
  matching `assets/bible/web-2026-09-28.db`.
- Airplane mode was enabled and Wi-Fi explicitly disabled before the first
  launch of the Bible-enabled app. No Metro server was used.
- The screen displayed "66 Bible books available offline", "James 1:19–20",
  and the expected passage text. Force-stop and relaunch also succeeded offline,
  exercising reuse of the copied database.
- Android `dumpsys netstats detail` was inspected for Carry's UID 10176 before
  and after relaunch. It showed no recorded traffic history for that UID. This
  is an offline accounting check, not packet capture or proof that no attempted
  connection could ever occur. Runtime Scripture code uses local SQL and has
  no remote Scripture endpoint.
- Screenshot: [offline Scripture preview](carry-bible-offline-api33.png).
- Emulator airplane mode and Wi-Fi were restored after verification.

The setup preview is verification scaffolding, not the completed browse/search
feature. The release variant uses the generated prototype signing configuration;
it is not a production distribution build. Native module/Gradle deprecation
warnings remain. npm audit also reports ten moderate transitive Expo CLI
advisories; forcing its proposed Expo downgrade is not part of this increment.

## Dataset and decisions

See [source and import record](../../../data/bible/README.md) for publisher links,
edition, source archive hashes, generation instructions, and schema. The pinned
export is dated 28 September 2026 and was retrieved on 1 October 2026.

- Canonical keys use the publisher's book codes, for example `JAS.1.19`.
- Numeric canonical order determines ranges; verse-key strings are not sorted.
- Carry selections remain keys only. Passage text and display references are
  resolved by the repository, avoiding duplicate Scripture sources of truth.
- Five publisher entries have empty text and remain empty. No text is invented.
- Scripture is copied into the app's document `SQLite` directory under a
  versioned filename and opened with connection-level `query_only` enabled.
  Future personal Carry storage must use a separate writable database.
