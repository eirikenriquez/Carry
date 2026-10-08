const React = require('react');
const { it, expect, jest } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');

let mockActiveScreen = 'Home';
let mockRoute = { params: undefined };
let mockInitialRouteName;
let mockEditFlowProps;
let mockCreateFlowProps;
let mockHomeFlowProps;
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
  reset: jest.fn(),
  setParams: jest.fn(),
  getState: jest.fn(() => ({ routes: [] })),
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
      Navigator: ({ children, initialRouteName }) => {
        mockInitialRouteName = initialRouteName;
        return React.createElement(React.Fragment, null, children);
      },
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
  HomeFlow: (props) => {
    mockHomeFlowProps = props;
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

it('starts at Home and preserves new, edit and reflection navigation', async () => {
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

  mockActiveScreen = 'Home';
  mockRoute = { params: undefined };
  mockInitialRouteName = undefined;
  mockEditFlowProps = undefined;
  mockCreateFlowProps = undefined;
  mockHomeFlowProps = undefined;
  mockDetailFlowProps = undefined;
  mockReflectFlowProps = undefined;
  mockReflectRouteElement = undefined;
  mockVersesProps = undefined;
  mockNavigation.push.mockClear();
  mockNavigation.popTo.mockClear();
  mockNavigation.navigate.mockClear();
  mockNavigation.reset.mockClear();
  mockNavigation.getState.mockReturnValue({ routes: [{ name: 'Home' }] });
  const renderer = await mountProbe(Probe);
  try {
    expect(mockInitialRouteName).toBe('Home');
    expect(mockHomeFlowProps.repository).toBe(carryRepository);
    await React.act(async () => mockHomeFlowProps.onNewCarry());
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Books', {
      selectForCarry: { screen: 'CreateCarry' },
    });

    await showScreen(renderer, 'Verses', {
      params: {
        bookId: 'JHN',
        chapter: 3,
        selectForCarry: { screen: 'CreateCarry' },
      },
    });
    mockNavigation.getState.mockReturnValue({
      routes: [{ name: 'Home' }, { name: 'Books' }, { name: 'Chapters' }, { name: 'Verses' }],
    });
    await React.act(async () => mockVersesProps.onUsePassage());
    expect(mockNavigation.push).toHaveBeenCalledWith('CreateCarry', {
      selection: mockSelection,
    });

    await showScreen(renderer, 'CreateCarry', { params: { selection: mockSelection } });
    expect(mockCreateFlowProps.selection).toBe(mockSelection);
    await React.act(async () => mockCreateFlowProps.onChangePassage());
    expect(mockNavigation.push).toHaveBeenCalledWith('Books', {
      selectForCarry: { screen: 'CreateCarry' },
    });
    await showScreen(renderer, 'Verses', {
      params: {
        bookId: 'JHN',
        chapter: 3,
        selectForCarry: { screen: 'CreateCarry' },
      },
    });
    mockNavigation.getState.mockReturnValue({
      routes: [
        { name: 'Home' },
        { name: 'Books' },
        { name: 'Chapters' },
        { name: 'Verses' },
        { name: 'CreateCarry' },
        { name: 'Books' },
        { name: 'Chapters' },
        { name: 'Verses' },
      ],
    });
    await React.act(async () => mockVersesProps.onUsePassage());
    expect(mockNavigation.popTo).toHaveBeenCalledWith('CreateCarry', {
      selection: mockSelection,
    });
    await showScreen(renderer, 'CreateCarry', { params: { selection: mockSelection } });
    await React.act(async () =>
      mockCreateFlowProps.onSaved('new-carry', 'The reminder could not be scheduled.'),
    );
    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: 'Home' },
        {
          name: 'CarryDetail',
          params: {
            carryId: 'new-carry',
            reminderMessage: 'The reminder could not be scheduled.',
          },
        },
      ],
    });

    await showScreen(renderer, 'CreateCarry', { params: { selection: mockSelection } });
    await React.act(async () => mockCreateFlowProps.onCancel());
    expect(mockNavigation.popTo).toHaveBeenLastCalledWith('Home');

    mockActiveScreen = 'EditCarry';
    mockRoute = { params: { carryId: 'carry-7' } };
    mockNavigation.push.mockClear();
    await React.act(async () => renderer.update(React.createElement(Probe)));
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
    await showScreen(renderer, 'CarryDetail', { params: { carryId: 'directly-created' } });
    expect(mockDetailFlowProps.carryId).toBe('directly-created');
    expect(mockDetailFlowProps.notifications).toBe(notifications);
    await React.act(async () => mockDetailFlowProps.onGoHome());
    expect(mockNavigation.popTo).toHaveBeenCalledWith('Home', {
      reminderMessage: undefined,
    });

    const deleteWarning =
      'Carry deleted, but its reminder could not be cancelled. It may still appear.';
    await React.act(async () => mockDetailFlowProps.onGoHome(deleteWarning));
    expect(mockNavigation.popTo).toHaveBeenLastCalledWith('Home', {
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

    await showScreen(renderer, 'Home', { params: { reminderMessage: deleteWarning } });
    expect(mockHomeFlowProps.reminderMessage).toBe(deleteWarning);
    await React.act(async () => mockHomeFlowProps.onClearReminderMessage());
    expect(mockNavigation.setParams).toHaveBeenCalledWith({ reminderMessage: undefined });
  } finally {
    await unmountProbe(renderer);
  }
});
