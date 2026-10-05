const React = require('react');
const { it, jest, expect } = require('@jest/globals');
const { SectionList, Text } = require('react-native');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');
const { CarryListScreen } = require('./CarryListScreen');

it('renders lifecycle sections, an empty group and the existing detail action', async () => {
  const upcoming = {
    carry: {
      id: 'upcoming-1',
      situation: 'Work meeting',
      scheduledAt: new Date('2026-10-07T01:00:00Z'),
    },
    categoryName: 'Work',
  };
  const completed = {
    carry: {
      id: 'completed-1',
      situation: 'Difficult conversation',
      scheduledAt: new Date('2026-10-05T01:00:00Z'),
    },
    categoryName: 'Patience',
  };
  const sections = [
    { key: 'upcoming', data: [upcoming] },
    { key: 'readyToReflect', data: [] },
    { key: 'completed', data: [completed] },
  ];
  const onOpenCarry = jest.fn();
  function Probe() {
    return React.createElement(CarryListScreen, {
      state: { status: 'ready', data: [upcoming, completed] },
      sections,
      onOpenCarry,
      onRetry: jest.fn(),
      onBrowseBible: jest.fn(),
    });
  }

  const renderer = await mountProbe(Probe);
  try {
    expect(renderer.root.findByType(SectionList).props.sections).toEqual(sections);
    const text = renderer.root.findAllByType(Text).map((node) => node.props.children);
    expect(text).toEqual(
      expect.arrayContaining([
        'Upcoming',
        'Ready to reflect',
        'Completed',
        'No Carries ready to reflect on.',
      ]),
    );

    const button = renderer.root.findAll(
      (node) =>
        typeof node.props.onPress === 'function' &&
        node.props.accessibilityLabel?.startsWith('Work meeting.'),
    )[0];
    await React.act(async () => button.props.onPress());
    expect(onOpenCarry).toHaveBeenCalledWith('upcoming-1');
  } finally {
    await unmountProbe(renderer);
  }
});

it('keeps loading, retry, reminder feedback and the first-Carry prompt', async () => {
  let state = { status: 'loading' };
  const onRetry = jest.fn();
  const onBrowseBible = jest.fn();
  function Probe() {
    return React.createElement(CarryListScreen, {
      state,
      sections: [
        { key: 'upcoming', data: [] },
        { key: 'readyToReflect', data: [] },
        { key: 'completed', data: [] },
      ],
      reminderMessage: 'A reminder could not be cancelled.',
      onRetry,
      onBrowseBible,
      onOpenCarry: jest.fn(),
    });
  }

  const renderer = await mountProbe(Probe);
  const renderedText = () =>
    renderer.root
      .findAllByType(Text)
      .map((node) => React.Children.toArray(node.props.children).join(''));
  try {
    expect(renderedText()).toContain('Loading carries…');
    expect(renderedText()).toContain('A reminder could not be cancelled.');

    state = { status: 'error' };
    await React.act(async () => renderer.update(React.createElement(Probe)));
    expect(renderedText()).toContain('Carries could not be loaded.');
    const retryButton = renderer.root.findAll(
      (node) =>
        typeof node.props.onPress === 'function' &&
        node.props.accessibilityLabel === 'Retry loading carries',
    )[0];
    await React.act(async () => retryButton.props.onPress());
    expect(onRetry).toHaveBeenCalledTimes(1);

    state = { status: 'ready', data: [] };
    await React.act(async () => renderer.update(React.createElement(Probe)));
    expect(renderer.root.findByType(SectionList).props.sections).toEqual([]);
    expect(renderedText()).toContain('No Carries saved yet');
    const browseButton = renderer.root.findAll(
      (node) => typeof node.props.onPress === 'function' && node.props.onPress === onBrowseBible,
    )[0];
    await React.act(async () => browseButton.props.onPress());
    expect(onBrowseBible).toHaveBeenCalledTimes(1);
  } finally {
    await unmountProbe(renderer);
  }
});
