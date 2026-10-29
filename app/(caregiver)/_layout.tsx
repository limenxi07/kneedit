import { Stack } from 'expo-router';

import { RequireRole } from '@/components/shared/Guards';
import { colors } from '@/lib/theme/tokens';

export default function CaregiverLayout() {
  return (
    <RequireRole role="caregiver">
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}
      />
    </RequireRole>
  );
}
