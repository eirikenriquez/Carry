const React = require('react');
const { expect, it, jest } = require('@jest/globals');
const { Text } = require('react-native');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');
const { CarryFormScreen } = require('./CarryFormScreen');
const { formatSchedule } = require('./carryDisplay');

it('shows category history only during creation and keeps its feedback separate from Save', async () => {
  const reflection = {
    id: 'reflection-work',
    alignmentRating: 4,
    whatOccurred: 'I listened before responding.',
    insight: 'Pause before speaking.',
    createdAt: new Date('2026-10-05T01:00:00Z'),
  };
  const onRetryReflection = jest.fn();
  const onSave = jest.fn();
  let props = {
    draft: { categoryName: '  WORK  ', situation: '', scheduledAt: null, ifThenIntention: '' },
    categories: [{ id: 'work', name: 'Work' }],
    categoryLoadFailed: false,
    onRetryCategories: jest.fn(),
    categoryReflection: { status: 'ready', data: reflection },
    onRetryReflection,
    passagePreview: { status: 'loading' },
    onRetryPassage: jest.fn(),
    errors: {},
    saveError: null,
    isSaving: false,
    onChangeCategory: jest.fn(),
    onChangeSituation: jest.fn(),
    onChangeIntention: jest.fn(),
    onChangeSchedule: jest.fn(),
    onChangePassage: jest.fn(),
    onSave,
    onCancel: jest.fn(),
  };
  function Probe() {
    return React.createElement(CarryFormScreen, props);
  }
  const renderer = await mountProbe(Probe);
  const text = () =>
    renderer.root
      .findAllByType(Text)
      .map((node) => React.Children.toArray(node.props.children).join(''));
  const button = (label) =>
    renderer.root.findAll(
      (node) => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label,
    )[0];
  async function update(changes) {
    props = { ...props, ...changes };
    await React.act(async () => renderer.update(React.createElement(Probe)));
  }
  try {
    expect(text()).toEqual(
      expect.arrayContaining([
        'Latest category reflection',
        formatSchedule(reflection.createdAt),
        '4 / 5',
        reflection.whatOccurred,
        reflection.insight,
      ]),
    );
    expect(button('Use category Work').props.accessibilityState.selected).toBe(true);
    await update({ categoryReflection: { status: 'loading' } });
    expect(text()).toContain('Loading previous reflection…');
    expect(text()).not.toContain(reflection.insight);
    expect(button('Save Carry').props.disabled).toBe(false);
    await update({ categoryReflection: { status: 'ready', data: null } });
    expect(text()).toContain('No previous reflection for this category yet.');
    await update({ categoryReflection: { status: 'error' } });
    expect(text()).toContain(
      'Previous reflection could not be loaded. You can still save this Carry.',
    );
    await React.act(async () => button('Retry loading previous reflection').props.onPress());
    expect(onRetryReflection).toHaveBeenCalledTimes(1);
    await React.act(async () => button('Save Carry').props.onPress());
    expect(onSave).toHaveBeenCalledTimes(1);
    await update({ isSaving: true });
    expect(button('Retry loading previous reflection').props.disabled).toBe(true);
    await update({ isSaving: false, categoryReflection: null });
    expect(text()).not.toContain('Latest category reflection');
    await update({ mode: 'edit', categoryReflection: { status: 'ready', data: reflection } });
    expect(text()).not.toContain('Latest category reflection');
    expect(button('Save changes').props.disabled).toBe(false);
  } finally {
    await unmountProbe(renderer);
  }
});
