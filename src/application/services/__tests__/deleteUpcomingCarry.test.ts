import type { CarryRepository, CarryRepositoryResult } from '../../ports/CarryRepository';
import { deleteUpcomingCarry } from '../deleteUpcomingCarry';

describe('deleteUpcomingCarry', () => {
  it('deletes through the repository with the supplied clock', async () => {
    const now = jest.fn(() => new Date('2026-10-02T12:00:00.000Z'));
    const remove = jest.fn(async (): Promise<CarryRepositoryResult<void>> => ({
      ok: true,
      value: undefined,
    }));
    const repository = { delete: remove } as unknown as CarryRepository;

    await expect(deleteUpcomingCarry('carry-1', repository, now)).resolves.toEqual({ ok: true });
    expect(remove).toHaveBeenCalledWith('carry-1', now);
  });

  it('reports a Carry that is no longer upcoming', async () => {
    const repository = {
      delete: jest.fn(async () => ({ ok: false as const, code: 'not_upcoming' as const })),
    } as unknown as CarryRepository;

    await expect(deleteUpcomingCarry('carry-1', repository)).resolves.toEqual({
      ok: false,
      code: 'not_upcoming',
    });
  });

  it('converts repository failures and exceptions to unavailable', async () => {
    const repository = {
      delete: jest
        .fn()
        .mockResolvedValueOnce({ ok: false, code: 'unavailable' })
        .mockRejectedValueOnce(new Error('Storage closed')),
    } as unknown as CarryRepository;

    await expect(deleteUpcomingCarry('carry-1', repository)).resolves.toEqual({
      ok: false,
      code: 'unavailable',
    });
    await expect(deleteUpcomingCarry('carry-1', repository)).resolves.toEqual({
      ok: false,
      code: 'unavailable',
    });
  });
});
