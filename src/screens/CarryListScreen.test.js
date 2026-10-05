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
