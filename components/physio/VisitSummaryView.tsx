import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PlusBadge } from '@/components/ui/PlusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SampleDataTag } from '@/components/ui/SampleDataTag';
import { Text } from '@/components/ui/Text';
import { formatDate, formatNumber, formatPercent } from '@/lib/i18n/format';
import { localized } from '@/lib/i18n/localized';
import { useLanguage } from '@/lib/i18n/useLanguage';
import type { VisitAdherence, VisitDetails, YesCount } from '@/lib/progress';
import { useExercises } from '@/lib/queries/programme';

type Props = {
  adherence: VisitAdherence;
  /** Null for a physio on Free, who sees adherence only. */
  details: VisitDetails | null;
  includesSampleData: boolean;
};

/** A visit summary: sessions counted of prescribed, then answers, form scores and notes. */
export function VisitSummaryView({ adherence, details, includesSampleData }: Props) {
  const { t } = useTranslation('physio');
  const { language } = useLanguage();
  const exercises = useExercises();
  const n = (value: number) => formatNumber(value, language);
  const day = (date: string) =>
    formatDate(new Date(`${date}T12:00:00+08:00`), language, { day: 'numeric', month: 'short' });
  const yes = (c: YesCount) =>
    c.answered === 0
      ? t('summary.noAnswers')
      : t('summary.yesOf', { yes: n(c.yes), answered: n(c.answered) });
  const score = (s: number | null) =>
    s === null ? t('summary.needsSleeve') : t('summary.score', { score: n(s) });

  return (
    <View className="gap-3">
      <Text>
        {t('summary.period', { from: day(adherence.periodStart), to: day(adherence.periodEnd) })}
      </Text>
      {includesSampleData ? <SampleDataTag /> : null}
      <Text variant="bodyStrong">
        {t('summary.counted', {
          counted: n(adherence.counted),
          prescribed: n(adherence.prescribed),
          rate: formatPercent(adherence.rate, language),
        })}
      </Text>
      <ProgressBar value={adherence.rate} label={t('summary.countedBar')} />

      <View className="flex-row flex-wrap items-center gap-2">
        <Text variant="bodyStrong">{t('summary.detailsTitle')}</Text>
        <PlusBadge />
      </View>
      {details ? (
        <View className="gap-2">
          <Text>{t('summary.hurt', { answer: yes(details.hurt) })}</Text>
          <Text>{t('summary.easy', { answer: yes(details.easy) })}</Text>
          <Text>{t('summary.averageScore', { score: score(details.averageFormScore) })}</Text>
          {details.byExercise.map((e) => (
            <View
              key={e.exerciseId}
              className="gap-1 rounded-2xl border border-primary bg-white p-3"
            >
              <Text variant="bodyStrong">
                {localized(exercises.data?.get(e.exerciseId)?.name, language) || e.exerciseId}
              </Text>
              <Text>
                {t('summary.exerciseLine', {
                  hurt: yes(e.hurt),
                  easy: yes(e.easy),
                  score: score(e.averageFormScore),
                })}
              </Text>
            </View>
          ))}
          <Text>
            {t('summary.notes', {
              count: details.noteIds.length,
              value: n(details.noteIds.length),
            })}
          </Text>
        </View>
      ) : (
        <Text>{t('summary.detailsPlus')}</Text>
      )}
    </View>
  );
}
