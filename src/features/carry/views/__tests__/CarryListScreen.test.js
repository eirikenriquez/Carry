const React = require('react');
const { afterEach, it, expect, jest } = require('@jest/globals');
const { Text } = require('react-native');
const { mountProbe, unmountProbe } = require('../../../bible/test-utils/hookTestHelpers');
const { CarryListScreen } = require('../CarryListScreen');

const reminderMessage =
  'Carry deleted, but its reminder could not be cancelled. It may still appear.';
let renderer;

afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
});

it.each([
  ['while the list is loading', { status: 'loading' }],
  ['when the list is empty', { status: 'ready', data: [] }],
])('keeps reminder cancellation feedback visible %s', async (_label, state) => {
  function Probe() {
    return React.createElement(CarryListScreen, {
      state,
      now: new Date('2026-10-04T12:00:00.000Z'),
      reminderMessage,
      onRetry: jest.fn(),
      onOpenCarry: jest.fn(),
      onBrowseBible: jest.fn(),
    });
  }

  renderer = await mountProbe(Probe);

  const warning = renderer.root
    .findAllByType(Text)
    .find((node) => node.props.children === reminderMessage);
  expect(warning.props.accessibilityRole).toBe('alert');
});
