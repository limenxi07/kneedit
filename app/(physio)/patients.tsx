import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PhysioHeader } from '@/components/physio/PhysioHeader';
import { PendingRequest } from '@/components/shared/PendingRequest';
import { RedeemCodeForm } from '@/components/shared/RedeemCodeForm';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMyLinksAsMember } from '@/lib/queries/links';
import { errorKey } from '@/lib/supabase/errors';

/**
 * Patients. For now: the linked patients, requests waiting for approval,
 * and adding a patient by their code. Search, flags and the patient page
 * arrive in Phase 6.
 */
export default function Patients() {
  const { t } = useTranslation(['physio', 'common']);
  const links = useMyLinksAsMember('physio');
  const [sent, setSent] = useState(false);
  const active = links.data?.filter((l) => l.status === 'active') ?? [];
  const pending = links.data?.filter((l) => l.status === 'pending') ?? [];

  return (
    <Screen width="wide">
      <PhysioHeader />
      <View className="gap-6 lg:flex-row">
        <View className="gap-4 lg:flex-[2]">
          <Text variant="title">{t('patients.title')}</Text>
          {links.isPending ? <Loading /> : null}
          {links.error ? (
            <Notice tone="error">{t(`common:errors.${errorKey(links.error)}`)}</Notice>
          ) : null}
          {links.isSuccess && active.length === 0 ? (
            <Card>
              <Text variant="subheading">{t('patients.emptyTitle')}</Text>
              <Text>{t('patients.emptyBody')}</Text>
            </Card>
          ) : null}
          {active.map((l) => (
            <Card key={l.id}>
              <Text variant="subheading">{l.name}</Text>
            </Card>
          ))}
          {pending.length > 0 ? <Text variant="heading">{t('patients.pendingTitle')}</Text> : null}
          {pending.map((l) => (
            <PendingRequest key={l.id} link={l} />
          ))}
        </View>

        <Card className="lg:flex-1 lg:self-start">
          <Text variant="subheading">{t('patients.addTitle')}</Text>
          <Text>{t('patients.addBody')}</Text>
          {sent ? <Notice tone="success">{t('patients.sent')}</Notice> : null}
          <RedeemCodeForm role="physio" onSent={() => setSent(true)} />
        </Card>
      </View>
    </Screen>
  );
}
