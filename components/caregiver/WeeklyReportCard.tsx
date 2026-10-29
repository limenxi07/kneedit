import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SampleDataTag } from '@/components/ui/SampleDataTag';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber, formatPercent } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import type { DayStatus, WeeklyReport } from '@/lib/progress';

const DAY_TONE: Record<DayStatus, string> = {
  done: 'bg-primary border-secondary',
  partial: 'bg-white border-secondary',
  missed: 'bg-pink border-mauve',
  rest: 'bg-white border-primary',
  upcoming: 'bg-white border-primary',
};

/**
 * One week, Monday to Sunday: what was done of what was prescribed, the %,
 * average daily steps and anything flagged. Every day's status is in words,
 * not only colour.
 */
export function WeeklyReportCard({ title, report }: { title: string; report: WeeklyReport }) {
  const { t } = useTranslation('caregiver');
  const { language } = useLanguage();
  const n = (value: number) => formatNumber(value, language);
  const { flags } = report;

  return (
    <Card>
      <Text variant="subheading">{title}</Text>
      <Text>
        {t('report.range', {
          from: formatDate(new Date(`${report.weekStart}T12:00:00+08:00`), language, {
            day: 'numeric',
            month: 'short',
          }),
          to: formatDate(new Date(`${report.days.at(-1)?.date}T12:00:00+08:00`), language, {
            day: 'numeric',
            month: 'short',
          }),
        })}
      </Text>
      {report.includesSampleData ? <SampleDataTag /> : null}

      <View className="flex-row flex-wrap gap-2">
        {report.days.map((d) => {
          const day = formatDate(new Date(`${d.date}T12:00:00+08:00`), language, {
            weekday: 'short',
          });
          const status = t(`report.status.${d.status}`);
          return (
            <View
              key={d.date}
              accessible
              accessibilityLabel={t('report.dayLabel', { day, status })}
              className={cn(
                'min-w-[72px] grow items-center gap-1 rounded-2xl border-2 px-2 py-2',
                DAY_TONE[d.status],
              )}
            >
              <Text variant="bodyStrong">{day}</Text>
              <Text variant="small">{status}</Text>
            </View>
          );
        })}
      </View>

      <Text variant="bodyStrong">
        {t('report.done', {
          done: n(report.done),
          prescribed: n(report.prescribed),
          rate: formatPercent(report.rate, language),
        })}
      </Text>
      <ProgressBar value={report.rate} label={t('report.doneBar')} />
      <Text>
        {report.averageDailySteps === null
          ? t('report.noSteps')
          : t('report.steps', { value: n(report.averageDailySteps) })}
      </Text>

      <View className="gap-1">
        <Text variant="bodyStrong">{t('report.flagsTitle')}</Text>
        {flags.painReports + flags.possibleFalls + flags.missedDays === 0 ? (
          <Text>{t('report.noFlags')}</Text>
        ) : null}
        {flags.painReports > 0 ? (
          <Text>{t('report.pain', { count: flags.painReports, value: n(flags.painReports) })}</Text>
        ) : null}
        {flags.possibleFalls > 0 ? (
          <Text>
            {t('report.falls', { count: flags.possibleFalls, value: n(flags.possibleFalls) })}
          </Text>
        ) : null}
        {flags.missedDays > 0 ? (
          <Text>{t('report.missed', { count: flags.missedDays, value: n(flags.missedDays) })}</Text>
        ) : null}
      </View>
    </Card>
  );
}
