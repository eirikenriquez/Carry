const React = require('react');
const { afterEach, describe, expect, it, jest } = require('@jest/globals');
const { Text, TextInput } = require('react-native');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');
const { ReflectionFormScreen } = require('./ReflectionFormScreen');

const { act } = React;
let renderer;

function makeProps(overrides = {}) {
  return {
    draft: { alignmentRating: null, whatOccurred: '', insight: '' },
    fieldErrors: {},
    situation: 'Before a difficult conversation',
    ifThenIntention: 'If I feel tense, then I will listen first.',
    saveError: null,
    isSaving: false,
    onChangeRating: jest.fn(),
    onChangeWhatOccurred: jest.fn(),
    onChangeInsight: jest.fn(),
    onSave: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
}

async function mount(props) {
  let currentProps = props;
  function Probe() {
    return React.createElement(ReflectionFormScreen, currentProps);
  }

  renderer = await mountProbe(Probe);
  return {
    update: async (updates) => {
      currentProps = { ...currentProps, ...updates };
      await act(async () => renderer.update(React.createElement(Probe)));
    },
  };
}

afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
});

describe('ReflectionFormScreen', () => {
  it('shows Carry context, an unselected five-point rating, and forwards field changes', async () => {
    const props = makeProps();
    const mounted = await mount(props);
    const ratings = () =>
      renderer.root.findAll(
        (node) =>
          node.props.accessibilityRole === 'radio' &&
          /^Rating [1-5]$/.test(node.props.accessibilityLabel ?? '') &&
          typeof node.props.onPress === 'function',
      );

    expect(renderer.root.findAllByType(Text).map((node) => node.props.children)).toContain(
      'Before a difficult conversation',
    );
    expect(renderer.root.findAllByType(Text).map((node) => node.props.children)).toContain(
      'If I feel tense, then I will listen first.',
    );
    expect(renderer.root.findAllByType(Text).map((node) => node.props.children)).toContain(
      'Alignment (required)',
    );
    expect(renderer.root.findAllByType(Text).map((node) => node.props.children)).toContain(
      'How closely did your response follow your plan? 1 = not at all; 5 = closely.',
    );
    expect(ratings()).toHaveLength(5);
    expect(ratings().map((node) => node.props.accessibilityLabel)).toEqual([
      'Rating 1',
      'Rating 2',
      'Rating 3',
      'Rating 4',
      'Rating 5',
    ]);
    expect(
      ratings().every(
        (node) =>
          node.props.accessibilityState.selected === false &&
          node.props.accessibilityState.checked === false,
      ),
    ).toBe(true);

    await act(async () => ratings()[3].props.onPress());
    expect(props.onChangeRating).toHaveBeenCalledWith(4);
    const inputs = renderer.root.findAllByType(TextInput);
    expect(inputs.map((node) => node.props.accessibilityLabel)).toEqual([
      'What happened (required)',
      'What did you learn (required)',
    ]);
    expect(inputs.every((node) => node.props.multiline)).toBe(true);
    await act(async () => {
      inputs[0].props.onChangeText('I paused before answering.');
      inputs[1].props.onChangeText('Listening first helped.');
    });
    expect(props.onChangeWhatOccurred).toHaveBeenCalledWith('I paused before answering.');
    expect(props.onChangeInsight).toHaveBeenCalledWith('Listening first helped.');

    await mounted.update({ draft: { alignmentRating: 4, whatOccurred: '', insight: '' } });
    expect(ratings()[3].props.accessibilityState).toMatchObject({ checked: true, selected: true });
  });

  it('announces field and save errors and disables every control while saving', async () => {
    const props = makeProps({
      fieldErrors: {
        alignmentRating: 'Choose an alignment rating.',
        whatOccurred: 'Describe what happened.',
        insight: 'Add an insight.',
      },
      saveError: 'Your reflection could not be saved. Please try again.',
      isSaving: true,
    });
    await mount(props);

    const alerts = renderer.root
      .findAllByType(Text)
      .filter((node) => node.props.accessibilityRole === 'alert')
      .map((node) => node.props.children);
    expect(alerts).toEqual([
      'Choose an alignment rating.',
      'Describe what happened.',
      'Add an insight.',
      'Your reflection could not be saved. Please try again.',
    ]);
    expect(
      renderer.root
        .findAll(
          (node) =>
            node.props.accessibilityRole === 'radio' &&
            /^Rating [1-5]$/.test(node.props.accessibilityLabel ?? '') &&
            typeof node.props.onPress === 'function',
        )
        .every((node) => node.props.disabled && node.props.accessibilityState.disabled),
    ).toBe(true);
    expect(
      renderer.root.findAllByType(TextInput).every((node) => node.props.editable === false),
    ).toBe(true);

    const cancelButton = renderer.root.findAll(
      (node) =>
        typeof node.props.onPress === 'function' &&
        node.findAllByType(Text).some((text) => text.props.children === 'Cancel'),
    )[0];
    const saveButton = renderer.root.findAll(
      (node) =>
        node.props.accessibilityLabel === 'Saving reflection' &&
        typeof node.props.onPress === 'function',
    )[0];
    expect(cancelButton.props.disabled).toBe(true);
    expect(saveButton).toMatchObject({
      props: { disabled: true, accessibilityState: { disabled: true, busy: true } },
    });
    expect(props.onSave).not.toHaveBeenCalled();
    expect(props.onCancel).not.toHaveBeenCalled();
  });
});
