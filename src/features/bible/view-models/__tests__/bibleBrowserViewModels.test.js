const React = require('react');
const { afterEach, describe, it, jest, expect } = require('@jest/globals');
const { create } = require('react-test-renderer');

const { useBibleBrowserViewModel } = require('../useBibleBrowserViewModel');
const { useBibleChapterViewModel } = require('../useBibleChapterViewModel');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { act } = React;

let renderer;

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function mount(Probe) {
  await act(async () => {
    renderer = create(React.createElement(Probe));
    await flushMicrotasks();
  });
}

afterEach(async () => {
  if (renderer !== undefined) {
    await act(async () => {
      renderer.unmount();
    });
    renderer = undefined;
  }
});

describe('Bible browser view models', () => {
  it('retries a failed book read with the repository it already opened', async () => {
    const books = [{ id: 'JAS', name: 'James', order: 1, chapterCount: 5 }];
    const repository = {
      getBooks: jest
        .fn()
        .mockResolvedValueOnce({ ok: false, code: 'unavailable' })
        .mockResolvedValueOnce({ ok: true, value: books }),
    };
    const loadBible = jest.fn().mockResolvedValue({ ok: true, value: repository });
    let viewModel;

    function Probe() {
      viewModel = useBibleBrowserViewModel(loadBible);
      return null;
    }

    await mount(Probe);

    expect(viewModel.state).toEqual({ status: 'error' });

    await act(async () => {
      viewModel.retry();
      await flushMicrotasks();
    });

    expect(viewModel.state).toEqual({
      status: 'ready',
      data: { repository, books },
    });
    expect(loadBible).toHaveBeenCalledTimes(1);
    expect(repository.getBooks).toHaveBeenCalledTimes(2);
  });

  it('retries a chapter read after a controlled failure', async () => {
    const verses = [{ key: 'JAS.1.1', bookId: 'JAS', chapter: 1, verse: 1, text: 'James.' }];
    const repository = {
      getChapter: jest
        .fn()
        .mockResolvedValueOnce({ ok: false, code: 'unavailable' })
        .mockResolvedValueOnce({ ok: true, value: verses }),
    };
    let viewModel;

    function Probe() {
      viewModel = useBibleChapterViewModel(repository, 'JAS', 1);
      return null;
    }

    await mount(Probe);

    expect(viewModel.state).toEqual({ status: 'error' });

    await act(async () => {
      viewModel.retry();
      await flushMicrotasks();
    });

    expect(viewModel.state).toEqual({ status: 'ready', data: verses });
    expect(repository.getChapter).toHaveBeenCalledTimes(2);
  });

  it('keeps a newer chapter when an older chapter request resolves late', async () => {
    let resolveFirstChapter;
    const firstChapter = new Promise((resolve) => {
      resolveFirstChapter = resolve;
    });
    const secondChapterVerses = [
      { key: 'JAS.2.1', bookId: 'JAS', chapter: 2, verse: 1, text: 'Faith.' },
    ];
    const repository = {
      getChapter: jest.fn((_bookId, chapter) =>
        chapter === 1 ? firstChapter : Promise.resolve({ ok: true, value: secondChapterVerses }),
      ),
    };
    let chapter = 1;
    let viewModel;

    function Probe() {
      viewModel = useBibleChapterViewModel(repository, 'JAS', chapter);
      return null;
    }

    await mount(Probe);
    expect(viewModel.state).toEqual({ status: 'loading' });

    chapter = 2;
    await act(async () => {
      renderer.update(React.createElement(Probe));
      await flushMicrotasks();
    });

    expect(viewModel.state).toEqual({ status: 'ready', data: secondChapterVerses });

    await act(async () => {
      resolveFirstChapter({
        ok: true,
        value: [{ key: 'JAS.1.1', bookId: 'JAS', chapter: 1, verse: 1, text: 'Old.' }],
      });
      await firstChapter;
      await flushMicrotasks();
    });

    expect(viewModel.state).toEqual({ status: 'ready', data: secondChapterVerses });
    expect(repository.getChapter).toHaveBeenNthCalledWith(1, 'JAS', 1);
    expect(repository.getChapter).toHaveBeenNthCalledWith(2, 'JAS', 2);
  });

  it('rejects empty book and chapter results', async () => {
    const emptyBookRepository = {
      getBooks: jest.fn().mockResolvedValue({ ok: true, value: [] }),
    };
    const loadEmptyBible = jest.fn().mockResolvedValue({
      ok: true,
      value: emptyBookRepository,
    });
    let viewModel;

    function BrowserProbe() {
      viewModel = useBibleBrowserViewModel(loadEmptyBible);
      return null;
    }

    await mount(BrowserProbe);
    expect(viewModel.state).toEqual({ status: 'error' });

    await act(async () => {
      renderer.unmount();
    });
    renderer = undefined;

    const emptyChapterRepository = {
      getChapter: jest.fn().mockResolvedValue({ ok: true, value: [] }),
    };

    function ChapterProbe() {
      viewModel = useBibleChapterViewModel(emptyChapterRepository, 'JAS', 1);
      return null;
    }

    await mount(ChapterProbe);
    expect(viewModel.state).toEqual({ status: 'error' });
  });
});
