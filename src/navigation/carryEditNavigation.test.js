const React = require('react');
const { it, expect, jest } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');

let mockActiveScreen = 'EditCarry';
let mockRoute = { params: { carryId: 'carry-7' } };
let mockEditFlowProps;
let mockCreateFlowProps;
let mockListFlowProps;
let mockDetailFlowProps;
let mockReflectFlowProps;
let mockReflectRouteElement;
let mockVersesProps;
const mockSelection = { startVerseKey: 'JHN.3.16', endVerseKey: 'JHN.3.16' };
const mockNavigation = {
  push: jest.fn(),
  popTo: jest.fn(),
  goBack: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
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
      Screen: ({ name, children }) => {
        if (name !== mockActiveScreen) return null;
        const element = children({ navigation: mockNavigation, route: mockRoute });
        if (name === 'ReflectCarry') mockReflectRouteElement = element;
        return element;
      },
    }),
  };
});
jest.mock('./CarryScreens', () => ({
  CreateCarryFlow: (props) => {
    mockCreateFlowProps = props;
    return null;
  },
  EditCarryFlow: (props) => {
    mockEditFlowProps = props;
    return null;
  },
  CarryListFlow: (props) => {
    mockListFlowProps = props;
    return null;
  },
  CarryDetailFlow: (props) => {
    mockDetailFlowProps = props;
    return null;
  },
  ReflectCarryFlow: (props) => {
    mockReflectFlowProps = props;
    return null;
  },
}));
jest.mock('../view-models/useBibleChapterViewModel', () => ({
  useBibleChapterViewModel: () => ({ state: { status: 'ready', data: [] }, retry: jest.fn() }),
}));
jest.mock('../view-models/usePassageSelectionViewModel', () => ({
  usePassageSelectionViewModel: () => ({
    selection: mockSelection,
    preview: { status: 'ready' },
    selectVerse: jest.fn(),
    clearSelection: jest.fn(),
    retryPreview: jest.fn(),
  }),
}));
jest.mock('../screens/BooksScreen', () => ({ BooksScreen: () => null }));
jest.mock('../screens/ChaptersScreen', () => ({ ChaptersScreen: () => null }));
jest.mock('../screens/VersesScreen', () => ({
  VersesScreen: (props) => {
    mockVersesProps = props;
    return null;
  },
}));
jest.mock('../components/ReferenceLookupForm', () => ({
  ReferenceLookupForm: () => null,
}));

const { AppNavigator } = require('./AppNavigator');

it('routes Carry forms and Scripture picks back to the matching screen', async () => {
  const carryRepository = {};
  const bibleRepository = {};
  const notifications = {};
  function Probe() {
    return React.createElement(AppNavigator, {
      repository: bibleRepository,
      carryRepository,
      notifications,
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
  mockDetailFlowProps = undefined;
  mockReflectFlowProps = undefined;
  mockReflectRouteElement = undefined;
  mockVersesProps = undefined;
  mockNavigation.push.mockClear();
  mockNavigation.popTo.mockClear();
  const renderer = await mountProbe(Probe);
  try {
    expect(mockEditFlowProps.carryId).toBe('carry-7');
    expect(mockEditFlowProps.notifications).toBe(notifications);
    await React.act(async () => mockEditFlowProps.onSaved('Reminder refreshed.'));
    expect(mockNavigation.popTo).toHaveBeenCalledWith('CarryDetail', {
      carryId: 'carry-7',
      reminderMessage: 'Reminder refreshed.',
    });
    mockNavigation.popTo.mockClear();
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

    await showScreen(renderer, 'CarryDetail', { params: { carryId: 'directly-created' } });
    expect(mockDetailFlowProps.carryId).toBe('directly-created');
    expect(mockDetailFlowProps.notifications).toBe(notifications);
    await React.act(async () => mockDetailFlowProps.onViewCarries());
    expect(mockNavigation.popTo).toHaveBeenNthCalledWith(3, 'Carries', {
      reminderMessage: undefined,
    });

    const deleteWarning =
      'Carry deleted, but its reminder could not be cancelled. It may still appear.';
    await React.act(async () => mockDetailFlowProps.onViewCarries(deleteWarning));
    expect(mockNavigation.popTo).toHaveBeenNthCalledWith(4, 'Carries', {
      reminderMessage: deleteWarning,
    });

    mockNavigation.push.mockClear();
    mockNavigation.popTo.mockClear();
    mockNavigation.goBack.mockClear();
    await React.act(async () => mockDetailFlowProps.onReflect());
    expect(mockNavigation.push).toHaveBeenCalledWith('ReflectCarry', {
      carryId: 'directly-created',
    });
    await showScreen(renderer, 'ReflectCarry', { params: { carryId: 'directly-created' } });
    expect(mockReflectFlowProps.repository).toBe(carryRepository);
    expect(mockReflectFlowProps.carryId).toBe('directly-created');
    expect(mockReflectRouteElement.key).toBe('directly-created');
    await React.act(async () => mockReflectFlowProps.onSaved());
    expect(mockNavigation.popTo).toHaveBeenCalledWith('CarryDetail', {
      carryId: 'directly-created',
    });
    await React.act(async () => mockReflectFlowProps.onCancel());
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);

    await showScreen(renderer, 'Carries', { params: { reminderMessage: deleteWarning } });
    expect(mockListFlowProps.reminderMessage).toBe(deleteWarning);
    await React.act(async () => mockListFlowProps.onClearReminderMessage());
    expect(mockNavigation.setParams).toHaveBeenCalledWith({ reminderMessage: undefined });
  } finally {
    await unmountProbe(renderer);
  }
});
