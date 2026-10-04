import type { CarryStatus } from '../models/CarryStatus';

export function formatCarryStatus(status: CarryStatus): string {
  switch (status) {
    case 'upcoming':
      return 'Upcoming';
    case 'readyToReflect':
      return 'Ready to reflect';
    case 'completed':
      return 'Completed';
  }
}

/** Display the saved instant in local time without altering its UTC storage. */
export function formatSchedule(value: Date): string {
  return `${value.toLocaleDateString()} at ${value.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}
