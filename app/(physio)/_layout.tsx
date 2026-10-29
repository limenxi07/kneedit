import { Stack } from 'expo-router';

import { RequireRole } from '@/components/shared/Guards';
import { colors } from '@/lib/theme/tokens';

/** The full desktop shell (sidebar, agenda, library) arrives in Phase 6. */
export default function PhysioLayout() {
  return (
    <RequireRole role="physio">
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}
      />
    </RequireRole>
  );
}
