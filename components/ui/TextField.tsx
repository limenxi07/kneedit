import { TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/lib/cn';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { colors, fontSize } from '@/lib/theme/tokens';
import { fontStyle } from '@/lib/theme/fonts';

import { Text } from './Text';

type Props = Omit<TextInputProps, 'style' | 'className'> & {
  label: string;
  /** Shown under the label, and read with it. */
  hint?: string;
  /** Large, spaced characters, for codes. */
  large?: boolean;
};

/** A labelled text input at body size, with a 56pt touch target. */
export function TextField({ label, hint, large = false, ...props }: Props) {
  const { language } = useLanguage();
  return (
    <View className="gap-1">
      <Text variant="bodyStrong">{label}</Text>
      {hint ? <Text>{hint}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.ink}
        {...props}
        className={cn(
          'min-h-tap rounded-2xl border-2 border-secondary bg-white px-4 py-3 text-ink',
          large && 'text-center',
        )}
        style={[
          fontStyle('body', large ? 'bold' : 'regular', language),
          large ? { fontSize: fontSize['2xl'], letterSpacing: 4 } : { fontSize: fontSize.base },
        ]}
      />
    </View>
  );
}
