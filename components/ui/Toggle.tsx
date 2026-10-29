import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './Text';

type Props = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /**
   * Shown above the row, such as a Plus badge. Kept outside the switch so
   * screen readers can reach it on its own.
   */
  badge?: ReactNode;
};

/** A whole-row switch: the label, the description and the switch all toggle it. */
export function Toggle({ label, description, value, onChange, disabled = false, badge }: Props) {
  return (
    <View>
      {badge}
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityHint={description}
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        onPress={() => onChange(!value)}
        className={cn(
          'min-h-tap flex-row items-center gap-4 py-2 active:opacity-80',
          disabled && 'opacity-50',
        )}
      >
        <View className="flex-1 gap-1">
          <Text variant="bodyStrong">{label}</Text>
          {description ? <Text>{description}</Text> : null}
        </View>
        <View
          className={cn(
            'h-9 w-16 justify-center rounded-full border-2 border-ink px-1',
            value ? 'items-end bg-ink' : 'items-start bg-white',
          )}
        >
          <View className={cn('h-6 w-6 rounded-full', value ? 'bg-white' : 'bg-ink')} />
        </View>
      </Pressable>
    </View>
  );
}
