import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import type { NamedLink } from '@/lib/queries/links';
import { useRespondToLink, useRevokeLink } from '@/lib/queries/links';
import { errorKey } from '@/lib/supabase/errors';

type Props = {
  link: NamedLink;
  /** The current physio, named when approving another one would replace them. */
  currentPhysio?: string;
};

/** A request to approve or decline, or a linked person to remove. */
export function CareTeamMember({ link, currentPhysio }: Props) {
  const { t } = useTranslation(['senior', 'common']);
  const respond = useRespondToLink();
  const revoke = useRevokeLink();
  const [confirming, setConfirming] = useState(false);
  const error = respond.error ?? revoke.error;
  const busy = respond.isPending || revoke.isPending;
  const name = link.name || t('linked.unnamed');

  if (link.status === 'pending') {
    return (
      <Card tone="pink">
        <Text variant="bodyStrong">{t(`linked.request.${link.role}`, { name })}</Text>
        <Text>{t(`linked.requestShares.${link.role}`)}</Text>
        {link.role === 'physio' && currentPhysio ? (
          <Text>{t('linked.replacesPhysio', { name: currentPhysio })}</Text>
        ) : null}
        {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}
        <Button
          label={t('linked.approve')}
          disabled={busy}
          onPress={() => respond.mutate({ linkId: link.id, accept: true })}
        />
        <Button
          label={t('linked.decline')}
          variant="secondary"
          fullWidth
          disabled={busy}
          onPress={() => respond.mutate({ linkId: link.id, accept: false })}
        />
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="bodyStrong">{name}</Text>
      <Text>{t(`linked.role.${link.role}`)}</Text>
      {error ? <Notice tone="error">{t(`common:errors.${errorKey(error)}`)}</Notice> : null}
      {confirming ? (
        <View className="gap-3">
          <Text>{t('linked.removeConfirm', { name })}</Text>
          <Button
            label={t('common:actions.cancel')}
            variant="secondary"
            fullWidth
            onPress={() => setConfirming(false)}
          />
          <Button
            label={t('linked.remove')}
            variant="danger"
            fullWidth
            disabled={busy}
            onPress={() => revoke.mutate(link.id)}
          />
        </View>
      ) : (
        <Button
          label={t('linked.remove')}
          variant="secondary"
          onPress={() => setConfirming(true)}
        />
      )}
    </Card>
  );
}
