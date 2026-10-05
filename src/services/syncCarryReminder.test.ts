import type { Carry } from '../models/Carry';
import type { CarryRepository } from '../repositories/CarryRepository';
import type { NotificationService } from './NotificationService';
import { syncCarryReminder } from './syncCarryReminder';

const NOW = new Date('2026-10-02T12:00:00.000Z');
const CARRY: Carry = {
  id: 'carry-1',
  categoryId: 'work',
  situation: 'A difficult conversation',
  scheduledAt: new Date('2026-10-03T21:00:00.000Z'),
  passage: { startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.20' },
  ifThenIntention: 'I will listen first.',
  createdAt: new Date('2026-10-02T08:00:00.000Z'),
};

function setup(carry: Carry) {
  const setReminderId = jest.fn(async (_id: string, _reminderId: string | null) => ({
    ok: true as const,
    value: true,
  }));
  const repository = { setReminderId } as unknown as CarryRepository;
  const schedule = jest.fn(async () => 'reminder-new');
  const cancel = jest.fn(async () => undefined);
  const notifications: NotificationService = {
    requestPermission: jest.fn(async () => true),
    schedule,
    cancel,
  };
  const now = jest.fn(() => NOW);
  return { carry, repository, notifications, now, setReminderId, schedule, cancel };
}

describe('syncCarryReminder', () => {
  it('cancels and unlinks the stored reminder before scheduling and linking its replacement', async () => {
    const setupState = setup({ ...CARRY, reminderId: 'reminder-old' });
    setupState.schedule
      .mockResolvedValueOnce('reminder-new')
      .mockResolvedValueOnce('reminder-latest');

    const first = await syncCarryReminder(
      setupState.carry,
      setupState.repository,
      setupState.notifications,
      setupState.now,
    );
    expect(first).toEqual({
      carry: { ...CARRY, reminderId: 'reminder-new' },
      status: 'scheduled',
    });

    await expect(
      syncCarryReminder(
        first.carry,
        setupState.repository,
        setupState.notifications,
        setupState.now,
      ),
    ).resolves.toEqual({
      carry: { ...CARRY, reminderId: 'reminder-latest' },
      status: 'scheduled',
    });
    expect(setupState.notifications.cancel).toHaveBeenCalledWith('reminder-old');
    expect(setupState.cancel).toHaveBeenNthCalledWith(2, 'reminder-new');
    expect(setupState.setReminderId.mock.calls).toEqual([
      ['carry-1', null],
      ['carry-1', 'reminder-new'],
      ['carry-1', null],
      ['carry-1', 'reminder-latest'],
    ]);
    expect(setupState.schedule).toHaveBeenCalledTimes(2);
    for (let index = 0; index < 2; index += 1) {
      expect(setupState.cancel.mock.invocationCallOrder[index]).toBeLessThan(
        setupState.setReminderId.mock.invocationCallOrder[index * 2],
      );
      expect(setupState.setReminderId.mock.invocationCallOrder[index * 2]).toBeLessThan(
        setupState.schedule.mock.invocationCallOrder[index],
      );
    }
  });
});
