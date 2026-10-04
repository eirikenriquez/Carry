const React = require('react');
const { afterEach, it, jest, expect } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../../features/bible/test-utils/hookTestHelpers');

let mockModel;
let mockDetailScreenProps;
const mockUsePreventRemove = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  usePreventRemove: (...args) => mockUsePreventRemove(...args),
}));
jest.mock('../../features/carry/view-models/useCarryDetailViewModel', () => ({
  useCarryDetailViewModel: () => mockModel,
}));
jest.mock('../../features/carry/views/CarryDetailScreen', () => ({
  CarryDetailScreen: (props) => {
    mockDetailScreenProps = props;
    return null;
  },
}));

const { CarryDetailFlow } = require('../CarryScreens');

let renderer;
afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
});

it('prevents leaving while deleting and returns to Carries after success', async () => {
  const deleteCarry = jest.fn();
  const onViewCarries = jest.fn();
  mockModel = {
    state: { status: 'ready', data: {} },
    retry: jest.fn(),
    isDeleting: true,
    deleteError: null,
    deleteWarning: null,
    deletedCarryId: null,
    deleteCarry,
  };
  mockDetailScreenProps = undefined;
  mockUsePreventRemove.mockClear();

  function Probe() {
    return React.createElement(CarryDetailFlow, {
      repository: {},
      bibleRepository: {},
      notifications: {},
      carryId: 'carry-7',
      onViewCarries,
      onEdit: jest.fn(),
    });
  }

  renderer = await mountProbe(Probe);
  expect(mockUsePreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function));
  expect(mockDetailScreenProps.isDeleting).toBe(true);
  await React.act(async () => mockDetailScreenProps.onDelete());
  expect(deleteCarry).toHaveBeenCalledTimes(1);
  expect(onViewCarries).not.toHaveBeenCalled();

  mockModel = {
    ...mockModel,
    isDeleting: false,
    deletedCarryId: 'carry-7',
    deleteWarning: 'Carry deleted, but its reminder could not be cancelled. It may still appear.',
  };
  await React.act(async () => renderer.update(React.createElement(Probe)));

  expect(mockUsePreventRemove).toHaveBeenLastCalledWith(false, expect.any(Function));
  expect(onViewCarries).toHaveBeenCalledWith(
    'Carry deleted, but its reminder could not be cancelled. It may still appear.',
  );
});
