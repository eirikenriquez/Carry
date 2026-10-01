# Bundled World English Bible

Carry uses eBible.org's 66-book World English Bible Protestant Edition (`engwebp`), American spelling. The publisher currently describes this as a subset of WEB Updated. Its rights page still says "2020 stable text edition"; that label alone does not identify the downloaded snapshot.

- Publisher: https://ebible.org/engwebp/
- Download: https://ebible.org/Scriptures/engwebp_vpl.zip
- Rights: https://ebible.org/engwebp/copyright.htm
- Retrieved: 1 October 2026 (New Zealand time)
- XML timestamp inside archive: 28 September 2026
- Archive SHA-256: `7d2e0b91ba43e2500fcab9c64d9db1962750deeff4e1186aed4c30220f5689be`
- XML SHA-256: `ac0fe5d87ef7c192afa199eaf05a17e172c199e9b9776624daf89614224864f3`

The translation is public domain. "World English Bible" is eBible.org's trademark; changed translation text must not be represented as the World English Bible. The source archive includes the publisher's full rights statement in `engwebp_about.htm`.

## Import

Run `python scripts/build_bible.py` from the repository root. It verifies the pinned archive hash and creates `assets/bible/web-2026-09-28.db`. The app bundles this database; it does not download Scripture at runtime.

The XML is parsed as UTF-8. Leading/trailing export whitespace is removed; verse wording and punctuation are preserved. The publisher's VPL export omits notes, formatting, introductions, and section titles. It contains 66 books, 1,189 chapters, and 31,103 verse entries.

Five source entries contain no text: Luke 17:36, Acts 8:37, Acts 15:34, Acts 24:7, and Romans 16:25. They remain empty in the database. No text is invented or imported from a different edition.

Keys use the source's three-character book code plus chapter and verse, such as `JAS.1.19` and `JHN.3.16`. Numeric canonical order is stored separately; text sorting is not a valid Bible ordering rule.

The database schema separates books from verses. Scripture is opened with SQLite `query_only` enabled. A future dataset change requires a new asset filename, checksums, and verse-key compatibility checks before existing Carry references are migrated.
