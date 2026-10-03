# Carry

Carry is designed to help users connect Scripture with everyday situations:
choose a passage, plan an action, and reflect afterward.

An Android app built with React Native, Expo, and TypeScript for COMP826 Milestone 2.

## Current features

- Browse the bundled [World English Bible](https://ebible.org/engwebp/) offline
  by book and chapter.
- Select and preview a verse or same-chapter range.
- Look up full-name references such as `John 3:16` or `James 1:19-20`.
- Create a Carry with a category, situation, future schedule and if-then plan.
- Reopen saved Carries offline, including after restarting the app.
- Edit an upcoming Carry without changing its identity or other saved Carries.
- Delete an upcoming Carry after confirmation, keeping its reusable category.
- Schedule a local reminder 15 minutes before an eligible Carry; tap it to reopen details.

Edit/delete reminder synchronization and reflection UI remain pending.
Lookup excludes abbreviations, keyword search and cross-chapter ranges.

## Requirements

- Node.js 24 and npm
- Android Studio with an Android SDK and emulator
- Python 3, only for the source-data check

## Run locally

From this directory, start an Android emulator and run:

```powershell
npm ci
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npm run android
```

The first run builds and installs the Expo development app and starts Metro.
For later JavaScript or TypeScript changes, run `npm run start` and press `a`.
Rebuild after native dependency or Expo configuration changes; use the development
build, not Expo Go, for native verification.

## Checks

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:bible
npm run test:carry
python scripts/test_bible_data.py
```

`test:bible` checks the Bible repository; `test:carry` checks personal storage
against real SQLite. Node's experimental SQLite warning is expected.
Python checks the data against the publisher export.

## Documentation

- [Architecture, decisions, and Bible provenance](docs/architecture.md)
- [Test checkpoints, screenshots, and limitations](docs/test-log.md)
