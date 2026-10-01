# Carry

A React Native application built with Expo and TypeScript for COMP826 Milestone 2.

## Prerequisites

- Node.js 24 and npm (the SQLite integration check uses Node's built-in SQLite)
- Android Studio with an Android SDK and an emulator
- An Android development build generated from this project

## Install and verify

Install the exact dependency versions recorded in `package-lock.json`:

```powershell
npm ci
npm run typecheck
```

Start an Android emulator in Android Studio, then launch Carry:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npm run android
```

The first run generates the native Android project, builds and installs Carry,
and starts Metro. Later JavaScript and TypeScript changes can reuse the installed
development build by starting Metro and pressing `a`:

```powershell
npm run start
# Press a after Metro starts.
```

The Android application ID is `com.eirikenriquez.carry`. Rebuild the development
app after changing native dependencies or Expo configuration.

The initial Expo Go result is recorded at
[`docs/evidence/setup/carry-expo-go-emulator-c-api33.png`](docs/evidence/setup/carry-expo-go-emulator-c-api33.png).
The verified development-build result is recorded at
[`docs/evidence/setup/carry-development-build-api33.png`](docs/evidence/setup/carry-development-build-api33.png).

## Architecture

The source structure follows the lightweight MVVM, Repository, and Service boundaries planned in Milestone 1. See [`docs/architecture.md`](docs/architecture.md) for the dependency direction and folder responsibilities.

The project uses an Expo development build so native SQLite and notification
behaviour can be tested before feature work depends on it.

## Bundled Scripture

The World English Bible is packaged as `assets/bible/web-2026-09-28.db`.
Source, edition, checksums, import steps, and the five empty publisher entries
are recorded in [`data/bible/README.md`](data/bible/README.md).

The app now opens a book list, then a chapter list, then numbered verse text.
Data still comes through `BibleRepository`; React Navigation handles the screen
stack. Loading failures offer Retry, and empty publisher entries are labelled
rather than filled with invented text. Passage selection and reference lookup
are not implemented yet.

Browser verification is recorded separately from the earlier James 1:19–20
setup preview, which remains historical evidence for bundled-data loading.
See [`docs/evidence/browser/verification.md`](docs/evidence/browser/verification.md)
for this increment's checks and Android screenshots.

Run the checks from this directory:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:bible
python scripts/test_bible_data.py
```

The last command needs Python 3 and verifies every verse against the retained
publisher export. The Node check exercises the TypeScript repository against
the actual database, including every book and chapter. A Node experimental
SQLite warning is expected.

To verify an installed app without Metro, build the prototype release variant:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npx expo run:android --variant release --device Carry_C_API33 --no-bundler
```

Use your emulator's name if different. This is a local verification build, not
a production-signed release. Rebuild with `npm run android` when returning to
development. Verification results are in
[`docs/evidence/bible/verification.md`](docs/evidence/bible/verification.md).

### Windows native-build path limit

If CMake/Ninja reports a filename longer than 260 characters, build through a
temporary short drive mapping. Check `subst` first and choose an unused letter.
Map the **parent folder**, not Carry itself: Expo's package discovery skips a
drive root. For this checkout, with `R:` unused:

```powershell
subst R: "C:\Users\eirik\OneDrive\Documents\MCIS\mobile\Milestone 2"
Push-Location R:\Carry
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
npx expo run:android --variant release --device Carry_C_API33 --no-bundler
Pop-Location
subst R: /D
```

This maps the existing checkout; it does not move files or change Windows
long-path settings. Native compiler cache/deprecation warnings may still occur.
