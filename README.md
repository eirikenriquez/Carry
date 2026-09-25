# Carry

A React Native application built with Expo and TypeScript for COMP826 Milestone 2.

## Prerequisites

- Node.js and npm
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
