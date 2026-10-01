# Same-chapter selection verification

Verified on 2 October 2026, on `feature/passage-selection`.

## Automated checks

- Prettier, ESLint and strict TypeScript checks passed.
- Jest: 45 tests across eight suites passed. Four new hook tests cover tap
  progression, numeric backwards ordering (10 to 2), Clear/chapter reset,
  retry and stale asynchronous results. No new test dependencies.
- SQLite repository integration passed: 66 books, 1,189 chapters and 31,103
  verse entries. The dataset itself was unchanged.
- Scoped Git whitespace checks passed.

## Android acceptance

Expo prototype release build succeeded in 48 seconds and was installed on
Carry_C_API33 (Android 13/API 33). The existing temporary short-drive workaround
was used and removed after the build. This is not a production-signed release.

With airplane mode enabled and Wi-Fi disabled:

- Genesis 1:4 displayed a single selected verse and its resolved preview.
- Tapping verse 2 next displayed Genesis 1:2–4; verses 2, 3 and 4 exposed
  selected state in the Android accessibility hierarchy.
- The bounded preview scrolled to verse 4 without moving the chapter list.
- A third tap on verse 1 replaced the range with Genesis 1:1.
- Clear removed both the preview and all selected states.
- Android Back, opening chapter 2 and returning to chapter 1 left no old
  selection or preview.
- Force-stop/relaunch opened the book list offline; navigating to Genesis 1
  and selecting verse 1 loaded the preview without Metro.

Original radio settings were restored (airplane mode off, Wi-Fi on).
Screenshots were visually inspected for highlighting, preview layout and text:

- [Single verse](single-offline-api33.png)
- [Backwards range](range-offline-api33.png)

## Limits

Error/retry and late-result handling were checked with repository mocks, not
by corrupting the installed database. Empty-text preview handling has automated
coverage; this increment did not repeat a native empty-entry selection check.
This was a representative emulator check, not a physical-device, TalkBack,
large-font, usability study or packet-capture audit. Reference lookup and Carry
creation handoff remain unimplemented.
