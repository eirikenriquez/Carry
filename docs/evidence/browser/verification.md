# Bible browser verification

Verified 2 October 2026 (New Zealand time) on Carry_C_API33, Android 13/API 33,
package `com.eirikenriquez.carry`. This is browsing-only evidence, not completion
of passage selection, reference lookup, or Carry creation.

## Automated checks

- Formatting, Expo ESLint, strict TypeScript and whitespace checks passed.
- Jest: 41 tests across seven suites. Four new hook tests cover book-read
  retry/repository reuse, chapter retry, stale responses and empty results.
- Real SQLite check: 66 books, all 1,189 chapters and 31,103 verse entries.
- Lint found missing explicit Jest imports and synchronous loading resets in
  effects. Imports were added; Retry now resets loading in its event handler.
  Changed chapter identities derive loading state without an extra effect render.

## Android acceptance

The installed prototype release build ran without Metro, with airplane mode on
and Wi-Fi off (settings read-back: 1 and 0).

- Books -> Genesis -> chapter 1 displayed the expected numbered Scripture.
- Android Back returned from verses to chapters; header Back returned to books.
- Scrolling the book/chapter lists reached Luke 17. Verse 36 displayed
  "No verse text in this edition." with its verse number preserved.
- Force-stop/relaunch remained offline and returned to the book list. Opening
  Genesis 2 displayed "The heavens, the earth, and all their vast array were
  finished." rather than the previously viewed chapter.
- Screenshots were visually reviewed for readable text and safe header/bottom
  spacing. Observed rows were 266 px (books) and 224 px (chapters) at 640 dpi,
  approximately 66.5 dp and 56 dp. This is representative visual/control QA,
  not a complete accessibility audit or user study.

Evidence: [books](books-offline-api33.png),
[chapters](chapters-offline-api33.png), [verses](verses-offline-api33.png),
[empty publisher verse](empty-verse-offline-api33.png).

## Build environment and limitations

The original long checkout path exceeded Ninja's 260-character filename limit.
A temporary `R:` mapping to the checkout's parent allowed building from
`R:\Carry`; mapping Carry itself as a drive root failed Expo package discovery.
The successful native build took 7m 2s and used Kotlin's non-daemon fallback
after an incremental-cache error. Native deprecation and Gradle memory warnings
remain. No dependencies were downgraded or Windows settings changed.

The temporary mapping was removed. Emulator settings were restored to airplane
mode off/Wi-Fi on (0 and 1); application data was not cleared. This is a local
verification release with prototype signing, not a production release.

Retry/error handling was exercised by hook tests, not by corrupting the installed
database. No packet capture or new network-accounting claim is made here.
