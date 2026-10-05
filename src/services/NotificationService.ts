/**
 * Defines the application-level notification service port.
 * It exposes permission, scheduling, and cancellation operations to reminder workflows.
 */
export interface NotificationService {
  requestPermission(): Promise<boolean>;
  schedule(carryId: string, reminderAt: Date): Promise<string>;
  cancel(reminderId: string): Promise<void>;
}
