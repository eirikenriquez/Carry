# Carry

A React Native application built with Expo and TypeScript for COMP826 Milestone 2.

## Prerequisites

- Node.js and npm
- Android Studio with an Android SDK and an emulator
- Expo Go for the initial emulator check

## Install and verify

Install the exact dependency versions recorded in `package-lock.json`:

```powershell
npm ci
npm run typecheck
```

Start an Android emulator in Android Studio, then launch Carry:

```powershell
npm run android
```

The emulator should open Expo Go and display **Carry** with **App setup is ready.**

To start the Expo development server without immediately targeting Android:

```powershell
npm run start
```

The verified Android emulator result is recorded at [`docs/evidence/setup/carry-expo-go-emulator-c-api33.png`](docs/evidence/setup/carry-expo-go-emulator-c-api33.png).

## Architecture

The source structure follows the lightweight MVVM, Repository, and Service boundaries planned in Milestone 1. See [`docs/architecture.md`](docs/architecture.md) for the dependency direction and folder responsibilities.

The current Expo Go flow is the initial setup check. A custom Android development build will be introduced by its own backlog item when native notification work begins.
