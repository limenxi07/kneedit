import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './Text';

type Option<T extends string> = { value: T; label: string; description?: string };

type Props<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Wrap short options into rows instead of a full-width list. */
  layout?: 'list' | 'wrap';
};

/** Radio buttons as large tappable cards. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  layout = 'list',
}: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="gap-2">
      <Text variant="bodyStrong">{label}</Text>
      <View className={cn('gap-3', layout === 'wrap' && 'flex-row flex-wrap')}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityHint={o.description}
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(o.value)}
              className={cn(
                'min-h-tap justify-center gap-1 rounded-2xl border-2 border-ink px-4 py-3 active:opacity-80',
                selected ? 'bg-ink' : 'bg-white',
                layout === 'wrap' && 'min-w-[30%] grow items-center',
              )}
            >
              <Text variant="bodyStrong" tone={selected ? 'onDark' : 'ink'}>
                {o.label}
              </Text>
              {o.description ? (
                <Text tone={selected ? 'onDark' : 'ink'}>{o.description}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
