import type { Carry } from '../models/Carry';
import type { CarryRepository, CarryRepositoryResult } from '../repositories/CarryRepository';
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

function setup(
  overrides: {
    readonly carry?: Carry;
    readonly clearResult?: CarryRepositoryResult<boolean>;
    readonly cancel?: () => Promise<void>;
    readonly schedule?: () => Promise<string>;
    readonly permission?: () => Promise<boolean>;
  } = {},
) {
  const carry = overrides.carry ?? CARRY;
  const setReminderId = jest.fn(
    async (_id: string, _reminderId: string | null) =>
      overrides.clearResult ?? { ok: true as const, value: true },
  );
  const repository = { setReminderId } as unknown as CarryRepository;
  const schedule = jest.fn(overrides.schedule ?? (async () => 'reminder-new'));
  const cancel = jest.fn(overrides.cancel ?? (async () => undefined));
  const notifications: NotificationService = {
    requestPermission: jest.fn(overrides.permission ?? (async () => true)),
    schedule,
    cancel,
  };
  const now = jest.fn(() => NOW);
  return { carry, repository, notifications, now, setReminderId, schedule, cancel };
}

describe('syncCarryReminder', () => {
  it('cancels and unlinks the stored reminder before scheduling and linking its replacement', async () => {
    const setupState = setup({ carry: { ...CARRY, reminderId: 'reminder-old' } });
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

  it('keeps the old link and avoids duplicate scheduling when cancellation fails', async () => {
    const setupState = setup({
      carry: { ...CARRY, reminderId: 'reminder-old' },
      cancel: async () => {
        throw new Error('Cancellation failed');
      },
    });

    await expect(
      syncCarryReminder(
        setupState.carry,
        setupState.repository,
        setupState.notifications,
        setupState.now,
      ),
    ).resolves.toEqual({ carry: setupState.carry, status: 'cancel_failed' });
    expect(setupState.setReminderId).not.toHaveBeenCalled();
    expect(setupState.schedule).not.toHaveBeenCalled();
  });

  it('keeps the stored link and avoids a new alarm when clearing fails', async () => {
    const setupState = setup({
      carry: { ...CARRY, reminderId: 'reminder-old' },
      clearResult: { ok: false, code: 'unavailable' },
    });

    await expect(
      syncCarryReminder(
        setupState.carry,
        setupState.repository,
        setupState.notifications,
        setupState.now,
      ),
    ).resolves.toEqual({ carry: setupState.carry, status: 'unlink_failed' });
    expect(setupState.schedule).not.toHaveBeenCalled();
  });

  it('clears the old link when permission is denied or the reminder cutoff has passed', async () => {
    const denied = setup({
      carry: { ...CARRY, reminderId: 'reminder-old' },
      permission: async () => false,
    });
    await expect(
      syncCarryReminder(denied.carry, denied.repository, denied.notifications, denied.now),
    ).resolves.toEqual({
      carry: { ...CARRY, reminderId: undefined },
      status: 'permission_denied',
    });
    expect(denied.cancel).toHaveBeenCalledWith('reminder-old');
    expect(denied.setReminderId).toHaveBeenCalledWith('carry-1', null);
    expect(denied.schedule).not.toHaveBeenCalled();

    const tooLate = setup({ carry: { ...CARRY, reminderId: 'reminder-old' } });
    tooLate.now.mockReturnValue(new Date(CARRY.scheduledAt.getTime() - 15 * 60 * 1000));
    await expect(
      syncCarryReminder(tooLate.carry, tooLate.repository, tooLate.notifications, tooLate.now),
    ).resolves.toEqual({
      carry: { ...CARRY, reminderId: undefined },
      status: 'too_late',
    });
    expect(tooLate.cancel).toHaveBeenCalledWith('reminder-old');
    expect(tooLate.setReminderId).toHaveBeenCalledWith('carry-1', null);
    expect(tooLate.schedule).not.toHaveBeenCalled();
  });
});
