// Run the TypeScript repository against the actual SQLite asset, using Node 24.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(root, 'src/infrastructure/repositories/SQLiteBibleRepository.ts'),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const repositoryModule = { exports: {} };
new Function('exports', 'require', 'module', compiled.outputText)(
  repositoryModule.exports,
  require,
  repositoryModule,
);
const { SQLiteBibleRepository } = repositoryModule.exports;

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

    // Exercise the complete catalogue, not only the preview passage.
    let verseCount = 0;
    for (const book of books.value) {
      for (let chapter = 1; chapter <= book.chapterCount; chapter++) {
        const result = await repository.getChapter(book.id, chapter);
        assert.equal(result.ok, true, `${book.id} ${chapter}`);
        verseCount += result.value.length;
      }
    }
    assert.equal(verseCount, 31103);

    for (const [startVerseKey, endVerseKey, reference] of [
      ['GEN.1.1', 'GEN.1.1', 'Genesis 1:1'],
      ['JAS.1.19', 'JAS.1.20', 'James 1:19–20'],
      ['JAS.1.27', 'JAS.2.1', 'James 1:27–2:1'],
      ['MAL.4.6', 'MAT.1.1', 'Malachi 4:6–Matthew 1:1'],
      ['REV.22.21', 'REV.22.21', 'Revelation 22:21'],
    ]) {
      const result = await repository.getPassage({ startVerseKey, endVerseKey });
      assert.equal(result.ok, true);
      assert.equal(result.value.reference, reference);
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
    assert.equal(blank.value.verses[0].text, '');
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
