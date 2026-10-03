import type { CarryRepository } from '../ports/CarryRepository';

export type DeleteUpcomingCarryResult =
  { readonly ok: true } | { readonly ok: false; readonly code: 'not_upcoming' | 'unavailable' };

/** Delete a Carry only while its stored state is still upcoming. */
export async function deleteUpcomingCarry(
  carryId: string,
  repository: CarryRepository,
  now: () => Date = () => new Date(),
): Promise<DeleteUpcomingCarryResult> {
  try {
    const result = await repository.delete(carryId, now);
    if (result.ok) return { ok: true };
    if (result.code === 'not_upcoming') return { ok: false, code: 'not_upcoming' };
  } catch {
    return { ok: false, code: 'unavailable' };
  }
  return { ok: false, code: 'unavailable' };
}
