import { Stack } from 'expo-router';

import { RequireMe, RequireSignedIn } from '@/components/shared/Guards';
import { colors } from '@/lib/theme/tokens';

export default function OnboardingLayout() {
  return (
    <RequireSignedIn>
      <RequireMe>
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}
        />
      </RequireMe>
    </RequireSignedIn>
  );
}
