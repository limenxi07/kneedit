import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PatientTabs } from '@/components/physio/PatientTabs';
import { PhysioHeader } from '@/components/physio/PhysioHeader';
import { VisitSummaryView } from '@/components/physio/VisitSummaryView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Notice } from '@/components/ui/Notice';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { isPast, parseSingaporeDateTime } from '@/lib/calendar/dateTime';
import { buildIcs } from '@/lib/calendar/ics';
import { saveIcs } from '@/lib/calendar/saveIcs';
import { formatDate, formatNumber, formatTime } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { addDays, localDate } from '@/lib/progress';
import {
  useCancelVisit,
  useCompleteVisit,
  useGenerateSummary,
  usePatient,
  usePatientVisits,
  useScheduleVisit,
  type PhysioVisit,
} from '@/lib/queries/physio';
import { errorKey } from '@/lib/supabase/errors';

/**
 * Visits: book the next one (it shows in the senior's and the family's
 * calendar), mark one as done, or record one that just happened. A done
 * visit gets its summary.
 */
export default function PatientVisits() {
  const { t } = useTranslation(['physio', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const patient = usePatient(id);
  const visits = usePatientVisits(id);
  const complete = useCompleteVisit(id);
  const name = patient.data?.name ?? '';
  const all = visits.data ?? [];
  const upcoming = all.filter((v) => v.status === 'scheduled').reverse();
  const done = all.filter((v) => v.status === 'completed');

  return (
    <Screen width="wide">
      <PhysioHeader />
      <PatientTabs id={id} name={name} current="visits" />
      {visits.isPending ? <Loading /> : null}
      {visits.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(visits.error)}`)}</Notice>
      ) : null}

      <View className="gap-6 lg:flex-row">
        <View className="gap-4 lg:flex-[3]">
          <Text variant="heading">{t('visits.upcomingTitle')}</Text>
          {visits.isSuccess && upcoming.length === 0 ? (
            <Text>{t('visits.noneUpcoming')}</Text>
          ) : null}
          {upcoming.map((v) => (
            <Upcoming key={v.id} visit={v} name={name} />
          ))}

          <Text variant="heading">{t('visits.pastTitle')}</Text>
          {visits.isSuccess && done.length === 0 ? <Text>{t('visits.nonePast')}</Text> : null}
          {done.map((v) => (
            <Past key={v.id} visit={v} />
          ))}
        </View>

        <View className="gap-4 lg:flex-[2]">
          <Schedule seniorId={id} />
          <Card>
            <Text variant="subheading">{t('visits.recordTitle')}</Text>
            <Text>{t('visits.recordBody')}</Text>
            {complete.error ? (
              <Notice tone="error">{t(`common:errors.${errorKey(complete.error)}`)}</Notice>
            ) : null}
            {complete.isSuccess ? <Notice tone="success">{t('visits.recorded')}</Notice> : null}
            <Button
              label={complete.isPending ? t('common:status.saving') : t('visits.record')}
              variant="secondary"
              fullWidth
              disabled={complete.isPending}
              onPress={() => complete.mutate(null)}
            />
          </Card>
        </View>
      </View>
    </Screen>
  );
}

function When({ visit }: { visit: PhysioVisit }) {
  const { t } = useTranslation(['physio', 'common']);
  const { language } = useLanguage();
  const at = new Date(visit.scheduled_at);
  return (
    <>
      <Text variant="bodyStrong">
        {t('common:visits.when', {
          date: formatDate(at, language, { weekday: 'long', day: 'numeric', month: 'long' }),
          time: formatTime(at, language),
        })}
      </Text>
      <Text>
        {t('visits.length', {
          count: visit.duration_min,
          value: formatNumber(visit.duration_min, language),
        })}
      </Text>
      {visit.location ? <Text>{visit.location}</Text> : null}
    </>
  );
}

function Upcoming({ visit, name }: { visit: PhysioVisit; name: string }) {
  const { t } = useTranslation(['physio', 'common']);
  const complete = useCompleteVisit(visit.senior_id);
  const cancel = useCancelVisit(visit.senior_id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const busy = complete.isPending || cancel.isPending;
  const shown = error ?? complete.error ?? cancel.error;

  const addToCalendar = () => {
    setError(null);
    const ics = buildIcs({
      uid: visit.id,
      start: new Date(visit.scheduled_at),
      durationMin: visit.duration_min,
      title: t('visits.calendarTitle', { name }),
      location: visit.location,
    });
    saveIcs(
      `kneedit-visit-${visit.scheduled_at.slice(0, 10)}.ics`,
      ics,
      t('visits.addToCalendar'),
    ).catch((e: unknown) => setError(e));
  };

  return (
    <Card tone="primary">
      <When visit={visit} />
      {shown ? <Notice tone="error">{t(`common:errors.${errorKey(shown)}`)}</Notice> : null}
      <View className="flex-row flex-wrap gap-3">
        <Button
          label={complete.isPending ? t('common:status.saving') : t('visits.markDone')}
          disabled={busy}
          fullWidth={false}
          onPress={() => complete.mutate(visit.id)}
        />
        <Button label={t('visits.addToCalendar')} variant="secondary" onPress={addToCalendar} />
        {confirmCancel ? (
          <>
            <Button
              label={t('visits.keep')}
              variant="secondary"
              onPress={() => setConfirmCancel(false)}
            />
            <Button
              label={t('visits.cancelYes')}
              variant="danger"
              disabled={busy}
              onPress={() => cancel.mutate(visit.id)}
            />
          </>
        ) : (
          <Button
            label={t('visits.cancel')}
            variant="secondary"
            onPress={() => setConfirmCancel(true)}
          />
        )}
      </View>
    </Card>
  );
}

function Past({ visit }: { visit: PhysioVisit }) {
  const { t } = useTranslation(['physio', 'common']);
  const generate = useGenerateSummary(visit.senior_id);
  return (
    <Card>
      <When visit={visit} />
      {visit.adherence ? (
        <VisitSummaryView
          adherence={visit.adherence}
          details={visit.details}
          includesSampleData={visit.includesSampleData}
        />
      ) : (
        <>
          <Text>{t('visits.noSummary')}</Text>
          {generate.error ? (
            <Notice tone="error">{t(`common:errors.${errorKey(generate.error)}`)}</Notice>
          ) : null}
          <Button
            label={generate.isPending ? t('common:status.saving') : t('visits.generate')}
            variant="secondary"
            disabled={generate.isPending}
            onPress={() => generate.mutate(visit.id)}
          />
        </>
      )}
    </Card>
  );
}

const DURATIONS = ['30', '45', '60'];

function Schedule({ seniorId }: { seniorId: string }) {
  const { t } = useTranslation(['physio', 'common']);
  const schedule = useScheduleVisit(seniorId);
  const [date, setDate] = useState(addDays(localDate(new Date()), 7));
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('30');
  const [location, setLocation] = useState('');
  const at = parseSingaporeDateTime(date, time);
  const minutes = Number(duration);
  const durationOk = Number.isInteger(minutes) && minutes >= 5 && minutes <= 480;
  const inPast = at !== null && isPast(at);
  const touch = () => schedule.reset();

  return (
    <Card>
      <Text variant="subheading">{t('visits.scheduleTitle')}</Text>
      <Text>{t('visits.scheduleBody')}</Text>
      <TextField
        label={t('visits.date')}
        hint={t('visits.dateHint')}
        value={date}
        onChangeText={(v) => {
          setDate(v);
          touch();
        }}
        autoCorrect={false}
      />
      <TextField
        label={t('visits.time')}
        hint={t('visits.timeHint')}
        value={time}
        onChangeText={(v) => {
          setTime(v);
          touch();
        }}
        autoCorrect={false}
      />
      <TextField
        label={t('visits.duration')}
        hint={t('visits.durationHint', { options: DURATIONS.join(', ') })}
        value={duration}
        onChangeText={(v) => {
          setDuration(v.replace(/\D/g, ''));
          touch();
        }}
        inputMode="numeric"
      />
      <TextField
        label={t('visits.location')}
        value={location}
        onChangeText={(v) => {
          setLocation(v);
          touch();
        }}
        maxLength={200}
      />
      {at === null ? <Notice tone="error">{t('visits.invalidDateTime')}</Notice> : null}
      {inPast ? <Notice tone="error">{t('visits.inPast')}</Notice> : null}
      {!durationOk ? <Notice tone="error">{t('visits.invalidDuration')}</Notice> : null}
      {schedule.error ? (
        <Notice tone="error">{t(`common:errors.${errorKey(schedule.error)}`)}</Notice>
      ) : null}
      {schedule.isSuccess ? <Notice tone="success">{t('visits.booked')}</Notice> : null}
      <Button
        label={schedule.isPending ? t('common:status.saving') : t('visits.book')}
        disabled={!at || inPast || !durationOk || schedule.isPending}
        onPress={() => at && schedule.mutate({ at, durationMin: minutes, location })}
      />
    </Card>
  );
}
