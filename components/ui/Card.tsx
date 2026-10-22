import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

const TONES = {
  white: 'border border-primary bg-white',
  primary: 'bg-primary',
  pink: 'bg-pink',
} as const;

type Props = ViewProps & { tone?: keyof typeof TONES; className?: string };

export function Card({ tone = 'white', className, ...props }: Props) {
  return <View {...props} className={cn('gap-3 rounded-3xl p-5', TONES[tone], className)} />;
}
