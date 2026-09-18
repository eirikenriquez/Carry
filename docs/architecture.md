# Carry source architecture

This project follows the lightweight MVVM, Repository, and Service structure planned in Milestone 1. The dependency direction is:

```text
React Native View
  -> ViewModel
    -> application ports and services
      -> repository and notification interfaces
        <- SQLite and Expo adapters
```

## Planned responsibilities

- `src/app`: the composition root. It creates concrete adapters and passes dependencies into services, ViewModels, and Views.
- `src/features/<feature>/views`: React Native screens and components. Views render state and forward user actions.
- `src/features/<feature>/view-models`: presentation state and commands for a feature.
- `src/domain/entities`: framework-independent entities such as Carry, Category, Passage, Reflection, and CarryStatus.
- `src/application/ports`: interfaces including CarryOperations, CarryRepository, BibleRepository, and NotificationService.
- `src/application/services`: orchestration such as CarryLifecycleService.
- `src/infrastructure/repositories`: SQLite implementations for personal carry data and the bundled World English Bible data.
- `src/infrastructure/notifications`: the Expo Notifications adapter for Android.

Only folders containing real code are created during setup. The remaining folders will be introduced with their first feature instead of being added as empty placeholders.

## Boundary rules

- Views and ViewModels do not access SQLite or Expo Notifications directly.
- CarryLifecycleService coordinates creating, editing, deleting, completing, and scheduling reminders for carries.
- Repository and notification interfaces point inward; SQLite and Expo-specific code implement those interfaces at the infrastructure edge.
- Personal carry data remains local. No remote repository is planned for it.

The current setup screen demonstrates the first two real layers: `App.tsx` delegates to the composition root in `src/app`, which renders a React Native View under `src/features/setup/views`.
