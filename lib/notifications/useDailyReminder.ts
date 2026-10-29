import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { useMe } from '@/lib/queries/me';

import {
  askReminderPermission,
  cancelDailyReminder,
  reminderPermission,
  scheduleDailyReminder,
  type ReminderPermission,
} from './reminder';

/** Set when the senior turns the reminder off on this phone. */
const OFF_KEY = 'kneedit.reminder.off';
const statusKey = ['reminder_status'] as const;

export type ReminderStatus = { permission: ReminderPermission; off: boolean };

/** Whether this phone may show the reminder, and whether the senior turned it off here. */
export function useReminderStatus() {
  return useQuery({
    queryKey: statusKey,
    queryFn: async (): Promise<ReminderStatus> => ({
      permission: await reminderPermission(),
      off: (await AsyncStorage.getItem(OFF_KEY)) === '1',
    }),
  });
}

/** Whether the reminder is scheduled on this phone. */
export function isReminderOn(status: ReminderStatus | undefined): boolean {
  return status?.permission === 'granted' && !status.off;
}

/**
 * Keeps the scheduled reminder in step with the senior's reminder time and
 * language. Mounted once, in the senior layout. Permission can change in the
 * phone's settings, so it is checked again whenever the app comes back.
 */
export function useReminderSync() {
  const { t, i18n } = useTranslation('notifications');
  const client = useQueryClient();
  const { data: me } = useMe();
  const { data: status } = useReminderStatus();
  const time = me?.senior?.reminder_time;
  const on = isReminderOn(status);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.invalidateQueries({ queryKey: statusKey });
    });
    return () => subscription.remove();
  }, [client]);

  useEffect(() => {
    if (!status || !time) return;
    const sync = on
      ? scheduleDailyReminder(time, {
          title: t('reminder.title'),
          body: t('reminder.body'),
          channelName: t('reminder.channel'),
        })
      : cancelDailyReminder();
    sync.catch((e: unknown) => console.warn('Could not update the daily reminder', e));
    // i18n.language: reschedule in the new language when it changes.
  }, [status, time, on, t, i18n.language]);
}

/** Asks for permission if needed, and clears "off" on this phone. */
export function useTurnOnReminder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(OFF_KEY);
      const current = await reminderPermission();
      return current === 'granted' ? current : askReminderPermission();
    },
    onSettled: () => client.invalidateQueries({ queryKey: statusKey }),
  });
}

export function useTurnOffReminder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await AsyncStorage.setItem(OFF_KEY, '1');
      await cancelDailyReminder();
    },
    onSettled: () => client.invalidateQueries({ queryKey: statusKey }),
  });
}
