const React = require('react');
const { afterEach, beforeEach, describe, it, jest, expect } = require('@jest/globals');
const { AppState, Text } = require('react-native');
const { getCarryStatus } = require('../models/getCarryStatus');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');
const { useCarryStatusClock } = require('./useCarryStatusClock');

let renderer;
let focused;
let loadState;
let probeCarries;
let listeners;
let appStateSpy;

const carry = (scheduledAt, reflection) => ({
  scheduledAt: new Date(scheduledAt),
  reflection,
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-04T12:00:00.000Z'));
  loadState = { status: 'loading' };
  probeCarries = [];
  listeners = new Set();
  appStateSpy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  });
});

afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
  appStateSpy.mockRestore();
  jest.useRealTimers();
});

function Probe() {
  const now = useCarryStatusClock(focused, loadState);
  const statuses = probeCarries.map((item) => getCarryStatus(item, now));
  return React.createElement(Text, null, `${now.toISOString()}|${statuses.join(',')}`);
}

async function rerender() {
  await React.act(async () => renderer.update(React.createElement(Probe)));
}

function renderedValue() {
  return renderer.root.findByType(Text).props.children;
}

describe('useCarryStatusClock', () => {
  it('uses the time when asynchronous loading finishes after the scheduled time', async () => {
    focused = true;
    const dueCarry = carry('2026-10-04T12:05:00.000Z');
    probeCarries = [dueCarry];

    renderer = await mountProbe(Probe);
    expect(renderedValue()).toBe('2026-10-04T12:00:00.000Z|upcoming');

    jest.setSystemTime(new Date('2026-10-04T12:06:00.000Z'));
    loadState = { status: 'ready', data: 'loaded' };
    await rerender();

    expect(renderedValue()).toBe('2026-10-04T12:06:00.000Z|readyToReflect');
  });

  it('refreshes on resume, ignores background events, and preserves future and completed statuses', async () => {
    focused = true;
    loadState = { status: 'ready', data: 'loaded' };
    const carries = [
      carry('2026-10-04T12:05:00.000Z'),
      carry('2026-10-04T12:30:00.000Z'),
      carry('2026-10-04T11:00:00.000Z', {
        id: 'reflection-1',
        alignmentRating: 4,
        whatOccurred: 'I paused before answering.',
        insight: 'Listening helped.',
        createdAt: new Date('2026-10-04T11:30:00.000Z'),
      }),
    ];
    probeCarries = carries;

    renderer = await mountProbe(Probe);
    expect(renderedValue()).toBe('2026-10-04T12:00:00.000Z|upcoming,upcoming,completed');

    jest.setSystemTime(new Date('2026-10-04T12:06:00.000Z'));
    await React.act(async () => {
      for (const listener of listeners) listener('background');
    });
    expect(renderedValue()).toBe('2026-10-04T12:00:00.000Z|upcoming,upcoming,completed');

    await React.act(async () => {
      for (const listener of listeners) listener('active');
    });
    expect(renderedValue()).toBe('2026-10-04T12:06:00.000Z|readyToReflect,upcoming,completed');
  });

  it('refreshes when focused and removes its app-state listener on blur and unmount', async () => {
    focused = false;
    loadState = { status: 'ready', data: 'loaded' };
    renderer = await mountProbe(Probe);
    expect(listeners.size).toBe(0);

    focused = true;
    await rerender();
    expect(renderedValue()).toBe('2026-10-04T12:00:00.000Z|');
    expect(listeners.size).toBe(1);

    focused = false;
    await rerender();
    expect(listeners.size).toBe(0);

    jest.setSystemTime(new Date('2026-10-04T12:02:00.000Z'));
    focused = true;
    await rerender();
    expect(renderedValue()).toBe('2026-10-04T12:02:00.000Z|');
    expect(listeners.size).toBe(1);

    await unmountProbe(renderer);
    renderer = undefined;
    expect(listeners.size).toBe(0);
  });
});
