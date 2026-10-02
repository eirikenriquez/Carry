const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { test } = require('node:test');
const ts = require('typescript');

const {
  personalDatabaseSchema,
} = require('../src/infrastructure/repositories/personalDatabaseSchema.ts');
const openerPath = path.join(
  __dirname,
  '../src/infrastructure/repositories/openPersonalDatabase.ts',
);

/**
 * Run the actual opener using a real SQLite connection in place of Expo's native bridge.
 */
function loadOpener(openConnection) {
  const compiled = ts.transpileModule(fs.readFileSync(openerPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} };
  function requireDependency(name) {
    if (name === 'expo-sqlite') return { openDatabaseAsync: openConnection };
    if (name === './personalDatabaseSchema') {
      return require('../src/infrastructure/repositories/personalDatabaseSchema.ts');
    }
    throw new Error(`Unexpected opener dependency: ${name}`);
  }
  new Function('exports', 'require', 'module', compiled.outputText)(
    loaded.exports,
    requireDependency,
    loaded,
  );
  return loaded.exports.openPersonalDatabase;
}

/**
 * Adapt Node SQLite to the small Expo API surface used by database initialization.
 */
function connect(database) {
  return {
    async execAsync(sql) {
      database.exec(sql);
    },
    async getFirstAsync(sql) {
      return database.prepare(sql).get() ?? null;
    },
    async getAllAsync(sql) {
      return database.prepare(sql).all();
    },
    async closeAsync() {
      database.close();
    },
  };
}

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

test('rejects unknown or damaged schemas without replacing existing data', async () => {
  for (const setup of [
    'CREATE TABLE existing (value TEXT); PRAGMA user_version = 0;',
    'CREATE TABLE existing (value TEXT); PRAGMA user_version = 2;',
    'CREATE TABLE existing (value TEXT); PRAGMA user_version = 1;',
  ]) {
    const database = new DatabaseSync(':memory:');
    try {
      database.exec(`${setup} INSERT INTO existing VALUES ('keep me');`);
      const connection = connect(database);
      let closed = false;
      connection.closeAsync = async () => {
        closed = true;
      };
      assert.deepEqual(await loadOpener(async () => connection)(), {
        ok: false,
        code: 'unavailable',
      });
      assert.equal(closed, true);
      assert.equal(database.prepare('SELECT value FROM existing').get().value, 'keep me');
      assert.equal(
        database.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table'").get()
          .count,
        1,
      );
    } finally {
      database.close();
    }
  }
});

test('rolls back a failed initialization and allows a later retry', async () => {
  const database = new DatabaseSync(':memory:');
  try {
    const connection = connect(database);
    const exec = connection.execAsync;
    let closed = false;
    connection.closeAsync = async () => {
      closed = true;
    };
    connection.execAsync = async (sql) => {
      await exec(sql);
      if (sql === personalDatabaseSchema) throw new Error('Simulated initialization failure');
    };
    assert.deepEqual(await loadOpener(async () => connection)(), {
      ok: false,
      code: 'unavailable',
    });
    assert.equal(closed, true);
    assert.equal(database.prepare('PRAGMA user_version').get().user_version, 0);
    assert.equal(
      database.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table'").get()
        .count,
      0,
    );

    connection.execAsync = exec;
    assert.equal((await loadOpener(async () => connection)()).ok, true);
  } finally {
    database.close();
  }
});

test('returns a controlled failure if opening or enabling foreign keys fails', async () => {
  assert.deepEqual(
    await loadOpener(async () => {
      throw new Error('Storage unavailable');
    })(),
    {
      ok: false,
      code: 'unavailable',
    },
  );
  let closed = false;
  let began = false;
  const connection = {
    async execAsync(sql) {
      if (sql === 'BEGIN IMMEDIATE') began = true;
    },
    async getFirstAsync() {
      return { foreign_keys: 0 };
    },
    async closeAsync() {
      closed = true;
    },
  };
  assert.deepEqual(await loadOpener(async () => connection)(), {
    ok: false,
    code: 'unavailable',
  });
  assert.equal(closed, true);
  assert.equal(began, false);
});
