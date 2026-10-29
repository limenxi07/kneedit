import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { formatDate } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useRevokeLink, type NamedLink } from '@/lib/queries/links';
import { errorKey } from '@/lib/supabase/errors';

/**
 * A request this caregiver or physio sent, waiting for the senior. It names
 * nobody: the senior's details stay private until they approve.
 */
export function PendingRequest({ link }: { link: NamedLink }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const revoke = useRevokeLink();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card tone="primary">
      <Text variant="bodyStrong">{t('pendingRequest.title')}</Text>
      <Text>
        {t('pendingRequest.sent', {
          date: formatDate(new Date(link.requested_at), language),
        })}
      </Text>
      {revoke.error ? <Notice tone="error">{t(`errors.${errorKey(revoke.error)}`)}</Notice> : null}
      {confirming ? (
        <View className="gap-3">
          <Text>{t('pendingRequest.cancelConfirm')}</Text>
          <Button
            label={t('actions.keep')}
            variant="secondary"
            fullWidth
            onPress={() => setConfirming(false)}
          />
          <Button
            label={t('pendingRequest.cancel')}
            disabled={revoke.isPending}
            onPress={() => revoke.mutate(link.id)}
          />
        </View>
      ) : (
        <Button
          label={t('pendingRequest.cancel')}
          variant="secondary"
          onPress={() => setConfirming(true)}
        />
      )}
    </Card>
  );
}
