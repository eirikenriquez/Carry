const React = require('react');
const { afterEach, it, jest, expect } = require('@jest/globals');
const { mountProbe, unmountProbe } = require('../testing/hookTestHelpers');

let lastResponse;
let responseListener;
let subscriptionRemove = jest.fn();
const mockNavigate = jest.fn();
const mockNavigationRef = { isReady: jest.fn(() => true), navigate: mockNavigate };
const mockClearLastResponse = jest.fn();

jest.mock('expo-notifications', () => ({
  DEFAULT_ACTION_IDENTIFIER: 'default-action',
  addNotificationResponseReceivedListener: (listener) => {
    responseListener = listener;
    return { remove: subscriptionRemove };
  },
  getLastNotificationResponse: () => lastResponse,
  clearLastNotificationResponse: mockClearLastResponse,
}));

const { useReminderNavigation } = require('./useReminderNavigation');

let renderer;
let navigationReady;

function response(identifier, carryId, actionIdentifier = 'default-action') {
  return {
    actionIdentifier,
    notification: {
      request: { identifier, content: { data: { carryId } } },
    },
  };
}

function Probe() {
  useReminderNavigation(mockNavigationRef, navigationReady);
  return null;
}

afterEach(async () => {
  await unmountProbe(renderer);
  renderer = undefined;
  lastResponse = null;
  responseListener = undefined;
  subscriptionRemove = jest.fn();
  mockNavigate.mockReset();
  mockClearLastResponse.mockReset();
  mockNavigationRef.isReady.mockReset().mockReturnValue(true);
});

it('queues a cold launch response until navigation is ready, then clears it', async () => {
  lastResponse = response('tap-1', 'carry-7');
  navigationReady = false;
  renderer = await mountProbe(Probe);

  expect(mockNavigate).not.toHaveBeenCalled();
  navigationReady = true;
  await React.act(async () => renderer.update(React.createElement(Probe)));

  expect(mockNavigate).toHaveBeenCalledWith('CarryDetail', { carryId: 'carry-7' });
  expect(mockClearLastResponse).toHaveBeenCalledTimes(1);
});

it('routes one default warm tap and ignores duplicates and malformed responses', async () => {
  lastResponse = null;
  navigationReady = true;
  renderer = await mountProbe(Probe);

  await React.act(async () => {
    responseListener(response('tap-2', 'carry-8'));
    responseListener(response('tap-2', 'carry-8'));
    responseListener(response('tap-3', '   '));
    responseListener(response('tap-4', 'carry-9', 'custom-action'));
  });
  await React.act(async () => responseListener(response('tap-5', 'carry-8')));

  expect(mockNavigate).toHaveBeenCalledTimes(2);
  expect(mockNavigate).toHaveBeenCalledWith('CarryDetail', { carryId: 'carry-8' });
  expect(mockClearLastResponse).toHaveBeenCalledTimes(2);
});

it('removes the warm response listener when the hook unmounts', async () => {
  navigationReady = true;
  subscriptionRemove = jest.fn();
  renderer = await mountProbe(Probe);
  await unmountProbe(renderer);
  renderer = undefined;

  expect(subscriptionRemove).toHaveBeenCalledTimes(1);
});
