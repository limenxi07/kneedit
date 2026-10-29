import { Stack } from 'expo-router';

import { RequireRole } from '@/components/shared/Guards';
import { useReminderSync } from '@/lib/notifications/useDailyReminder';
import { colors } from '@/lib/theme/tokens';

export default function SeniorLayout() {
  return (
    <RequireRole role="senior">
      <ReminderSync />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}
      />
    </RequireRole>
  );
}

/** Keeps the daily reminder on this phone in step with the senior's settings. */
function ReminderSync() {
  useReminderSync();
  return null;
}
