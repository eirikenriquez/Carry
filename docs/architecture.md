# Architecture

Carry uses lightweight MVVM, Repository, and Service boundaries from Milestone 1.
Views render state; ViewModels handle interaction; infrastructure handles SQLite.

## Current structure

- `src/app`: wires dependencies and React Navigation.
- `src/features/bible/views`: screens and reusable Bible components.
- `src/features/bible/view-models`: loading, selection, lookup, and retry state.
- `src/domain`: framework-independent entities, validation, and derived status.
- `src/application/ports`: Bible and Carry repository contracts.
- `src/application/services`: reference parsing and validation.
- `src/infrastructure/repositories`: database opening and SQLite repositories.

Views and ViewModels depend on the repository contract, not SQLite directly.
The composition layer supplies the concrete implementation.

## Domain decisions

- Carries hold a category ID, situation, schedule, intention, passage keys,
  optional reminder ID, and optional embedded reflection.
- Categories are matched ignoring case and repeated whitespace; no duplicate
  normalized name is stored.
- Reflections use a whole-number alignment rating from 1 to 5.
- Carry status is derived from schedule and reflection, not persisted.
- Form validation returns issues; invalid current times or stored schedules throw in lifecycle rules.

## Bible flows

- Browsing: Books -> Chapters -> Verses; navigation passes IDs, not Scripture text.
- Selection: first tap selects one verse, second completes an ordered same-chapter
  range, third starts again. Clear and chapter changes reset selection.
- Lookup: full book names plus verse/range; the repository validates the keys.
  Typed backwards ranges are rejected. Lookup opens a fresh reading screen;
  Back returns to Books and the next verse tap starts a new selection.
- Preview resolves through `BibleRepository.getPassage`. Selections store keys only.
- Loading/error/ready states expose Retry. Cleanup and request guards ignore stale results.

## Storage and source data

- Bible reads use parameterized SQL and numeric canonical order, not string sorting.
- `openBundledBible` stages the first copy, validates its dataset version, then
  promotes it. Failed/stale temporary copies are cleaned up for retry.
- The versioned Bible is opened with `query_only`; personal data will use a
  separate writable database. Existing permanent Bible files are not auto-repaired.
- Keys follow publisher codes, e.g. `JAS.1.19`. Dataset updates need new assets,
  checksums, and compatibility review before migrating saved keys.
- Source: [eBible.org Protestant WEB](https://ebible.org/engwebp/) (`engwebp`,
  American spelling), [VPL archive](https://ebible.org/Scriptures/engwebp_vpl.zip).
  Retrieved 1 October 2026; XML dated 28 September 2026. The snapshot identifies
  the edition, not the rights page's older “2020 stable text” label.
- [Rights](https://ebible.org/engwebp/copyright.htm): public-domain text;
  World English Bible is a trademark. Changed text must not be labelled WEB.
  The retained archive includes `engwebp_about.htm`.
- Import: `python scripts/build_bible.py` verifies the pinned archive and creates
  `assets/bible/web-2026-09-28.db`; no runtime Scripture download.
- UTF-8 export whitespace is trimmed; wording/punctuation stay unchanged.
  Notes, formatting, introductions, and headings are absent from the VPL export.
- Dataset: 66 books, 1,189 chapters, 31,103 entries. Five empty entries remain empty:
  Luke 17:36, Acts 8:37, Acts 15:34, Acts 24:7, Romans 16:25.

SHA-256 checksums:

- Archive: `7d2e0b91ba43e2500fcab9c64d9db1962750deeff4e1186aed4c30220f5689be`
- XML: `ac0fe5d87ef7c192afa199eaf05a17e172c199e9b9776624daf89614224864f3`
- Database: `55d3853b9a27cee8541548baa0c0f731461a036d6e5ae998b60470fcb21fd311`

## Personal storage

- `CarryRepository` defines category reuse, Carry save/read/delete, and latest-reflection retrieval.
- The initial version-1 schema has categories, Carries, and reflections. Normalized
  category names are unique; each Carry owns at most one reflection, deleted with it.
- Dates use UTC ISO text; reminders are optional, and status is not stored.
  The SQLite Carry adapter matches categories and restores domain Date values.
- `openPersonalDatabase` opens a private connection, enables foreign keys before
  its transaction, and initializes only an empty version-0 database. Version 1
  is reused after column checks; unknown or damaged schemas fail without reset.
- Schema/opener checks use Node SQLite, including a temporary file reopened after
  closing. The opener is not wired into the app yet; callers must close its connection.
- The adapter opens/closes a private connection per operation. Category reuse,
  Carry save/read/delete and latest-reflection lookup are implemented.
  Carry lists sort by schedule/ID; latest reflections sort by creation time/ID.
- Saves transact the Carry and any supplied reflection together. Omitting a reflection
  preserves an existing one; deleting a Carry cascades to it, retaining the category.
  Parameterized writes return controlled failures and never schedule reminders.

## Planned, not implemented

- Carry creation UI and lifecycle orchestration; the storage backend is implemented.
- Notification interfaces/adapters.
- Validate passage keys through the Bible repository before saving a Carry;
  personal data remains local. Add folders only when their code is needed.
