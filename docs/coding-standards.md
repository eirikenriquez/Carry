# Coding standards

Rules agreed while building Carry. Written on 9 October 2026.

## File layout

- Start with a short block comment explaining the file.
- Use this order: imports, types/interfaces, constants, main exports, private helpers.
- Put styles last and class public methods before private ones where practical.
- Don't change initialization or hook order just to tidy a file.

## Comments

- Use `/** ... */` above functions or classes that need explaining; `//` for inline notes.
- Explain tricky logic or why something is done. Skip obvious comments.

## Code

- Use clear names and small functions. Don't add helpers just to add helpers.
- Keep strict TypeScript; avoid `any`. Prefer readonly domain data and return changed copies.
- Handle errors instead of hiding them.
- Screens show UI; ViewModels handle state and actions. Neither calls SQLite or Expo Notifications directly.
- Keep domain rules separate from React Native. See [architecture](architecture.md) for the rest.

## Checks

- Use Prettier, ESLint and TypeScript. Commands are in the [README](../README.md#checks).
- Keep tests beside the code; cover main flows and realistic failures.
- Run checks that fit the change. Check native features in the installed app.
- Record actual results and limits in the [test log](test-log.md).
