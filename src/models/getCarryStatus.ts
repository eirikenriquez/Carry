/**
 * Defines Carry status derivation from schedule and reflection data.
 * It reports whether a Carry is upcoming, ready to reflect, or completed.
 */
import type { Carry } from './Carry';
import type { CarryStatus } from './CarryStatus';

export function getCarryStatus(carry: Carry, now: Date): CarryStatus {
  const currentTimestamp = now.getTime();
  const scheduledTimestamp = carry.scheduledAt.getTime();
  if (Number.isNaN(currentTimestamp) || Number.isNaN(scheduledTimestamp)) {
    throw new RangeError('Current and scheduled times must be valid dates.');
  }

  if (carry.reflection) {
    return 'completed';
  }

  return currentTimestamp >= scheduledTimestamp ? 'readyToReflect' : 'upcoming';
}
