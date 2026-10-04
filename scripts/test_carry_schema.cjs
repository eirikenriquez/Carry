const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DatabaseSync } = require('node:sqlite');

const {
  personalDatabaseSchema,
  personalDatabaseVersion,
} = require('../src/repositories/personalDatabaseSchema.ts');
const { normalizeCategoryName } = require('../src/models/normalizeCategoryName.ts');

/**
 * Create an isolated SQLite database and close it after the test.
 */
function openTestDatabase(t) {
  const database = new DatabaseSync(':memory:');
  t.after(() => database.close());
  database.exec('PRAGMA foreign_keys = ON');
  database.exec('BEGIN');
  database.exec(personalDatabaseSchema);
  database.exec('COMMIT');
  return database;
}

/**
 * Insert one representative Carry without a reflection or reminder.
 */
function insertCarry(database, categoryId = 'category-1') {
  database
    .prepare(
      `
    INSERT INTO carries (
      id, category_id, situation, scheduled_at, start_verse_key, end_verse_key,
      if_then_intention, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      'carry-1',
      categoryId,
      'A difficult conversation',
      '2026-10-03T21:00:00.000Z',
      'JAS.1.19',
      'JAS.1.20',
      'If I feel defensive, then I will listen first.',
      '2026-10-02T01:00:00.000Z',
    );
}

test('creates versioned personal tables and preserves the stored Carry fields', (t) => {
  const database = openTestDatabase(t);
  assert.equal(database.prepare('PRAGMA user_version').get().user_version, personalDatabaseVersion);
  assert.deepEqual(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => row.name),
    ['carries', 'categories', 'reflections'],
  );
  database.prepare('INSERT INTO categories VALUES (?, ?, ?)').run('category-1', 'Work', 'work');
  insertCarry(database);
  assert.deepEqual(
    { ...database.prepare('SELECT * FROM carries').get() },
    {
      id: 'carry-1',
      category_id: 'category-1',
      situation: 'A difficult conversation',
      scheduled_at: '2026-10-03T21:00:00.000Z',
      start_verse_key: 'JAS.1.19',
      end_verse_key: 'JAS.1.20',
      if_then_intention: 'If I feel defensive, then I will listen first.',
      reminder_id: null,
      created_at: '2026-10-02T01:00:00.000Z',
    },
  );
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM reflections').get().count, 0);
});

test('enforces normalized category uniqueness and valid Carry category links', (t) => {
  const database = openTestDatabase(t);
  const insertCategory = database.prepare('INSERT INTO categories VALUES (?, ?, ?)');
  insertCategory.run('category-1', 'Work', normalizeCategoryName('Work'));
  assert.throws(
    () => insertCategory.run('category-2', ' work ', normalizeCategoryName(' work ')),
    /UNIQUE constraint/,
  );
  assert.throws(() => insertCategory.run('category-2', '', ''), /CHECK constraint/);
  assert.throws(() => insertCarry(database, 'missing-category'), /FOREIGN KEY constraint/);
  insertCarry(database);
  assert.throws(
    () => database.prepare('DELETE FROM categories WHERE id = ?').run('category-1'),
    /FOREIGN KEY constraint/,
  );
});

test('enforces reflection ownership and ratings, and removes reflections with their Carry', (t) => {
  const database = openTestDatabase(t);
  database.prepare('INSERT INTO categories VALUES (?, ?, ?)').run('category-1', 'Work', 'work');
  insertCarry(database);
  const insertReflection = database.prepare('INSERT INTO reflections VALUES (?, ?, ?, ?, ?, ?)');
  assert.throws(
    () =>
      insertReflection.run(
        'reflection-1',
        'missing-carry',
        3,
        'I listened.',
        'Pause first.',
        '2026-10-04T01:00:00.000Z',
      ),
    /FOREIGN KEY constraint/,
  );
  insertReflection.run(
    'reflection-1',
    'carry-1',
    3,
    'I listened.',
    'Pause first.',
    '2026-10-04T01:00:00.000Z',
  );
  assert.throws(
    () =>
      insertReflection.run(
        'reflection-2',
        'carry-1',
        4,
        'I listened.',
        'Pause first.',
        '2026-10-04T02:00:00.000Z',
      ),
    /UNIQUE constraint/,
  );
  for (const rating of [0, 6, 2.5]) {
    assert.throws(
      () => database.prepare('UPDATE reflections SET alignment_rating = ?').run(rating),
      /CHECK constraint/,
    );
  }
  database.prepare('DELETE FROM carries WHERE id = ?').run('carry-1');
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM reflections').get().count, 0);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM categories').get().count, 1);
  assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
});
