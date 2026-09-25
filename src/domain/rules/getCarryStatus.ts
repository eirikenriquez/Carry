import type { Carry } from '../entities/Carry';
import type { CarryStatus } from '../entities/CarryStatus';

export function getCarryStatus(carry: Carry, now: Date): CarryStatus {
  if (carry.reflection) {
    return 'completed';
  }

  return now.getTime() >= carry.scheduledAt.getTime() ? 'readyToReflect' : 'upcoming';
}
