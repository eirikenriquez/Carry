/** Keep notification scheduling behind an application-level port. */
export interface NotificationService {
  requestPermission(): Promise<boolean>;
  schedule(carryId: string, reminderAt: Date): Promise<string>;
  cancel(reminderId: string): Promise<void>;
}
