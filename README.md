# Carry

Carry is designed to help users connect Scripture with everyday situations:
choose a passage, plan an action, and reflect afterward.

An Android app built with React Native, Expo, and TypeScript for COMP826 Milestone 2.

## Current features

- Browse the bundled [World English Bible](https://ebible.org/engwebp/) offline
  or look up references such as `John 3:16`; select a verse or same-chapter range.
- Start from Home, with Upcoming, Ready to reflect and Completed Carries available
  offline, including after app restart.
- Create a Carry with a category, situation, future schedule and if-then plan.
- Edit or confirm deletion of an upcoming Carry without changing other records.
- Receive a local reminder 15 minutes before an eligible Carry; tap to reopen it.
- Save a rating, what happened and an insight; see the latest reflection when
  reusing its category.

Lookup excludes abbreviations, keyword search and cross-chapter ranges.

## Requirements

- Git
- Node.js 24 and npm
- Android Studio with an Android SDK and emulator
- A JDK with `JAVA_HOME` pointing to its installation
- Python 3, only for the source-data check

## Run locally

Start an Android emulator, then run in PowerShell:

```powershell
git clone https://github.com/eirikenriquez/Carry.git
Set-Location Carry
npm ci
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npm run android
```

If the repository is already cloned, open its `Carry` directory and skip the
first two commands.

The first run builds and installs the Expo development app and starts Metro.
For later JavaScript or TypeScript changes, run `npm run start` and press `a`.
Rebuild after native dependency or Expo configuration changes; use the development
build, not Expo Go, for native verification.

A standalone release APK contains its own code and runs without Metro. To see
updated code in that version, install a newly built APK on the emulator; starting
Metro alone will not update it.

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
