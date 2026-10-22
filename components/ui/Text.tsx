import { Text as RNText, type TextProps } from 'react-native';

import { cn } from '@/lib/cn';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { fontStyle, type FontRole, type FontWeight } from '@/lib/theme/fonts';

type Variant = 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'small';

const VARIANTS: Record<
  Variant,
  { role: FontRole; weight: FontWeight; size: string; header?: boolean }
> = {
  title: { role: 'heading', weight: 'bold', size: 'text-3xl', header: true },
  heading: { role: 'heading', weight: 'bold', size: 'text-2xl', header: true },
  subheading: { role: 'heading', weight: 'semibold', size: 'text-xl', header: true },
  body: { role: 'body', weight: 'regular', size: 'text-base' },
  bodyStrong: { role: 'body', weight: 'bold', size: 'text-base' },
  small: { role: 'body', weight: 'regular', size: 'text-sm' },
};

type Props = TextProps & {
  variant?: Variant;
  /** Text is always ink, except on an ink- or danger-filled button. */
  tone?: 'ink' | 'onDark';
  className?: string;
};

/**
 * The only text component screens should use. It picks the font for the
 * active language, keeps every size at 16pt or more, and leaves system font
 * scaling on.
 */
export function Text({ variant = 'body', tone = 'ink', className, style, ...props }: Props) {
  const { language } = useLanguage();
  const v = VARIANTS[variant];
  return (
    <RNText
      accessibilityRole={v.header ? 'header' : undefined}
      {...props}
      className={cn(v.size, tone === 'ink' ? 'text-ink' : 'text-white', className)}
      style={[fontStyle(v.role, v.weight, language), style]}
    />
  );
}
