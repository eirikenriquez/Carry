// Run the TypeScript repository against the actual SQLite asset, using Node 24.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
/**
 * Load local TypeScript for integration checks without creating build output.
 */
function loadTypeScript(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} };
  new Function('exports', 'require', 'module', compiled.outputText)(
    loaded.exports,
    require,
    loaded,
  );
  return loaded.exports;
}

const { SQLiteBibleRepository } = loadTypeScript('src/repositories/SQLiteBibleRepository.ts');
const { resolveBibleReference } = loadTypeScript('src/services/resolveBibleReference.ts');

/**
 * Adapt Node's SQLite connection to the repository's asynchronous database contract.
 */
function connect(database) {
  return new SQLiteBibleRepository({
    async getAllAsync(sql, ...params) {
      return database.prepare(sql).all(...params);
    },
    async getFirstAsync(sql, ...params) {
      return database.prepare(sql).get(...params) ?? null;
    },
  });
}

/**
 * Check catalogue, chapters, passage resolution, and failures against real SQLite.
 */
async function verifyRepository() {
  const database = new DatabaseSync(path.join(root, 'assets/bible/web-2026-09-28.db'), {
    readOnly: true,
  });
  try {
    const repository = connect(database);
    const books = await repository.getBooks();
    assert.equal(books.ok, true);
    assert.equal(books.value.length, 66);
    assert.equal(books.value[0].name, 'Genesis');
    assert.equal(books.value[65].name, 'Revelation');
    assert.deepEqual(
      books.value.map((book) => book.order),
      Array.from({ length: 66 }, (_, i) => i + 1),
    );
    assert.deepEqual(
      books.value.find((book) => book.id === 'JAS'),
      {
        id: 'JAS',
        name: 'James',
        order: 59,
        chapterCount: 5,
      },
    );

    const verseColumns = 'key, book_id AS bookId, chapter, verse, text';
    const verseByKey = database.prepare(`SELECT ${verseColumns} FROM verses WHERE key = ?`);
    const chapterVerses = database.prepare(
      `SELECT ${verseColumns} FROM verses WHERE book_id = ? AND chapter = ? ORDER BY verse`,
    );

    // Exercise the complete catalogue, not only the preview passage.
    let verseCount = 0;
    for (const book of books.value) {
      for (let chapter = 1; chapter <= book.chapterCount; chapter++) {
        const result = await repository.getChapter(book.id, chapter);
        assert.equal(result.ok, true, `${book.id} ${chapter}`);
        assert.deepEqual(
          result.value,
          chapterVerses.all(book.id, chapter).map((row) => ({ ...row })),
        );
        verseCount += result.value.length;
      }
    }
    assert.equal(verseCount, 31103);

    for (const [input, bookId, chapter, start, end] of [
      ['John 3:16', 'JHN', 3, 16, 16],
      [' James 1:19–20 ', 'JAS', 1, 19, 20],
      ['1 john 3:16', '1JN', 3, 16, 16],
      ['Luke 17:36', 'LUK', 17, 36, 36],
    ]) {
      assert.deepEqual(await resolveBibleReference(input, books.value, repository), {
        ok: true,
        value: {
          bookId,
          chapter,
          selection: {
            startVerseKey: `${bookId}.${chapter}.${start}`,
            endVerseKey: `${bookId}.${chapter}.${end}`,
          },
        },
      });
    }
    assert.deepEqual(await resolveBibleReference('John 3:999', books.value, repository), {
      ok: false,
      code: 'invalid_selection',
    });

    for (const [startVerseKey, endVerseKey, reference, expectedKeys] of [
      ['GEN.1.1', 'GEN.1.1', 'Genesis 1:1', ['GEN.1.1']],
      ['JAS.1.19', 'JAS.1.20', 'James 1:19–20', ['JAS.1.19', 'JAS.1.20']],
      ['JAS.1.27', 'JAS.2.1', 'James 1:27–2:1', ['JAS.1.27', 'JAS.2.1']],
      ['MAL.4.6', 'MAT.1.1', 'Malachi 4:6–Matthew 1:1', ['MAL.4.6', 'MAT.1.1']],
      ['REV.22.21', 'REV.22.21', 'Revelation 22:21', ['REV.22.21']],
    ]) {
      const result = await repository.getPassage({ startVerseKey, endVerseKey });
      assert.equal(result.ok, true);
      assert.equal(result.value.reference, reference);
      assert.deepEqual(
        result.value.verses,
        expectedKeys.map((key) => ({ ...verseByKey.get(key) })),
      );
    }
    assert.deepEqual(await repository.getChapter('GEN', 51), {
      ok: false,
      code: 'invalid_selection',
    });
    assert.deepEqual(
      await repository.getPassage({
        startVerseKey: 'JAS.1.20',
        endVerseKey: 'JAS.1.19',
      }),
      { ok: false, code: 'invalid_selection' },
    );
    assert.deepEqual(
      await repository.getPassage({
        startVerseKey: 'JAS.99.1',
        endVerseKey: 'JAS.99.1',
      }),
      { ok: false, code: 'invalid_selection' },
    );
    const blank = await repository.getPassage({
      startVerseKey: 'LUK.17.36',
      endVerseKey: 'LUK.17.36',
    });
    assert.equal(blank.ok, true);
    assert.deepEqual(blank.value, {
      reference: 'Luke 17:36',
      verses: [{ key: 'LUK.17.36', bookId: 'LUK', chapter: 17, verse: 36, text: '' }],
    });
  } finally {
    database.close();
  }

  const missingSchema = new DatabaseSync(':memory:');
  try {
    assert.deepEqual(await connect(missingSchema).getBooks(), {
      ok: false,
      code: 'unavailable',
    });
  } finally {
    missingSchema.close();
  }
  console.log('SQLite repository integration passed: 66 books, all 1189 chapters, 31103 verses.');
}

verifyRepository().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
