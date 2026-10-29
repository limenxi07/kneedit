import type { ReactNode } from 'react';

import { Card } from './Card';
import { Text } from './Text';

type Props = {
  children: ReactNode;
  /** `error` is announced by screen readers as soon as it appears. */
  tone?: 'info' | 'error' | 'success';
};

/** A short message in a card: an error, a confirmation or a tip. */
export function Notice({ children, tone = 'info' }: Props) {
  return (
    <Card
      tone={tone === 'error' ? 'pink' : 'primary'}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'info' ? 'none' : 'polite'}
    >
      <Text variant={tone === 'error' ? 'bodyStrong' : 'body'}>{children}</Text>
    </Card>
  );
}
