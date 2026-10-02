const React = require('react');
const { afterEach, it, expect, jest } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../../test-utils/hookTestHelpers');
const { useReferenceLookupViewModel } = require('../useReferenceLookupViewModel');

const { act } = React;
const books = [{ id: 'JHN', name: 'John', order: 43, chapterCount: 21 }];
const target = {
  bookId: 'JHN',
  chapter: 3,
  selection: { startVerseKey: 'JHN.3.16', endVerseKey: 'JHN.3.16' },
};
let renderer;

function passage(verse) {
  return {
    reference: `John 3:${verse}`,
    verses: [{ key: `JHN.3.${verse}`, bookId: 'JHN', chapter: 3, verse, text: `Verse ${verse}.` }],
  };
}

/**
 * Mount lookup logic and return a getter for its latest rendered state.
 */
async function mount(repository) {
  let viewModel;
  function Probe() {
    viewModel = useReferenceLookupViewModel(repository, books);
    return null;
  }
  renderer = await mountProbe(Probe);
  return () => viewModel;
}

afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
});

it('reports invalid input and a read failure, then allows a successful retry', async () => {
  const repository = {
    getPassage: jest
      .fn()
      .mockResolvedValueOnce({ ok: false, code: 'unavailable' })
      .mockResolvedValue({ ok: true, value: passage(16) }),
  };
  const current = await mount(repository);
  await act(async () => {
    expect(await current().lookup()).toBeNull();
  });
  expect(current().error).toContain('full book name');
  expect(repository.getPassage).not.toHaveBeenCalled();
  await act(async () => {
    current().changeQuery('John 3:16');
  });
  await act(async () => {
    expect(await current().lookup()).toBeNull();
  });
  expect(current().error).toContain('try again');
  await act(async () => {
    expect(await current().lookup()).toEqual(target);
  });
  expect(current().error).toBeNull();
  expect(current().isLoading).toBe(false);
});

it.each(['books', 'repository'])(
  'cancels a pending lookup when %s changes and allows retry',
  async (dependency) => {
    let resolveOldRead;
    const oldRead = new Promise((resolve) => {
      resolveOldRead = resolve;
    });
    const repository = {
      getPassage: jest
        .fn()
        .mockReturnValueOnce(oldRead)
        .mockResolvedValue({ ok: true, value: passage(16) }),
    };
    const replacementRepository = {
      getPassage: jest.fn().mockResolvedValue({ ok: true, value: passage(16) }),
    };
    let viewModel;
    function Probe({ reader = repository, catalogue = books }) {
      viewModel = useReferenceLookupViewModel(reader, catalogue);
      return null;
    }
    renderer = await mountProbe(Probe);
    await act(async () => {
      viewModel.changeQuery('John 3:16');
    });
    let oldRequest;
    await act(async () => {
      oldRequest = viewModel.lookup();
    });
    expect(viewModel.isLoading).toBe(true);
    await act(async () => {
      renderer.update(React.createElement(Probe));
    });
    expect(viewModel.isLoading).toBe(true);
    await act(async () => {
      renderer.update(
        React.createElement(Probe, {
          reader: dependency === 'repository' ? replacementRepository : repository,
          catalogue: dependency === 'books' ? [...books] : books,
        }),
      );
    });
    expect(viewModel.query).toBe('John 3:16');
    expect(viewModel.isLoading).toBe(false);
    await act(async () => {
      expect(await viewModel.lookup()).toEqual(target);
      resolveOldRead({ ok: true, value: passage(16) });
      expect(await oldRequest).toBeNull();
    });
    expect(viewModel.isLoading).toBe(false);
    expect(viewModel.error).toBeNull();
  },
);

it('ignores duplicate submits and results after editing, cancellation, or unmount', async () => {
  let resolveRead;
  const pending = new Promise((resolve) => {
    resolveRead = resolve;
  });
  const repository = { getPassage: jest.fn().mockReturnValue(pending) };
  const current = await mount(repository);
  await act(async () => {
    current().changeQuery('John 3:16');
  });
  let first;
  await act(async () => {
    first = current().lookup();
    expect(await current().lookup()).toBeNull();
  });
  expect(repository.getPassage).toHaveBeenCalledTimes(1);
  await act(async () => {
    current().changeQuery('John 3:17');
  });
  await act(async () => {
    resolveRead({ ok: true, value: passage(16) });
    expect(await first).toBeNull();
  });
  expect(current().query).toBe('John 3:17');
  expect(current().isLoading).toBe(false);

  let resolveCancelled;
  repository.getPassage.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveCancelled = resolve;
    }),
  );
  let cancelledRequest;
  await act(async () => {
    cancelledRequest = current().lookup();
  });
  expect(current().isLoading).toBe(true);
  await act(async () => {
    current().cancelLookup();
  });
  expect(current().query).toBe('John 3:17');
  expect(current().isLoading).toBe(false);
  expect(current().error).toBeNull();
  resolveCancelled({ ok: true, value: passage(17) });
  expect(await cancelledRequest).toBeNull();

  let resolveUnmounted;
  repository.getPassage.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveUnmounted = resolve;
    }),
  );
  let unmountedRequest;
  await act(async () => {
    unmountedRequest = current().lookup();
  });
  await unmountProbe(renderer);
  renderer = undefined;
  resolveUnmounted({ ok: true, value: passage(17) });
  expect(await unmountedRequest).toBeNull();
});
