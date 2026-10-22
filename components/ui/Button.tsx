import { Pressable } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './Text';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  /** Describes the result when the label alone doesn't, for screen readers. */
  accessibilityHint?: string;
  /** Primary buttons are full width by default (brief section 8). */
  fullWidth?: boolean;
  className?: string;
};

const VARIANT_CLASSES = {
  primary: 'bg-ink',
  secondary: 'border-2 border-ink bg-white',
  danger: 'bg-danger',
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
  fullWidth = variant === 'primary',
  className,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'min-h-tap items-center justify-center rounded-2xl px-6 py-3 active:opacity-80',
        VARIANT_CLASSES[variant],
        fullWidth && 'w-full',
        disabled && 'opacity-50',
        className,
      )}
    >
      <Text
        variant="bodyStrong"
        tone={variant === 'secondary' ? 'ink' : 'onDark'}
        className="text-center"
      >
        {label}
      </Text>
    </Pressable>
  );
}
