import { Stack } from 'expo-router';

import { RequireRole } from '@/components/shared/Guards';
import { colors } from '@/lib/theme/tokens';

export default function SeniorLayout() {
  return (
    <RequireRole role="senior">
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}
      />
    </RequireRole>
  );
}
