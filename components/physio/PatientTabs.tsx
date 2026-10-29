import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { BackButton } from '@/components/ui/BackButton';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

export type PatientTab = 'overview' | 'visits' | 'programme' | 'details';
const TABS: PatientTab[] = ['overview', 'visits', 'programme', 'details'];

const HREF = {
  overview: '/patients/[id]',
  visits: '/patients/[id]/visits',
  programme: '/patients/[id]/programme',
  details: '/patients/[id]/details',
} as const;

/** The patient's name and the four tabs of the patient page. */
export function PatientTabs({
  id,
  name,
  current,
}: {
  id: string;
  name: string;
  current: PatientTab;
}) {
  const { t } = useTranslation('physio');
  return (
    <View className="gap-3">
      <BackButton fallback="/patients" />
      <Text variant="title">{name}</Text>
      <View
        accessibilityRole="tablist"
        className="flex-row flex-wrap gap-2 border-b-2 border-primary pb-3"
      >
        {TABS.map((tab) => {
          const selected = tab === current;
          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityLabel={t(`patient.tabs.${tab}`)}
              accessibilityState={{ selected }}
              onPress={() => router.replace({ pathname: HREF[tab], params: { id } })}
              className={cn(
                'min-h-tap justify-center rounded-2xl border-2 border-ink px-5 active:opacity-80',
                selected ? 'bg-ink' : 'bg-white',
              )}
            >
              <Text variant="bodyStrong" tone={selected ? 'onDark' : 'ink'}>
                {t(`patient.tabs.${tab}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
