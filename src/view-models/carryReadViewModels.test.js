const React = require('react');
const { afterEach, describe, it, jest, expect } = require('@jest/globals');
const { AppState } = require('react-native');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');
const { groupCarryListItems, useCarryListViewModel } = require('./useCarryListViewModel');
const { useCarryDetailViewModel } = require('./useCarryDetailViewModel');

const { act } = React;
const category = { id: 'work', name: 'Work' };
const categories = [category];
const ok = (value) => ({ ok: true, value });
const unavailable = { ok: false, code: 'unavailable' };
const passage = {
  reference: 'James 1:19',
  verses: [{ key: 'JAS.1.19', bookId: 'JAS', chapter: 1, verse: 19, text: 'Be quick to hear.' }],
};
const carry = (id = 'carry-1', situation = 'Before a hard conversation') => ({
  id,
  categoryId: category.id,
  situation,
  scheduledAt: new Date('2026-10-03T01:00:00.000Z'),
  passage: { startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.19' },
  ifThenIntention: 'If I feel tense, then I will listen first.',
  createdAt: new Date('2026-10-02T01:00:00.000Z'),
});
const reflection = {
  id: 'reflection-1',
  alignmentRating: 4,
  whatOccurred: 'I listened before answering.',
  insight: 'Pause first.',
  createdAt: new Date('2026-10-06T10:06:00.000Z'),
};

let renderer;

afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
});

describe('Carry read view models', () => {
  it('groups each Carry once, preserving order and handling empty groups', () => {
    const now = new Date('2026-10-03T01:00:00.000Z');
    const items = [
      {
        carry: { ...carry('upcoming-1'), scheduledAt: new Date('2026-10-04T01:00:00.000Z') },
        categoryName: 'Work',
      },
      { carry: carry('ready-1'), categoryName: 'Work' },
      {
        carry: { ...carry('completed-1'), reflection },
        categoryName: 'Work',
      },
      {
        carry: { ...carry('upcoming-2'), scheduledAt: new Date('2026-10-05T01:00:00.000Z') },
        categoryName: 'Work',
      },
    ];

    expect(groupCarryListItems(items, now)).toEqual([
      { key: 'upcoming', data: [items[0], items[3]] },
      { key: 'readyToReflect', data: [items[1]] },
      { key: 'completed', data: [items[2]] },
    ]);
    expect(groupCarryListItems([], now)).toEqual([
      { key: 'upcoming', data: [] },
      { key: 'readyToReflect', data: [] },
      { key: 'completed', data: [] },
    ]);
  });

  it('loads canonical category names and retries a controlled list failure', async () => {
    const savedCarries = [carry(), { ...carry('carry-2'), categoryId: 'missing' }];
    const repository = {
      findAll: jest.fn().mockResolvedValue(ok(savedCarries)),
      getCategories: jest.fn().mockResolvedValueOnce(unavailable).mockResolvedValue(ok(categories)),
    };
    let viewModel;
    function Probe() {
      viewModel = useCarryListViewModel(repository, true);
      return null;
    }

    renderer = await mountProbe(Probe);
    expect(viewModel.state).toEqual({ status: 'error' });

    await act(async () => viewModel.retry());

    expect(viewModel.state).toEqual({
      status: 'ready',
      data: [
        { carry: savedCarries[0], categoryName: 'Work' },
        { carry: savedCarries[1], categoryName: 'Unknown category' },
      ],
    });
    expect(repository.getCategories).toHaveBeenCalledTimes(2);
  });

  it('regroups on resume and reloads changed records when the list regains focus', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-06T10:00:00.000Z'));
    const upcoming = { ...carry('upcoming'), scheduledAt: new Date('2026-10-06T10:05:00.000Z') };
    const ready = { ...carry('ready'), scheduledAt: new Date('2026-10-06T09:00:00.000Z') };
    const deleted = { ...ready, id: 'deleted' };
    let savedCarries = [ready, deleted, upcoming];
    const repository = {
      findAll: jest.fn().mockImplementation(async () => ok(savedCarries)),
      getCategories: jest.fn().mockResolvedValue(ok(categories)),
    };
    let resume;
    const listenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        resume = listener;
        return { remove: jest.fn() };
      });
    let focused = true;
    let viewModel;
    function Probe() {
      viewModel = useCarryListViewModel(repository, focused);
      return null;
    }
    const groupedIds = () =>
      viewModel.sections.map((section) => section.data.map((item) => item.carry.id));

    try {
      renderer = await mountProbe(Probe);
      expect(groupedIds()).toEqual([['upcoming'], ['ready', 'deleted'], []]);

      jest.setSystemTime(new Date('2026-10-06T10:06:00.000Z'));
      await act(async () => resume('active'));
      expect(groupedIds()).toEqual([[], ['ready', 'deleted', 'upcoming'], []]);
      expect(repository.findAll).toHaveBeenCalledTimes(1);

      focused = false;
      await act(async () => renderer.update(React.createElement(Probe)));
      // Stand in for changes saved while the list is covered by another screen.
      savedCarries = [
        { ...ready, reflection },
        { ...upcoming, scheduledAt: new Date('2026-10-06T11:00:00.000Z') },
        { ...carry('created'), scheduledAt: new Date('2026-10-06T12:00:00.000Z') },
      ];
      focused = true;
      await act(async () => renderer.update(React.createElement(Probe)));
      expect(groupedIds()).toEqual([['upcoming', 'created'], [], ['ready']]);
      expect(repository.findAll).toHaveBeenCalledTimes(2);
    } finally {
      await unmountProbe(renderer);
      renderer = undefined;
      listenerSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('retries detail failures, resolves stored Scripture, and ignores late id, focus, and unmount reads', async () => {
    let resolveOldIdRead;
    let resolveOldFocusRead;
    let resolveUnmountedRead;
    const oldIdRead = new Promise((resolve) => {
      resolveOldIdRead = resolve;
    });
    const oldFocusRead = new Promise((resolve) => {
      resolveOldFocusRead = resolve;
    });
    const unmountedRead = new Promise((resolve) => {
      resolveUnmountedRead = resolve;
    });
    let idTwoCalls = 0;
    let idFourCalls = 0;
    const repository = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(unavailable)
        .mockResolvedValueOnce(ok(null))
        .mockResolvedValueOnce(ok(carry()))
        .mockResolvedValueOnce(ok(carry())),
      getCategories: jest.fn().mockResolvedValue(ok(categories)),
    };
    repository.findById.mockImplementation((id) => {
      if (id === 'carry-2') return ++idTwoCalls === 1 ? oldIdRead : Promise.resolve(ok(carry(id)));
      if (id === 'carry-3') return Promise.resolve(ok(carry(id)));
      if (id === 'carry-4')
        return ++idFourCalls === 1 ? oldFocusRead : Promise.resolve(ok(carry(id)));
      if (id === 'carry-5') return unmountedRead;
      return Promise.resolve(ok(carry(id)));
    });
    const bibleRepository = {
      getPassage: jest.fn().mockResolvedValueOnce(unavailable).mockResolvedValue(ok(passage)),
    };
    const notifications = { cancel: jest.fn() };
    let carryId = 'carry-1';
    let focused = true;
    let viewModel;
    function Probe() {
      viewModel = useCarryDetailViewModel(
        repository,
        bibleRepository,
        notifications,
        carryId,
        focused,
      );
      return null;
    }
    async function rerender() {
      await act(async () => renderer.update(React.createElement(Probe)));
    }

    renderer = await mountProbe(Probe);
    expect(viewModel.state).toEqual({ status: 'error' });
    await act(async () => viewModel.retry());
    expect(viewModel.state).toEqual({ status: 'error' });
    await act(async () => viewModel.retry());
    expect(viewModel.state).toEqual({ status: 'error' });
    await act(async () => viewModel.retry());
    expect(viewModel.state).toEqual({
      status: 'ready',
      data: { carry: carry(), categoryName: 'Work', passage },
    });
    expect(bibleRepository.getPassage).toHaveBeenCalledWith(carry().passage);

    carryId = 'carry-2';
    await rerender();
    carryId = 'carry-3';
    await rerender();
    await act(async () => resolveOldIdRead(ok(carry('carry-2', 'Stale record'))));
    expect(viewModel.state.data.carry).toEqual(carry('carry-3'));

    carryId = 'carry-4';
    await rerender();
    focused = false;
    await rerender();
    focused = true;
    await rerender();
    await act(async () => resolveOldFocusRead(ok(carry('carry-4', 'Stale focus read'))));
    expect(viewModel.state.data.carry).toEqual(carry('carry-4'));

    carryId = 'carry-5';
    await rerender();
    const passageCalls = bibleRepository.getPassage.mock.calls.length;
    await unmountProbe(renderer);
    renderer = undefined;
    await act(async () => resolveUnmountedRead(ok(carry('carry-5'))));
    expect(bibleRepository.getPassage).toHaveBeenCalledTimes(passageCalls);
  });
});
