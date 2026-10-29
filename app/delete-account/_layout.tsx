import { Stack } from 'expo-router';

import { colors } from '@/lib/theme/tokens';

export default function DeleteAccountLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}
    />
  );
}
