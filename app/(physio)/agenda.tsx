import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { PhysioHeader } from '@/components/physio/PhysioHeader';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatDate, formatTime } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { localDate } from '@/lib/progress';
import { useAgenda, type AgendaVisit } from '@/lib/queries/physio';
import { errorKey } from '@/lib/supabase/errors';

/** Agenda: today's visits, then the rest of this week, each linking to the patient. */
export default function Agenda() {
  const { t } = useTranslation(['physio', 'common']);
  const { language } = useLanguage();
  const agenda = useAgenda();
  const today = localDate(new Date());
  const visits = agenda.data ?? [];
  const days = [...new Set(visits.map((v) => localDate(v.scheduled_at)))];
  const todays = visits.filter((v) => localDate(v.scheduled_at) === today);

  return (
    <Screen width="wide">
      <PhysioHeader />
      <Text variant="title">{t('agenda.title')}</Text>
      {agenda.isPending ? <Loading /> : null}
      {agenda.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(agenda.error)}`)}</Notice>
      ) : null}

      <View className="gap-3">
        <Text variant="heading">{t('agenda.today')}</Text>
        {agenda.isSuccess && todays.length === 0 ? <Text>{t('agenda.noneToday')}</Text> : null}
        {todays.map((v) => (
          <Item key={v.id} visit={v} />
        ))}
      </View>

      <View className="gap-3">
        <Text variant="heading">{t('agenda.week')}</Text>
        {agenda.isSuccess && days.filter((d) => d > today).length === 0 ? (
          <Text>{t('agenda.noneWeek')}</Text>
        ) : null}
        {days
          .filter((d) => d > today)
          .map((d) => (
            <View key={d} className="gap-2">
              <Text variant="subheading">
                {formatDate(new Date(`${d}T12:00:00+08:00`), language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              {visits
                .filter((v) => localDate(v.scheduled_at) === d)
                .map((v) => (
                  <Item key={v.id} visit={v} />
                ))}
            </View>
          ))}
      </View>
    </Screen>
  );
}

function Item({ visit }: { visit: AgendaVisit }) {
  const { t } = useTranslation('physio');
  const { language } = useLanguage();
  const time = formatTime(new Date(visit.scheduled_at), language);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t('agenda.itemLabel', { time, name: visit.patientName })}
      onPress={() => router.push({ pathname: '/patients/[id]', params: { id: visit.senior_id } })}
      className="active:opacity-80"
    >
      <Card className="lg:flex-row lg:items-center lg:gap-6">
        <Text variant="subheading">{time}</Text>
        <Text variant="bodyStrong">{visit.patientName}</Text>
        {visit.location ? <Text>{visit.location}</Text> : null}
      </Card>
    </Pressable>
  );
}
