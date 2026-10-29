import Tabs from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/Text';
import { colors, minTapTarget } from '@/lib/theme/tokens';

const TABS = ['today', 'friends', 'sleeve', 'profile'] as const;

/** Today, Friends, Sleeve and Profile. Labels only: large, translated text. */
export default function SeniorTabs() {
  const { t } = useTranslation('senior');
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.surface },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarActiveBackgroundColor: colors.primary,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.secondary,
          borderTopWidth: 2,
          minHeight: minTapTarget + 16,
        },
        tabBarItemStyle: { minHeight: minTapTarget, justifyContent: 'center' },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab}
          name={tab}
          options={{
            title: t(`tabs.${tab}`),
            tabBarAccessibilityLabel: t(`tabs.${tab}`),
            tabBarLabel: ({ focused }) => (
              <Text
                variant={focused ? 'bodyStrong' : 'body'}
                className={focused ? 'underline' : ''}
              >
                {t(`tabs.${tab}`)}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
