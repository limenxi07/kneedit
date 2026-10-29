import { Stack } from 'expo-router';

import { colors } from '@/lib/theme/tokens';

/**
 * The session flow. Swiping back is off so a stray swipe can't leave a
 * session; every screen has buttons to move on, take a break or end early.
 */
export default function SessionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    />
  );
}
