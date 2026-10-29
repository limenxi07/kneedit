/** The web build (the physio dashboard) has no local reminders. */

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const REMINDERS_SUPPORTED = false;

export async function reminderPermission(): Promise<ReminderPermission> {
  return 'unsupported';
}

export async function askReminderPermission(): Promise<ReminderPermission> {
  return 'unsupported';
}

export async function scheduleDailyReminder(
  _time: string,
  _content: { title: string; body: string; channelName: string },
): Promise<void> {}

export async function cancelDailyReminder(): Promise<void> {}
