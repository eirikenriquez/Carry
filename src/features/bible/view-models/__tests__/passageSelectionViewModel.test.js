const React = require('react');
const { afterEach, describe, it, jest, expect } = require('@jest/globals');
const { create } = require('react-test-renderer');

const { usePassageSelectionViewModel } = require('../usePassageSelectionViewModel');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { act } = React;

let renderer;

function verse(chapter, number, text = `Verse ${number}.`) {
  return {
    key: `JAS.${chapter}.${number}`,
    bookId: 'JAS',
    chapter,
    verse: number,
    text,
  };
}

function passage(start = 1, end = start, chapter = 1) {
  const reference = `James ${chapter}:${start}${start === end ? '' : `–${end}`}`;
  const verses = Array.from({ length: end - start + 1 }, (_, index) =>
    verse(chapter, start + index),
  );
  return { reference, verses };
}

/**
 * Build a mock passage whose reference and verses match the requested keys.
 */
function passageForSelection(selection) {
  const [, chapter, start] = selection.startVerseKey.split('.');
  const end = selection.endVerseKey.split('.')[2];
  return passage(Number(start), Number(end), Number(chapter));
}

/**
 * Yield to pending promise callbacks before checking hook state.
 */
async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * Mount a hook probe and flush its initial asynchronous updates inside act.
 */
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

describe('passage selection view model', () => {
  it('selects a single verse, orders a reversed range, and starts over after completion', async () => {
    const previewData = passage(2, 10);
    const repository = {
      getPassage: jest.fn(async (selection) => ({
        ok: true,
        value: passageForSelection(selection),
      })),
    };
    let viewModel;

    function Probe() {
      viewModel = usePassageSelectionViewModel(repository, 'JAS', 1, {
        startVerseKey: 'JAS.1.2',
        endVerseKey: 'JAS.1.10',
      });
      return null;
    }

    await mount(Probe);

    expect(viewModel.selection).toEqual({ startVerseKey: 'JAS.1.2', endVerseKey: 'JAS.1.10' });
    expect(viewModel.preview).toEqual({ status: 'ready', data: previewData });

    await act(async () => {
      viewModel.selectVerse(verse(1, 10));
      await flushMicrotasks();
    });
    expect(viewModel.selection).toEqual({ startVerseKey: 'JAS.1.10', endVerseKey: 'JAS.1.10' });
    expect(viewModel.preview).toEqual({ status: 'ready', data: passage(10) });

    await act(async () => {
      viewModel.selectVerse(verse(1, 2));
      await flushMicrotasks();
    });
    expect(viewModel.selection).toEqual({ startVerseKey: 'JAS.1.2', endVerseKey: 'JAS.1.10' });
    expect(viewModel.preview).toEqual({ status: 'ready', data: passage(2, 10) });
    expect(repository.getPassage).toHaveBeenLastCalledWith({
      startVerseKey: 'JAS.1.2',
      endVerseKey: 'JAS.1.10',
    });

    await act(async () => {
      viewModel.selectVerse(verse(1, 3));
      await flushMicrotasks();
    });
    expect(viewModel.selection).toEqual({ startVerseKey: 'JAS.1.3', endVerseKey: 'JAS.1.3' });

    await act(async () => {
      viewModel.selectVerse(verse(1, 3));
      await flushMicrotasks();
    });
    await act(async () => {
      viewModel.selectVerse(verse(1, 4));
      await flushMicrotasks();
    });
    expect(viewModel.selection).toEqual({ startVerseKey: 'JAS.1.4', endVerseKey: 'JAS.1.4' });
    expect(viewModel.preview).toEqual({ status: 'ready', data: passage(4) });
  });

  it('clears selection and hides it when the chapter changes', async () => {
    const previewData = passage();
    const repository = {
      getPassage: jest.fn(async (selection) => ({
        ok: true,
        value: passageForSelection(selection),
      })),
    };
    let chapter = 1;
    let viewModel;

    function Probe() {
      viewModel = usePassageSelectionViewModel(repository, 'JAS', chapter);
      return null;
    }

    await mount(Probe);
    await act(async () => {
      viewModel.selectVerse(verse(1, 1));
      await flushMicrotasks();
    });
    expect(viewModel.preview).toEqual({ status: 'ready', data: previewData });

    await act(async () => {
      viewModel.clearSelection();
      await flushMicrotasks();
    });
    expect(viewModel.selection).toBeNull();
    expect(viewModel.preview).toBeNull();

    await act(async () => {
      viewModel.selectVerse(verse(2, 1));
      await flushMicrotasks();
    });
    expect(viewModel.selection).toBeNull();

    await act(async () => {
      viewModel.selectVerse(verse(1, 2));
      await flushMicrotasks();
    });
    expect(viewModel.selection).toEqual({ startVerseKey: 'JAS.1.2', endVerseKey: 'JAS.1.2' });

    chapter = 2;
    await act(async () => {
      renderer.update(React.createElement(Probe));
      await flushMicrotasks();
    });
    expect(viewModel.selection).toBeNull();
    expect(viewModel.preview).toBeNull();

    await act(async () => {
      viewModel.selectVerse(verse(2, 1));
      await flushMicrotasks();
    });
    expect(viewModel.selection).toEqual({ startVerseKey: 'JAS.2.1', endVerseKey: 'JAS.2.1' });
    expect(viewModel.preview).toEqual({ status: 'ready', data: passage(1, 1, 2) });

    chapter = 1;
    await act(async () => {
      renderer.update(React.createElement(Probe));
      await flushMicrotasks();
    });
    expect(viewModel.selection).toBeNull();
    expect(viewModel.preview).toBeNull();
  });

  it('retries an unavailable preview and preserves empty verse text', async () => {
    const previewData = passage();
    previewData.verses[0].text = '';
    const repository = {
      getPassage: jest
        .fn()
        .mockResolvedValueOnce({ ok: false, code: 'unavailable' })
        .mockResolvedValueOnce({ ok: true, value: previewData }),
    };
    let viewModel;

    function Probe() {
      viewModel = usePassageSelectionViewModel(repository, 'JAS', 1);
      return null;
    }

    await mount(Probe);
    await act(async () => {
      viewModel.selectVerse(verse(1, 1));
      await flushMicrotasks();
    });
    expect(viewModel.preview).toEqual({ status: 'error' });

    await act(async () => {
      viewModel.retryPreview();
      await flushMicrotasks();
    });
    expect(viewModel.preview).toEqual({ status: 'ready', data: previewData });
    expect(repository.getPassage).toHaveBeenCalledTimes(2);
  });

  it('does not let an earlier request replace a newer selection after clear', async () => {
    let resolveFirstPreview;
    const firstPreview = new Promise((resolve) => {
      resolveFirstPreview = resolve;
    });
    const currentPreview = passage(2);
    const repository = {
      getPassage: jest.fn((selection) =>
        selection.startVerseKey === 'JAS.1.1'
          ? firstPreview
          : Promise.resolve({ ok: true, value: currentPreview }),
      ),
    };
    let viewModel;

    function Probe() {
      viewModel = usePassageSelectionViewModel(repository, 'JAS', 1);
      return null;
    }

    await mount(Probe);
    await act(async () => {
      viewModel.selectVerse(verse(1, 1));
      await flushMicrotasks();
    });
    expect(viewModel.preview).toEqual({ status: 'loading' });

    await act(async () => {
      viewModel.clearSelection();
      await flushMicrotasks();
    });
    expect(viewModel.selection).toBeNull();
    expect(viewModel.preview).toBeNull();

    await act(async () => {
      viewModel.selectVerse(verse(1, 2));
      await flushMicrotasks();
    });
    expect(viewModel.preview).toEqual({ status: 'ready', data: currentPreview });

    await act(async () => {
      resolveFirstPreview({ ok: true, value: passage() });
      await firstPreview;
      await flushMicrotasks();
    });
    expect(viewModel.selection).toEqual({ startVerseKey: 'JAS.1.2', endVerseKey: 'JAS.1.2' });
    expect(viewModel.preview).toEqual({ status: 'ready', data: currentPreview });
  });
});
