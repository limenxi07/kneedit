import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { parseTimeOfDay } from './time';

/**
 * The daily exercise reminder, a local notification scheduled on the phone
 * (nothing leaves the device). The web build has no reminders: see
 * reminder.web.ts.
 *
 * The trigger uses the phone's clock, so the reminder fires at the stored
 * time wherever the phone is set; seniors are in Singapore for now.
 */

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const REMINDERS_SUPPORTED = true;

const REMINDER_ID = 'kneedit-daily-reminder';
const CHANNEL_ID = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function reminderPermission(): Promise<ReminderPermission> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function askReminderPermission(): Promise<ReminderPermission> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return status;
}

/** Replaces any earlier reminder with one every day at `time` ("HH:MM:SS"). */
export async function scheduleDailyReminder(
  time: string,
  content: { title: string; body: string; channelName: string },
): Promise<void> {
  const at = parseTimeOfDay(time);
  if (!at) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: content.channelName,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await cancelDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: content.title, body: content.body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: at.hour,
      minute: at.minute,
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
}
