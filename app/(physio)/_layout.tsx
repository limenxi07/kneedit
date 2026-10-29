import { Stack } from 'expo-router';
import { View } from 'react-native';

import { PhysioSidebar } from '@/components/physio/PhysioSidebar';
import { RequireRole } from '@/components/shared/Guards';
import { colors } from '@/lib/theme/tokens';

/**
 * The physio dashboard's desktop shell: a sidebar (Patients, Agenda,
 * Exercise library) beside the page. Below 1024px the sidebar becomes a row
 * of links across the top.
 */
export default function PhysioLayout() {
  return (
    <RequireRole role="physio">
      <View className="flex-1 bg-surface lg:flex-row">
        <PhysioSidebar />
        <View className="flex-1">
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
        </View>
      </View>
    </RequireRole>
  );
}
