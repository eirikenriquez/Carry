import type { CarryRepository, CarryRepositoryResult } from '../repositories/CarryRepository';
import type { Carry } from '../models/Carry';
import type { NotificationService } from './NotificationService';
import { deleteUpcomingCarry } from './deleteUpcomingCarry';

const upcoming: Carry = {
  id: 'carry-1',
  categoryId: 'work',
  situation: 'A difficult conversation',
  scheduledAt: new Date('2026-10-03T21:00:00.000Z'),
  passage: { startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.20' },
  ifThenIntention: 'I will listen first.',
  reminderId: 'stored-reminder',
  createdAt: new Date('2026-10-02T08:00:00.000Z'),
};

function makeNotifications(cancelImplementation = async () => undefined) {
  const requestPermission = jest.fn(async () => true);
  const schedule = jest.fn(async () => 'unused-reminder');
  const cancel = jest.fn(cancelImplementation);
  const service: NotificationService = { requestPermission, schedule, cancel };
  return { service, cancel };
}

describe('deleteUpcomingCarry', () => {
  it('deletes before cancelling the reminder from the canonical removed record', async () => {
    const now = jest.fn(() => new Date('2026-10-02T12:00:00.000Z'));
    const remove = jest.fn(async (): Promise<CarryRepositoryResult<Carry | null>> => ({
      ok: true,
      value: upcoming,
    }));
    const repository = { delete: remove } as unknown as CarryRepository;
    const notifications = makeNotifications();

    await expect(
      deleteUpcomingCarry('carry-1', repository, notifications.service, now),
    ).resolves.toEqual({ ok: true, reminderStatus: 'cancelled' });
    expect(remove).toHaveBeenCalledWith('carry-1', now);
    expect(notifications.cancel).toHaveBeenCalledWith('stored-reminder');
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(
      notifications.cancel.mock.invocationCallOrder[0],
    );
  });

  it('keeps deletion successful after cancellation failure and skips cancellation when no link exists', async () => {
    const repository = {
      delete: jest
        .fn()
        .mockResolvedValueOnce({ ok: true, value: upcoming })
        .mockResolvedValueOnce({ ok: true, value: { ...upcoming, reminderId: undefined } })
        .mockResolvedValueOnce({ ok: true, value: null }),
    } as unknown as CarryRepository;
    const notifications = makeNotifications(async () => {
      throw new Error('Notification service unavailable');
    });

    await expect(
      deleteUpcomingCarry('carry-1', repository, notifications.service),
    ).resolves.toEqual({
      ok: true,
      reminderStatus: 'cancel_failed',
    });
    await expect(
      deleteUpcomingCarry('carry-1', repository, notifications.service),
    ).resolves.toEqual({
      ok: true,
      reminderStatus: 'not_needed',
    });
    await expect(
      deleteUpcomingCarry('carry-1', repository, notifications.service),
    ).resolves.toEqual({
      ok: true,
      reminderStatus: 'not_needed',
    });
    expect(notifications.cancel).toHaveBeenCalledTimes(1);
  });
});
