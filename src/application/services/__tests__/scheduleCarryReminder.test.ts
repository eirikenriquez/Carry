import type { Carry } from '../../../domain/entities/Carry';
import type { CarryRepository, CarryRepositoryResult } from '../../ports/CarryRepository';
import type { NotificationService } from '../../ports/NotificationService';
import { scheduleCarryReminder } from '../scheduleCarryReminder';

const NOW = new Date('2026-10-02T12:00:00.000Z');
const carry: Carry = {
  id: 'carry-1',
  categoryId: 'work',
  situation: 'A difficult conversation',
  scheduledAt: new Date('2026-10-03T12:00:00.000Z'),
  passage: { startVerseKey: 'JAS.1.19', endVerseKey: 'JAS.1.20' },
  ifThenIntention: 'I will listen first.',
  createdAt: NOW,
};

function makeDependencies(
  stored: CarryRepositoryResult<boolean> = { ok: true, value: true },
  permitted = true,
) {
  const setReminderId = jest.fn(async () => stored);
  const repository = { setReminderId } as unknown as CarryRepository;
  const notifications: NotificationService = {
    requestPermission: jest.fn(async () => permitted),
    schedule: jest.fn(async () => 'notification-1'),
    cancel: jest.fn(async () => undefined),
  };
  return { repository, notifications, setReminderId };
}

describe('scheduleCarryReminder', () => {
  it('schedules and links the reminder, and cancels it if the link cannot be saved', async () => {
    const linked = makeDependencies();
    expect(
      await scheduleCarryReminder(carry, linked.repository, linked.notifications, () => NOW),
    ).toEqual({ status: 'scheduled', reminderId: 'notification-1' });
    expect(linked.notifications.schedule).toHaveBeenCalledWith(
      carry.id,
      new Date('2026-10-03T11:45:00.000Z'),
    );
    expect(linked.setReminderId).toHaveBeenCalledWith(carry.id, 'notification-1');
    expect(linked.notifications.cancel).not.toHaveBeenCalled();

    const { repository, notifications, setReminderId } = makeDependencies({
      ok: true,
      value: false,
    });
    const result = await scheduleCarryReminder(carry, repository, notifications, () => NOW);

    expect(result).toEqual({ status: 'failed' });
    expect(notifications.schedule).toHaveBeenCalledWith(
      carry.id,
      new Date('2026-10-03T11:45:00.000Z'),
    );
    expect(setReminderId).toHaveBeenCalledWith(carry.id, 'notification-1');
    expect(notifications.cancel).toHaveBeenCalledWith('notification-1');
  });

  it('does not request permission for a late reminder and rechecks after permission', async () => {
    const tooLateCarry = { ...carry, scheduledAt: new Date(NOW.getTime() + 15 * 60 * 1000) };
    const beforePermission = makeDependencies();
    expect(
      await scheduleCarryReminder(
        tooLateCarry,
        beforePermission.repository,
        beforePermission.notifications,
        () => NOW,
      ),
    ).toEqual({ status: 'too_late' });
    expect(beforePermission.notifications.requestPermission).not.toHaveBeenCalled();

    const afterPermission = makeDependencies();
    const now = jest
      .fn()
      .mockReturnValueOnce(NOW)
      .mockReturnValueOnce(new Date(carry.scheduledAt.getTime() - 15 * 60 * 1000));
    expect(
      await scheduleCarryReminder(
        carry,
        afterPermission.repository,
        afterPermission.notifications,
        now,
      ),
    ).toEqual({ status: 'too_late' });
    expect(afterPermission.notifications.requestPermission).toHaveBeenCalledTimes(1);
    expect(afterPermission.notifications.schedule).not.toHaveBeenCalled();

    const invalidClock = makeDependencies();
    expect(
      await scheduleCarryReminder(
        carry,
        invalidClock.repository,
        invalidClock.notifications,
        () => new Date(Number.NaN),
      ),
    ).toEqual({ status: 'failed' });
    expect(invalidClock.notifications.requestPermission).not.toHaveBeenCalled();
  });

  it('reports permission denial and scheduling failure without linking a reminder', async () => {
    const denied = makeDependencies({ ok: true, value: true }, false);
    expect(
      await scheduleCarryReminder(carry, denied.repository, denied.notifications, () => NOW),
    ).toEqual({
      status: 'permission_denied',
    });
    expect(denied.notifications.schedule).not.toHaveBeenCalled();
    expect(denied.setReminderId).not.toHaveBeenCalled();

    const schedulingFailed = makeDependencies();
    jest
      .mocked(schedulingFailed.notifications.schedule)
      .mockRejectedValue(new Error('Scheduling failed'));
    expect(
      await scheduleCarryReminder(
        carry,
        schedulingFailed.repository,
        schedulingFailed.notifications,
        () => NOW,
      ),
    ).toEqual({ status: 'failed' });
    expect(schedulingFailed.setReminderId).not.toHaveBeenCalled();
    expect(schedulingFailed.notifications.cancel).not.toHaveBeenCalled();
  });

  it('cancels a reminder after a failed link and reports failed cleanup', async () => {
    const writeFailed = makeDependencies();
    writeFailed.setReminderId.mockRejectedValue(new Error('Storage failed'));
    expect(
      await scheduleCarryReminder(
        carry,
        writeFailed.repository,
        writeFailed.notifications,
        () => NOW,
      ),
    ).toEqual({ status: 'failed' });
    expect(writeFailed.notifications.cancel).toHaveBeenCalledWith('notification-1');

    const cleanupFailed = makeDependencies({ ok: false, code: 'unavailable' });
    jest.mocked(cleanupFailed.notifications.cancel).mockRejectedValue(new Error('Cancel failed'));
    expect(
      await scheduleCarryReminder(
        carry,
        cleanupFailed.repository,
        cleanupFailed.notifications,
        () => NOW,
      ),
    ).toEqual({ status: 'cleanup_failed' });
  });
});
