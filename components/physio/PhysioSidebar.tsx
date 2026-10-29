import { Link, usePathname, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

const ITEMS = [
  { key: 'patients', href: '/patients' },
  { key: 'agenda', href: '/agenda' },
  { key: 'library', href: '/library' },
] as const satisfies readonly { key: string; href: Href }[];

/** Patients, Agenda and Exercise library. The current section is marked in words too. */
export function PhysioSidebar() {
  const { t } = useTranslation('physio');
  const path = usePathname();
  return (
    <View
      accessibilityRole="menu"
      accessibilityLabel={t('nav.label')}
      className="gap-2 border-b-2 border-primary bg-white px-4 py-3 lg:w-64 lg:border-b-0 lg:border-r-2 lg:py-8"
    >
      <Text variant="subheading" className="hidden lg:flex">
        {t('header.title')}
      </Text>
      <View className="flex-row flex-wrap gap-2 lg:flex-col">
        {ITEMS.map((item) => {
          const current = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link key={item.key} href={item.href} asChild>
              <Pressable
                accessibilityRole="menuitem"
                accessibilityLabel={t(`nav.${item.key}`)}
                accessibilityState={{ selected: current }}
                className={cn(
                  'min-h-tap justify-center rounded-2xl px-4 active:opacity-80',
                  current ? 'bg-ink' : 'bg-white',
                )}
              >
                <Text variant="bodyStrong" tone={current ? 'onDark' : 'ink'}>
                  {t(`nav.${item.key}`)}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}
