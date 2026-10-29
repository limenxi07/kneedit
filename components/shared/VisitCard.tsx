import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { formatDate, formatTime } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import type { Visit } from '@/lib/queries/senior';

/** A visit with the physio: when, with whom, where. `children` adds actions. */
export function VisitCard({ visit, children }: { visit: Visit; children?: ReactNode }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const at = new Date(visit.scheduled_at);
  return (
    <Card tone={visit.status === 'scheduled' ? 'primary' : 'white'}>
      <Text variant="bodyStrong">
        {t('visits.when', {
          date: formatDate(at, language, { weekday: 'long', day: 'numeric', month: 'long' }),
          time: formatTime(at, language),
        })}
      </Text>
      <Text>
        {visit.physioName ? t('visits.with', { name: visit.physioName }) : t('visits.withFormer')}
      </Text>
      {visit.location ? <Text>{visit.location}</Text> : null}
      {visit.status === 'completed' ? <Text>{t('visits.completed')}</Text> : null}
      {children}
    </Card>
  );
}
