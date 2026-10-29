import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SampleDataTag } from '@/components/ui/SampleDataTag';
import { Text } from '@/components/ui/Text';
import { formatNumber, formatPercent } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import type { LeaderboardEntry } from '@/lib/progress';
import type { Tables } from '@/lib/supabase/client';

type Props = {
  stats: Tables<'senior_stats'> | null | undefined;
  /** The friends' leaderboard, sorted, including the senior. */
  leaderboard?: readonly LeaderboardEntry[];
};

/** This week's sessions and %, the streak, and the place on the friends' leaderboard. */
export function WeekProgress({ stats, leaderboard }: Props) {
  const { t } = useTranslation('senior');
  const { language } = useLanguage();
  if (!stats) return null;

  const rank = leaderboard ? leaderboard.findIndex((e) => e.isMe) + 1 : 0;
  const n = (value: number) => formatNumber(value, language);

  return (
    <Card>
      <Text variant="subheading">{t('progress.weekTitle')}</Text>
      {stats.includes_sample_data ? <SampleDataTag /> : null}
      <Text variant="bodyStrong">
        {t('progress.week', {
          done: n(stats.week_done),
          prescribed: n(stats.week_prescribed),
          rate: formatPercent(stats.week_rate, language),
        })}
      </Text>
      <ProgressBar value={stats.week_rate} label={t('progress.weekBar')} />
      <View className="gap-1">
        <Text>{t('progress.streak', { count: stats.streak, value: n(stats.streak) })}</Text>
        {leaderboard && leaderboard.length > 1 && rank > 0 ? (
          <Text>{t('progress.rank', { rank: n(rank), total: n(leaderboard.length) })}</Text>
        ) : null}
      </View>
    </Card>
  );
}
