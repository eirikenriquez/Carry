const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { test } = require('node:test');
const ts = require('typescript');

const { personalDatabaseSchema } = require('../src/repositories/personalDatabaseSchema.ts');

/**
 * Run the actual opener using a real SQLite connection in place of Expo's native bridge.
 */
function loadTypeScript(relativePath, dependencies) {
  const compiled = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  );
  const loaded = { exports: {} };
  function requireDependency(name) {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    throw new Error(`Unexpected storage dependency: ${name}`);
  }
  new Function('exports', 'require', 'module', compiled.outputText)(
    loaded.exports,
    requireDependency,
    loaded,
  );
  return loaded.exports;
}

function loadOpener(openConnection) {
  return loadTypeScript('src/repositories/openPersonalDatabase.ts', {
    'expo-sqlite': { openDatabaseAsync: openConnection },
    './personalDatabaseSchema': require('../src/repositories/personalDatabaseSchema.ts'),
  }).openPersonalDatabase;
}

/**
 * Adapt Node SQLite to the small Expo API surface used by database initialization.
 */
function connect(database) {
  return {
    async execAsync(sql) {
      database.exec(sql);
    },
    async getFirstAsync(sql, ...params) {
      return database.prepare(sql).get(...params) ?? null;
    },
    async getAllAsync(sql, ...params) {
      return database.prepare(sql).all(...params);
    },
    async runAsync(sql, ...params) {
      return database.prepare(sql).run(...params);
    },
    async closeAsync() {
      database.close();
    },
  };
}

/**
 * Use isolated file-backed storage so each repository operation opens a real connection.
 */
function createRepository(t, onTransactionBegin) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'carry-repository-'));
  const filename = path.join(directory, 'carry.db');
  const database = new DatabaseSync(filename);
  t.after(() => {
    database.close();
    fs.unlinkSync(filename);
    fs.rmdirSync(directory);
  });
  database.exec(personalDatabaseSchema);
  const openPersonalDatabase = loadOpener(async () => {
    const connection = connect(new DatabaseSync(filename));
    if (onTransactionBegin) {
      const execAsync = connection.execAsync;
      connection.execAsync = async (sql) => {
        await execAsync(sql);
        if (sql === 'BEGIN IMMEDIATE') onTransactionBegin();
      };
    }
    return connection;
  });
  const { SQLiteCarryRepository } = loadTypeScript('src/repositories/SQLiteCarryRepository.ts', {
    './openPersonalDatabase': { openPersonalDatabase },
    '../models/getCarryStatus': require('../src/models/getCarryStatus.ts'),
    '../models/normalizeCategoryName': require('../src/models/normalizeCategoryName.ts'),
  });
  return { repository: new SQLiteCarryRepository(), database };
}

function carryFixture(id = 'carry-1') {
  return {
    id,
    categoryId: 'work',
    situation: 'A difficult conversation',
    scheduledAt: new Date('2026-10-03T21:00:00.000Z'),
    passage: { startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.20' },
    ifThenIntention: 'If I feel defensive, then I will listen first.',
    createdAt: new Date('2026-10-02T01:00:00.000Z'),
    reminderId: undefined,
    reflection: undefined,
  };
}

function reflectionFixture(id = 'reflection-2', createdAt = '2026-10-04T01:00:00.000Z') {
  return {
    id,
    alignmentRating: 4,
    whatOccurred: 'I listened first.',
    insight: 'Pausing helped.',
    createdAt: new Date(createdAt),
  };
}

/**
 * Seed a stored record independently of the repository's read implementation.
 */
function insertCarry(database, carry) {
  database
    .prepare(
      `INSERT INTO carries (id, category_id, situation, scheduled_at,
    start_verse_key, end_verse_key, if_then_intention, reminder_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      carry.id,
      carry.categoryId,
      carry.situation,
      carry.scheduledAt.toISOString(),
      carry.passage.startVerseKey,
      carry.passage.endVerseKey,
      carry.ifThenIntention,
      carry.reminderId ?? null,
      carry.createdAt.toISOString(),
    );
}

test('creates Carries with new or normalized-reused categories', async (t) => {
  const { repository } = createRepository(t);
  const first = carryFixture();
  assert.deepEqual(await repository.create({ id: 'work', name: '  Work   Stress ' }, first), {
    ok: true,
    value: first,
  });

  const second = { ...carryFixture('carry-2'), categoryId: 'another-work-id' };
  assert.deepEqual(
    await repository.create({ id: 'another-work-id', name: 'work stress' }, second),
    { ok: true, value: { ...second, categoryId: 'work' } },
  );
  assert.deepEqual(await repository.getCategories(), {
    ok: true,
    value: [{ id: 'work', name: 'Work Stress' }],
  });
});

test('updates an existing Carry with a normalized category and preserves canonical metadata', async (t) => {
  const { repository, database } = createRepository(t);
  await repository.getOrCreateCategory({ id: 'work', name: 'Work' });
  await repository.getOrCreateCategory({ id: 'family', name: 'Family' });
  const original = {
    ...carryFixture(),
    reminderId: 'stored-reminder',
    reflection: reflectionFixture('stored-reflection'),
  };
  const other = carryFixture('carry-2');
  insertCarry(database, original);
  insertCarry(database, other);
  database
    .prepare('INSERT INTO reflections VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      original.reflection.id,
      original.id,
      original.reflection.alignmentRating,
      original.reflection.whatOccurred,
      original.reflection.insight,
      original.reflection.createdAt.toISOString(),
    );
  database
    .prepare('UPDATE carries SET reminder_id = ? WHERE id = ?')
    .run(original.reminderId, original.id);

  const edited = {
    ...original,
    categoryId: 'family-alias',
    situation: 'A family conversation',
    scheduledAt: new Date('2026-10-04T01:00:00.000Z'),
    passage: { startVerseKey: 'JHN.3.16', endVerseKey: 'JHN.3.16' },
    ifThenIntention: 'If I get frustrated, then I will pause.',
    createdAt: new Date('2026-10-05T01:00:00.000Z'),
    reminderId: 'replacement-reminder',
    reflection: reflectionFixture('replacement-reflection'),
  };
  assert.deepEqual(await repository.update({ id: 'family-alias', name: '  FAMILY  ' }, edited), {
    ok: true,
    value: {
      ...edited,
      categoryId: 'family',
      createdAt: original.createdAt,
      reminderId: original.reminderId,
      reflection: original.reflection,
    },
  });
  assert.deepEqual(await repository.findById(original.id), {
    ok: true,
    value: {
      ...edited,
      categoryId: 'family',
      createdAt: original.createdAt,
      reminderId: original.reminderId,
      reflection: original.reflection,
    },
  });
  assert.deepEqual(await repository.findById(other.id), { ok: true, value: other });
  assert.deepEqual(await repository.getCategories(), {
    ok: true,
    value: [
      { id: 'family', name: 'Family' },
      { id: 'work', name: 'Work' },
    ],
  });
});

test('deletes only an upcoming Carry using status read under the write lock', async (t) => {
  let transactionNow = new Date('2026-10-03T20:59:59.000Z');
  let makeOriginalDueOnBegin = true;
  let monitorDelete = false;
  let beginCount = 0;
  let deleteWriteLockAcquired = false;
  const { repository, database } = createRepository(t, () => {
    if (!monitorDelete) return;
    beginCount += 1;
    if (beginCount === 2) {
      deleteWriteLockAcquired = true;
      if (makeOriginalDueOnBegin) transactionNow = new Date('2026-10-03T21:00:00.000Z');
    }
  });
  await repository.getOrCreateCategory({ id: 'work', name: 'Work' });
  await repository.getOrCreateCategory({ id: 'family', name: 'Family' });
  const original = carryFixture();
  const other = carryFixture('carry-2');
  const completed = {
    ...carryFixture('carry-completed'),
    scheduledAt: new Date('2026-10-04T21:00:00.000Z'),
    reflection: reflectionFixture('reflection-completed'),
  };
  insertCarry(database, original);
  insertCarry(database, other);
  insertCarry(database, completed);
  database
    .prepare('INSERT INTO reflections VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      completed.reflection.id,
      completed.id,
      completed.reflection.alignmentRating,
      completed.reflection.whatOccurred,
      completed.reflection.insight,
      completed.reflection.createdAt.toISOString(),
    );
  const now = () => {
    assert.equal(deleteWriteLockAcquired, true);
    return new Date(transactionNow.getTime());
  };
  const deleteWithLock = async (id) => {
    monitorDelete = true;
    beginCount = 0;
    deleteWriteLockAcquired = false;
    try {
      return await repository.delete(id, now);
    } finally {
      monitorDelete = false;
    }
  };

  assert.deepEqual(await deleteWithLock(original.id), {
    ok: false,
    code: 'not_upcoming',
  });
  assert.deepEqual(await repository.findById(original.id), { ok: true, value: original });

  makeOriginalDueOnBegin = false;
  transactionNow = new Date('2026-10-03T20:00:00.000Z');
  assert.deepEqual(await deleteWithLock(completed.id), {
    ok: false,
    code: 'not_upcoming',
  });
  assert.deepEqual(await repository.findById(completed.id), { ok: true, value: completed });

  assert.deepEqual(await deleteWithLock(original.id), { ok: true, value: original });
  assert.deepEqual(await deleteWithLock(original.id), { ok: true, value: null });
  assert.deepEqual(await deleteWithLock('missing'), { ok: true, value: null });
  assert.deepEqual(await repository.findById(original.id), { ok: true, value: null });
  assert.deepEqual(await repository.findById(other.id), { ok: true, value: other });
  assert.deepEqual(await repository.findById(completed.id), { ok: true, value: completed });
  assert.equal(database.prepare('SELECT count(*) AS count FROM categories').get().count, 2);
  assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
});

test('reads Carries, restores optional fields, and orders the latest reflection deterministically', async (t) => {
  const { repository, database } = createRepository(t);
  assert.deepEqual(await repository.findById('missing'), { ok: true, value: null });
  assert.deepEqual(await repository.findAll(), { ok: true, value: [] });
  assert.deepEqual(await repository.latestReflection('work'), { ok: true, value: null });
  await repository.getOrCreateCategory({ id: 'work', name: 'Work' });
  const first = carryFixture();
  insertCarry(database, first);
  assert.deepEqual(await repository.findById(first.id), { ok: true, value: first });
  const second = {
    ...carryFixture('carry-2'),
    reminderId: 'notification-2',
    scheduledAt: new Date('2026-10-03T20:00:00.000Z'),
  };
  insertCarry(database, second);
  const reflection = reflectionFixture();
  const insertReflection = database.prepare('INSERT INTO reflections VALUES (?, ?, ?, ?, ?, ?)');
  insertReflection.run(
    'reflection-1',
    first.id,
    3,
    'I paused.',
    'Listen more.',
    '2026-10-03T23:00:00.000Z',
  );
  insertReflection.run(
    reflection.id,
    second.id,
    4,
    reflection.whatOccurred,
    reflection.insight,
    reflection.createdAt.toISOString(),
  );
  assert.deepEqual(await repository.findById(second.id), {
    ok: true,
    value: { ...second, reflection },
  });
  assert.deepEqual(
    (await repository.findAll()).value.map((carry) => carry.id),
    ['carry-2', 'carry-1'],
  );
  assert.deepEqual(await repository.latestReflection('work'), { ok: true, value: reflection });
  database
    .prepare('UPDATE reflections SET created_at = ? WHERE id = ?')
    .run(reflection.createdAt.toISOString(), 'reflection-1');
  assert.deepEqual(await repository.latestReflection('work'), { ok: true, value: reflection });
  assert.deepEqual(await repository.latestReflection('missing'), { ok: true, value: null });
});

test('initializes once and preserves stored data when the database file is reopened', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'carry-database-'));
  const filename = path.join(directory, 'carry.db');
  t.after(() => {
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
    fs.rmdirSync(directory);
  });
  const calls = [];
  const open = loadOpener(async (...args) => {
    calls.push(args);
    return connect(new DatabaseSync(filename));
  });
  const first = await open();
  assert.equal(first.ok, true);
  try {
    assert.equal((await first.value.getFirstAsync('PRAGMA user_version')).user_version, 1);
    assert.equal((await first.value.getFirstAsync('PRAGMA foreign_keys')).foreign_keys, 1);
    await first.value.execAsync("INSERT INTO categories VALUES ('work', 'Work', 'work')");
  } finally {
    await first.value.closeAsync();
  }
  const reopened = await open();
  assert.equal(reopened.ok, true);
  try {
    assert.equal((await reopened.value.getFirstAsync('SELECT name FROM categories')).name, 'Work');
    assert.equal((await reopened.value.getFirstAsync('PRAGMA foreign_keys')).foreign_keys, 1);
  } finally {
    await reopened.value.closeAsync();
  }
  assert.deepEqual(calls, [
    ['carry.db', { useNewConnection: true }],
    ['carry.db', { useNewConnection: true }],
  ]);
});

test('saves, updates, and deletes complete Carries while preserving reusable categories', async (t) => {
  const { repository, database } = createRepository(t);
  await repository.getOrCreateCategory({ id: 'work', name: 'Work' });
  await repository.getOrCreateCategory({ id: 'family', name: 'Family' });
  const original = carryFixture();
  assert.deepEqual(await repository.save(original), { ok: true, value: original });
  assert.deepEqual(await repository.findById(original.id), { ok: true, value: original });
  const edited = {
    ...original,
    categoryId: 'family',
    situation: 'A family conversation',
    scheduledAt: new Date('2026-10-04T01:00:00.000Z'),
    passage: { startVerseKey: 'JHN.3.16', endVerseKey: 'JHN.3.16' },
    ifThenIntention: 'If I get frustrated, then I will pause.',
    reminderId: 'reminder-1',
  };
  assert.deepEqual(await repository.save(edited), { ok: true, value: edited });
  assert.deepEqual(await repository.findById(edited.id), { ok: true, value: edited });
  const reflected = { ...edited, reminderId: undefined, reflection: reflectionFixture() };
  assert.deepEqual(await repository.save(reflected), { ok: true, value: reflected });
  assert.deepEqual(await repository.findById(reflected.id), { ok: true, value: reflected });
  assert.deepEqual(await repository.save({ ...reflected, reflection: undefined }), {
    ok: true,
    value: reflected,
  });
  assert.deepEqual(await repository.latestReflection('family'), {
    ok: true,
    value: reflected.reflection,
  });
  assert.deepEqual(await repository.delete(original.id), { ok: true, value: reflected });
  assert.deepEqual(await repository.delete(original.id), { ok: true, value: null });
  assert.deepEqual(await repository.findById(original.id), { ok: true, value: null });
  assert.deepEqual(await repository.findAll(), { ok: true, value: [] });
  assert.equal(database.prepare('SELECT count(*) AS count FROM reflections').get().count, 0);
  assert.equal((await repository.getCategories()).value.length, 2);
  assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
});

test('records one reflection while preserving the Carry and its reminder metadata', async (t) => {
  const { repository, database } = createRepository(t);
  await repository.getOrCreateCategory({ id: 'work', name: 'Work' });
  await repository.getOrCreateCategory({ id: 'family', name: 'Family' });
  const original = { ...carryFixture(), reminderId: 'notification-1' };
  const other = { ...carryFixture('carry-2'), categoryId: 'family' };
  insertCarry(database, original);
  insertCarry(database, other);
  const reflection = reflectionFixture('reflection-recorded', '2026-10-03T21:00:00.000Z');

  assert.deepEqual(
    await repository.recordReflection(
      original.id,
      reflection,
      () => new Date(original.scheduledAt),
    ),
    { ok: true, value: { ...original, reflection } },
  );
  assert.deepEqual(await repository.findById(original.id), {
    ok: true,
    value: { ...original, reflection },
  });
  assert.deepEqual(await repository.findById(other.id), { ok: true, value: other });
  assert.deepEqual(await repository.getCategories(), {
    ok: true,
    value: [
      { id: 'family', name: 'Family' },
      { id: 'work', name: 'Work' },
    ],
  });
  assert.equal(database.prepare('SELECT count(*) AS count FROM reflections').get().count, 1);
  assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
});

test('rejects premature, duplicate, and missing reflection writes and rolls back failures', async (t) => {
  const { repository, database } = createRepository(t);
  await repository.getOrCreateCategory({ id: 'work', name: 'Work' });
  const upcoming = {
    ...carryFixture('carry-upcoming'),
    scheduledAt: new Date('2026-10-04T21:00:00.000Z'),
  };
  const completed = {
    ...carryFixture('carry-completed'),
    reflection: reflectionFixture('reflection-existing'),
  };
  const rollback = carryFixture('carry-rollback');
  insertCarry(database, upcoming);
  insertCarry(database, completed);
  insertCarry(database, rollback);
  database
    .prepare('INSERT INTO reflections VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      completed.reflection.id,
      completed.id,
      completed.reflection.alignmentRating,
      completed.reflection.whatOccurred,
      completed.reflection.insight,
      completed.reflection.createdAt.toISOString(),
    );

  const validReflection = reflectionFixture('reflection-premature', '2026-10-04T21:00:00.000Z');
  assert.deepEqual(
    await repository.recordReflection(
      upcoming.id,
      validReflection,
      () => new Date('2026-10-04T20:59:59.999Z'),
    ),
    { ok: false, code: 'not_ready' },
  );
  assert.deepEqual(
    await repository.recordReflection(
      completed.id,
      reflectionFixture('reflection-replacement'),
      () => new Date('2026-10-05T00:00:00.000Z'),
    ),
    { ok: false, code: 'already_reflected' },
  );
  assert.deepEqual(
    await repository.recordReflection(
      'missing',
      reflectionFixture('reflection-missing'),
      () => new Date('2026-10-05T00:00:00.000Z'),
    ),
    { ok: true, value: null },
  );

  database.exec(`CREATE TRIGGER fail_reflection BEFORE INSERT ON reflections
    WHEN NEW.carry_id = 'carry-rollback'
    BEGIN SELECT RAISE(ABORT, 'Simulated reflection failure'); END;`);
  assert.deepEqual(
    await repository.recordReflection(
      rollback.id,
      reflectionFixture('reflection-rollback'),
      () => new Date('2026-10-05T00:00:00.000Z'),
    ),
    { ok: false, code: 'unavailable' },
  );
  assert.deepEqual(await repository.findById(upcoming.id), { ok: true, value: upcoming });
  assert.deepEqual(await repository.findById(completed.id), { ok: true, value: completed });
  assert.deepEqual(await repository.findById(rollback.id), { ok: true, value: rollback });
  assert.deepEqual(await repository.findById('missing'), { ok: true, value: null });
  assert.equal(database.prepare('SELECT count(*) AS count FROM reflections').get().count, 1);
  assert.deepEqual(await repository.getCategories(), {
    ok: true,
    value: [{ id: 'work', name: 'Work' }],
  });
});

test('rolls back partial save/delete failures and succeeds after the failure is removed', async (t) => {
  const { repository, database } = createRepository(t);
  await repository.getOrCreateCategory({ id: 'work', name: 'Work' });
  const original = carryFixture();
  await repository.save(original);
  database.exec(`CREATE TRIGGER fail_reflection BEFORE INSERT ON reflections
    BEGIN SELECT RAISE(ABORT, 'Simulated write failure'); END;`);
  const changed = {
    ...original,
    situation: 'Changed',
    reminderId: 'new-reminder',
    reflection: reflectionFixture(),
  };
  assert.deepEqual(await repository.save(changed), { ok: false, code: 'unavailable' });
  assert.deepEqual(await repository.findById(original.id), { ok: true, value: original });
  assert.equal(database.prepare('SELECT count(*) AS count FROM reflections').get().count, 0);
  database.exec('DROP TRIGGER fail_reflection');
  assert.deepEqual(await repository.save(changed), { ok: true, value: changed });
  database.exec(`CREATE TRIGGER fail_delete BEFORE DELETE ON reflections
    BEGIN SELECT RAISE(ABORT, 'Simulated delete failure'); END;`);
  assert.deepEqual(await repository.delete(original.id), { ok: false, code: 'unavailable' });
  assert.deepEqual(await repository.findById(original.id), { ok: true, value: changed });
  database.exec('DROP TRIGGER fail_delete');
  assert.deepEqual(await repository.delete(original.id), { ok: true, value: changed });
  assert.deepEqual(await repository.findById(original.id), { ok: true, value: null });
});
