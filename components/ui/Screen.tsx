import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

type Props = {
  children: ReactNode;
  /**
   * Senior and caregiver screens are phone-first and stay phone-width on
   * the web. Physio screens use the full desktop width.
   */
  width?: 'phone' | 'wide';
};

export function Screen({ children, width = 'phone' }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName={cn(
        'w-full gap-4 self-center px-4',
        width === 'phone' ? 'max-w-[480px]' : 'max-w-[1280px]',
      )}
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }}
    >
      {children}
    </ScrollView>
  );
}
