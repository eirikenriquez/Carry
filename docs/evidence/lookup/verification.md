# Reference lookup verification

Verified on 2 October 2026, on `feature/reference-lookup`.

## Automated checks

- Format, lint and strict TypeScript checks passed.
- Jest: 51 tests across ten suites passed. Four resolver tests cover parsing,
  names, numeric bounds and repository validation/errors. Two ViewModel tests
  cover retry, duplicate submits and results after editing/unmounting.
- Existing selection test now checks validated initial selection and fresh-tap
  behaviour. No new test dependencies.
- Real SQLite integration still checks 66 books, 1,189 chapters and 31,103 entries;
  additionally resolves John 3:16, James 1:19–20, 1 John 3:16 and Luke 17:36, and
  rejects a missing verse. Dataset unchanged.

## Installed Android acceptance

Expo prototype release variant installed on Carry_C_API33, Android 13/API 33.
Final build succeeded in 23 seconds. Temporary R: mapping avoided the known
Windows native-build path limit and was removed after verification.

With airplane mode on and Wi-Fi off:

- John 3:16 opened John 3 with the resolved passage preview.
- Android Back returned directly to Books, retaining the input for correction.
- John 3:999, John 99:1, Jhn 3:16 and John 3:20-16 stayed on Books with clear
  feedback. Correcting the input to James 1:19-20 opened the correct range.
- Luke 17:36 opened with the explicit empty-text placeholder, not invented text.
- Tapping Luke 17:1 replaced the looked-up selection; Clear removed its preview.
- Force-stop/relaunch, then `1 john 3:16`, resolved the numbered book offline
  without Metro.

Screenshots visually inspected for readable input/errors and preview layout:

- [Single verse](single-offline-api33.png)
- [Range](range-offline-api33.png)
- [Invalid range](invalid-offline-api33.png)
- [Empty publisher entry](empty-offline-api33.png)

Original radio settings restored: airplane mode off, Wi-Fi on. No app data was
cleared and no existing Bible database was replaced for these checks.

## Limits and scope

Full display book names only; no abbreviations, keyword search or cross-chapter
lookup. Typed backwards ranges are rejected rather than silently reordered.
The reading list starts at the chapter beginning; the selected passage is
immediately available in the bottom preview. No automatic variable-height list
scrolling was added.

Unavailable reads and asynchronous races use automated controlled promises,
not corrupted installed data. This is representative emulator acceptance, not
a physical-device, TalkBack, large-font or first-time usability study. Carry
creation handoff/persistence and the complete lifecycle remain unimplemented.
