import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

type Props = { onEnd: () => void; disabled?: boolean };

/** "End session early", which asks first. What is already done is kept. */
export function EndSessionEarly({ onEnd, disabled = false }: Props) {
  const { t } = useTranslation('senior');
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        label={t('session.endEarly')}
        variant="secondary"
        fullWidth
        disabled={disabled}
        accessibilityHint={t('session.endEarlyHint')}
        onPress={() => setConfirming(true)}
      />
    );
  }
  return (
    <Card>
      <Text variant="bodyStrong">{t('session.endEarlyConfirm')}</Text>
      <View className="gap-3">
        <Button label={t('session.keepGoing')} onPress={() => setConfirming(false)} />
        <Button
          label={t('session.endEarlyYes')}
          variant="secondary"
          fullWidth
          disabled={disabled}
          onPress={onEnd}
        />
      </View>
    </Card>
  );
}
