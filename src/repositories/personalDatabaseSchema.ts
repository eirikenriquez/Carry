/**
 * Defines the initial tables and schema version for personal Carry data.
 * Includes category links, reflection constraints and a category lookup index.
 */
export const personalDatabaseVersion = 1;

// Initial schema only. The loader must enable foreign keys and apply it atomically.
export const personalDatabaseSchema = `
  CREATE TABLE categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    normalized_name TEXT NOT NULL UNIQUE CHECK (length(normalized_name) > 0)
  );

  CREATE TABLE carries (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    situation TEXT NOT NULL CHECK (length(trim(situation)) > 0),
    scheduled_at TEXT NOT NULL,
    start_verse_key TEXT NOT NULL CHECK (length(trim(start_verse_key)) > 0),
    end_verse_key TEXT NOT NULL CHECK (length(trim(end_verse_key)) > 0),
    if_then_intention TEXT NOT NULL CHECK (length(trim(if_then_intention)) > 0),
    reminder_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX carries_by_category ON carries(category_id);

  CREATE TABLE reflections (
    id TEXT PRIMARY KEY NOT NULL,
    carry_id TEXT NOT NULL UNIQUE REFERENCES carries(id) ON DELETE CASCADE,
    alignment_rating INTEGER NOT NULL CHECK (alignment_rating IN (1, 2, 3, 4, 5)),
    what_occurred TEXT NOT NULL CHECK (length(trim(what_occurred)) > 0),
    insight TEXT NOT NULL CHECK (length(trim(insight)) > 0),
    created_at TEXT NOT NULL
  );

  PRAGMA user_version = ${personalDatabaseVersion};
`;
