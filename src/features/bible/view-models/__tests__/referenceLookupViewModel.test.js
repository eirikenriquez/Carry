const React = require('react');
const { afterEach, it, expect, jest } = require('@jest/globals');
const { create } = require('react-test-renderer');
const { useReferenceLookupViewModel } = require('../useReferenceLookupViewModel');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
  await act(async () => {
    renderer = create(React.createElement(Probe));
  });
  return () => viewModel;
}

afterEach(async () => {
  await act(async () => {
    renderer?.unmount();
  });
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

it('ignores duplicate submits and results arriving after input changes or unmount', async () => {
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
  await act(async () => {
    renderer.unmount();
  });
  resolveUnmounted({ ok: true, value: passage(17) });
  expect(await unmountedRequest).toBeNull();
});
