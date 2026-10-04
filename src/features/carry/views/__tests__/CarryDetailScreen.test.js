const React = require('react');
const { afterEach, it, jest, expect } = require('@jest/globals');
const { Alert, Text } = require('react-native');
const { mountProbe, unmountProbe } = require('../../../bible/test-utils/hookTestHelpers');
const { CarryDetailScreen } = require('../CarryDetailScreen');

const state = {
  status: 'ready',
  data: {
    carry: {
      id: 'carry-1',
      categoryId: 'work',
      situation: 'Before a hard conversation',
      scheduledAt: new Date('2099-01-01T00:00:00.000Z'),
      passage: { startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.19' },
      ifThenIntention: 'If I feel tense, then I will listen first.',
      createdAt: new Date('2026-10-02T01:00:00.000Z'),
    },
    categoryName: 'Work',
    passage: {
      reference: 'James 1:19',
      verses: [{ key: 'JAS.1.19', verse: 19, text: 'Be quick to hear.' }],
    },
  },
};

let renderer;
let alert;
afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
  alert?.mockRestore();
  alert = undefined;
});

it('invokes deletion only from the native destructive confirmation', async () => {
  const onDelete = jest.fn();
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  function Probe() {
    return React.createElement(CarryDetailScreen, {
      state,
      now: new Date('2026-10-04T12:00:00.000Z'),
      onRetry: jest.fn(),
      onViewCarries: jest.fn(),
      onEdit: jest.fn(),
      onReflect: jest.fn(),
      onDelete,
      isDeleting: false,
      deleteError: null,
    });
  }

  renderer = await mountProbe(Probe);
  const deleteButton = renderer.root.findAll(
    (node) =>
      typeof node.props.onPress === 'function' &&
      node.findAllByType(Text).some((text) => text.props.children === 'Delete Carry'),
  )[0];
  await React.act(async () => deleteButton.props.onPress());

  expect(alert).toHaveBeenCalledWith(
    'Delete this Carry?',
    'This permanently deletes this Carry. This cannot be undone.',
    expect.any(Array),
    { cancelable: true },
  );
  expect(onDelete).not.toHaveBeenCalled();

  const buttons = alert.mock.calls[0][2];
  expect(buttons[0]).toMatchObject({ text: 'Cancel', style: 'cancel' });
  expect(buttons[0].onPress).toBeUndefined();
  await React.act(async () => buttons[1].onPress());
  expect(buttons[1]).toMatchObject({ text: 'Delete', style: 'destructive' });
  expect(onDelete).toHaveBeenCalledTimes(1);
});

it('disables detail actions and reports progress while deletion is pending', async () => {
  function Probe() {
    return React.createElement(CarryDetailScreen, {
      state,
      now: new Date('2026-10-04T12:00:00.000Z'),
      onRetry: jest.fn(),
      onViewCarries: jest.fn(),
      onEdit: jest.fn(),
      onReflect: jest.fn(),
      onDelete: jest.fn(),
      isDeleting: true,
      deleteError: null,
    });
  }

  renderer = await mountProbe(Probe);
  const buttons = (label) =>
    renderer.root.findAll(
      (node) =>
        typeof node.props.onPress === 'function' &&
        node.findAllByType(Text).some((text) => text.props.children === label),
    );

  for (const label of ['Edit Carry', 'Deleting…', 'Back to Carries']) {
    expect(buttons(label)[0].props.disabled).toBe(true);
    expect(buttons(label)[0].props.accessibilityState.disabled).toBe(true);
  }
  expect(buttons('Deleting…')[0].props.accessibilityState.busy).toBe(true);
  expect(
    renderer.root.findAllByType(Text).some((node) => node.props.children === 'Deleting Carry…'),
  ).toBe(true);
});

it.each([
  ['readyToReflect', { scheduledAt: new Date('2026-10-03T00:00:00.000Z') }, true],
  ['upcoming', {}, false],
  [
    'completed',
    {
      reflection: {
        id: 'reflection-1',
        alignmentRating: 4,
        whatOccurred: 'I listened.',
        insight: 'Pause first.',
        createdAt: new Date('2026-10-04T12:00:00.000Z'),
      },
    },
    false,
  ],
])(
  'shows reflection availability and saved values for %s Carries',
  async (status, carryChanges, visible) => {
    const onReflect = jest.fn();
    const screenState = {
      ...state,
      data: { ...state.data, carry: { ...state.data.carry, ...carryChanges } },
    };
    function Probe() {
      return React.createElement(CarryDetailScreen, {
        state: screenState,
        now: new Date('2026-10-04T12:00:00.000Z'),
        onRetry: jest.fn(),
        onViewCarries: jest.fn(),
        onEdit: jest.fn(),
        onReflect,
        onDelete: jest.fn(),
        isDeleting: false,
        deleteError: null,
      });
    }

    renderer = await mountProbe(Probe);
    const reflectButtons = renderer.root.findAll(
      (node) =>
        typeof node.props.onPress === 'function' &&
        node.findAllByType(Text).some((text) => text.props.children === 'Reflect on Carry'),
    );

    expect(reflectButtons).toHaveLength(visible ? 1 : 0);
    if (visible) await React.act(async () => reflectButtons[0].props.onPress());
    expect(onReflect).toHaveBeenCalledTimes(visible ? 1 : 0);

    if (status === 'completed') {
      const textValues = renderer.root.findAllByType(Text).map((node) => node.props.children);
      expect(textValues).toEqual(
        expect.arrayContaining(['Reflection', '4 / 5', 'I listened.', 'Pause first.']),
      );
      for (const label of ['Edit Carry', 'Delete Carry', 'Reflect on Carry']) {
        expect(
          renderer.root.findAll(
            (node) =>
              typeof node.props.onPress === 'function' &&
              node.findAllByType(Text).some((text) => text.props.children === label),
          ),
        ).toHaveLength(0);
      }
    }
  },
);
