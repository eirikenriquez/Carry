const React = require('react');
const { it, expect, jest } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');

let mockLookupForm;
const mockListeners = { focus: new Set(), blur: new Set() };
const mockNavigation = {
  isFocused: jest.fn(() => true),
  push: jest.fn(),
  addListener: jest.fn((event, listener) => {
    mockListeners[event].add(listener);
    return () => mockListeners[event].delete(listener);
  }),
};

// Keep the real focus hook, with a small navigation host instead of native screens.
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    NavigationContainer: ({ children }) =>
      React.createElement(actual.NavigationContext.Provider, { value: mockNavigation }, children),
  };
});
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => React.createElement(React.Fragment, null, children),
    Screen: ({ name, children }) =>
      name === 'Books'
        ? children({ navigation: mockNavigation, route: { key: 'books', name: 'Books' } })
        : null,
  }),
}));
jest.mock('./CarryScreens', () => ({
  CreateCarryFlow: () => null,
  CarryListFlow: () => null,
  CarryDetailFlow: () => null,
}));
jest.mock('../screens/BooksScreen', () => ({
  BooksScreen: ({ referenceLookup }) => referenceLookup,
}));
jest.mock('../components/ReferenceLookupForm', () => ({
  ReferenceLookupForm: (props) => {
    mockLookupForm = props;
    return null;
  },
}));

const { AppNavigator } = require('./AppNavigator');

it('does not open a late reference after leaving Books, and allows lookup after returning', async () => {
  let resolveDelayed;
  const passage = {
    reference: 'John 3:16',
    verses: [{ key: 'JHN.3.16', bookId: 'JHN', chapter: 3, verse: 16, text: 'Verse text.' }],
  };
  const repository = {
    getPassage: jest
      .fn()
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveDelayed = resolve;
        }),
      )
      .mockResolvedValue({ ok: true, value: passage }),
  };
  function Probe() {
    return React.createElement(AppNavigator, {
      repository,
      carryRepository: {},
      books: [{ id: 'JHN', name: 'John', order: 43, chapterCount: 21 }],
    });
  }

  const renderer = await mountProbe(Probe);
  try {
    await React.act(async () => mockLookupForm.onChangeQuery('John 3:16'));
    await React.act(async () => mockLookupForm.onSubmit());
    expect(mockLookupForm.isLoading).toBe(true);

    mockNavigation.isFocused.mockReturnValue(false);
    await React.act(async () => {
      for (const listener of mockListeners.blur) listener();
      resolveDelayed({ ok: true, value: passage });
    });
    expect(mockNavigation.push).not.toHaveBeenCalled();
    expect(mockLookupForm.isLoading).toBe(false);

    mockNavigation.isFocused.mockReturnValue(true);
    await React.act(async () => {
      for (const listener of mockListeners.focus) listener();
      mockLookupForm.onSubmit();
    });
    expect(mockNavigation.push).toHaveBeenCalledTimes(1);
    expect(mockNavigation.push).toHaveBeenCalledWith('Verses', {
      bookId: 'JHN',
      chapter: 3,
      selection: { startVerseKey: 'JHN.3.16', endVerseKey: 'JHN.3.16' },
      selectForCarry: undefined,
    });

    // Focus can change before the blur cleanup runs; the navigation guard must still win.
    repository.getPassage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDelayed = resolve;
      }),
    );
    await React.act(async () => mockLookupForm.onSubmit());
    mockNavigation.isFocused.mockReturnValue(false);
    await React.act(async () => resolveDelayed({ ok: true, value: passage }));
    expect(mockNavigation.push).toHaveBeenCalledTimes(1);
  } finally {
    await unmountProbe(renderer);
  }
});
