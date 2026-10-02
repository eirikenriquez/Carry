import type { Carry } from '../entities/Carry';
import type { CarryStatus } from '../entities/CarryStatus';

/**
 * Derive status from the scheduled time and whether a reflection exists.
 */
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
