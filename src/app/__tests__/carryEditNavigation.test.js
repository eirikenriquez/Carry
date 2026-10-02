const React = require('react');
const { it, expect, jest } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../../features/bible/test-utils/hookTestHelpers');

let mockActiveScreen = 'EditCarry';
let mockRoute = { params: { carryId: 'carry-7' } };
let mockEditFlowProps;
let mockCreateFlowProps;
let mockVersesProps;
const mockSelection = { startVerseKey: 'JHN.3.16', endVerseKey: 'JHN.3.16' };
const mockNavigation = {
  push: jest.fn(),
  popTo: jest.fn(),
  goBack: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    NavigationContainer: ({ children }) => React.createElement(React.Fragment, null, children),
  };
});
jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }) => React.createElement(React.Fragment, null, children),
      Screen: ({ name, children }) =>
        name === mockActiveScreen
          ? children({ navigation: mockNavigation, route: mockRoute })
          : null,
    }),
  };
});
jest.mock('../CarryScreens', () => ({
  CreateCarryFlow: (props) => {
    mockCreateFlowProps = props;
    return null;
  },
  EditCarryFlow: (props) => {
    mockEditFlowProps = props;
    return null;
  },
  CarryListFlow: () => null,
  CarryDetailFlow: () => null,
}));
jest.mock('../../features/bible/view-models/useBibleChapterViewModel', () => ({
  useBibleChapterViewModel: () => ({ state: { status: 'ready', data: [] }, retry: jest.fn() }),
}));
jest.mock('../../features/bible/view-models/usePassageSelectionViewModel', () => ({
  usePassageSelectionViewModel: () => ({
    selection: mockSelection,
    preview: { status: 'ready' },
    selectVerse: jest.fn(),
    clearSelection: jest.fn(),
    retryPreview: jest.fn(),
  }),
}));
jest.mock('../../features/bible/views/BooksScreen', () => ({ BooksScreen: () => null }));
jest.mock('../../features/bible/views/ChaptersScreen', () => ({ ChaptersScreen: () => null }));
jest.mock('../../features/bible/views/VersesScreen', () => ({
  VersesScreen: (props) => {
    mockVersesProps = props;
    return null;
  },
}));
jest.mock('../../features/bible/views/ReferenceLookupForm', () => ({
  ReferenceLookupForm: () => null,
}));

const { AppNavigator } = require('../AppNavigator');

it('routes Scripture picks back to the matching edit or create draft', async () => {
  const carryRepository = {};
  const bibleRepository = {};
  function Probe() {
    return React.createElement(AppNavigator, {
      repository: bibleRepository,
      carryRepository,
      books: [{ id: 'JHN', name: 'John', order: 43, chapterCount: 21 }],
    });
  }
  async function showScreen(renderer, name, route) {
    mockActiveScreen = name;
    mockRoute = route;
    await React.act(async () => renderer.update(React.createElement(Probe)));
  }

  mockActiveScreen = 'EditCarry';
  mockRoute = { params: { carryId: 'carry-7' } };
  mockEditFlowProps = undefined;
  mockCreateFlowProps = undefined;
  mockVersesProps = undefined;
  mockNavigation.push.mockClear();
  mockNavigation.popTo.mockClear();
  const renderer = await mountProbe(Probe);
  try {
    expect(mockEditFlowProps.carryId).toBe('carry-7');
    await React.act(async () => mockEditFlowProps.onChangePassage());
    expect(mockNavigation.push).toHaveBeenNthCalledWith(1, 'Books', {
      selectForCarry: { screen: 'EditCarry', carryId: 'carry-7' },
    });
    await showScreen(renderer, 'Verses', {
      params: {
        bookId: 'JHN',
        chapter: 3,
        selectForCarry: { screen: 'EditCarry', carryId: 'carry-7' },
      },
    });
    await React.act(async () => mockVersesProps.onUsePassage());
    expect(mockNavigation.popTo).toHaveBeenNthCalledWith(1, 'EditCarry', {
      carryId: 'carry-7',
      selection: mockSelection,
    });
    await showScreen(renderer, 'CreateCarry', { params: { selection: mockSelection } });
    await React.act(async () => mockCreateFlowProps.onChangePassage());
    expect(mockNavigation.push).toHaveBeenNthCalledWith(2, 'Books', {
      selectForCarry: { screen: 'CreateCarry' },
    });

    await showScreen(renderer, 'Verses', {
      params: {
        bookId: 'JHN',
        chapter: 3,
        selectForCarry: { screen: 'CreateCarry' },
      },
    });
    await React.act(async () => mockVersesProps.onUsePassage());
    expect(mockNavigation.popTo).toHaveBeenNthCalledWith(2, 'CreateCarry', {
      selection: mockSelection,
    });
  } finally {
    await unmountProbe(renderer);
  }
});
