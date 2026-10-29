import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { KneeAngleChart } from '@/components/senior/KneeAngleChart';
import { Card } from '@/components/ui/Card';
import { SampleDataTag } from '@/components/ui/SampleDataTag';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatNumber, formatPercent, formatTime } from '@/lib/i18n/format';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { localDate } from '@/lib/progress';
import { useSleeveTabSource } from '@/lib/session/useSleeveSource';
import type { DailyActivity, LiveSignal, SleeveSource } from '@/lib/sleeve';

/** How many recent readings the chart shows. */
const HISTORY = 40;

/**
 * The sleeve. Demo accounts see sample signals, tagged "Sample data"; every
 * other account sees "No sleeve connected" until the real sleeve plugs in
 * through SleeveSource.
 */
export default function Sleeve() {
  const { t } = useTranslation('senior');
  const source = useSleeveTabSource();
  return (
    <Screen>
      <Text variant="title">{t('sleeve.title')}</Text>
      {source.kind === 'manual' ? (
        <Card>
          <Text variant="subheading">{t('sleeve.noneTitle')}</Text>
          <Text>{t('sleeve.noneBody')}</Text>
        </Card>
      ) : (
        <SampleSleeve source={source} />
      )}
    </Screen>
  );
}

function SampleSleeve({ source }: { source: SleeveSource }) {
  const { t } = useTranslation('senior');
  const { language } = useLanguage();
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [activity, setActivity] = useState<DailyActivity | null>(null);
  const device = source.device();
  const n = (value: number) => formatNumber(value, language);

  // Signals only flow while this tab is showing.
  useFocusEffect(
    useCallback(() => {
      void source.getDailyActivity(localDate(new Date())).then(setActivity);
      return source.subscribeLiveSignals((s) =>
        setSignals((previous) => [...previous.slice(-(HISTORY - 1)), s]),
      );
    }, [source]),
  );

  const latest = signals.at(-1);

  return (
    <>
      <SampleDataTag />
      <Text>{t('sleeve.sampleIntro')}</Text>

      {device ? (
        <Card>
          <Text variant="subheading">{t(`sleeve.knee.${device.knee}`)}</Text>
          <Text>{t('sleeve.battery', { value: formatPercent(device.batteryPct, language) })}</Text>
          <Text>{t(device.worn ? 'sleeve.worn' : 'sleeve.notWorn')}</Text>
          {device.lastSyncAt ? (
            <Text>
              {t('sleeve.lastSync', { time: formatTime(new Date(device.lastSyncAt), language) })}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Text variant="subheading">{t('sleeve.angleTitle')}</Text>
        <View accessibilityLiveRegion="none">
          <Text variant="heading">
            {latest ? t('sleeve.angle', { value: n(latest.kneeAngleDeg) }) : t('sleeve.waiting')}
          </Text>
        </View>
        <KneeAngleChart angles={signals.map((s) => s.kneeAngleDeg)} />
        <Text>{t('sleeve.angleBody')}</Text>
        {source.capabilities.heartRate && latest?.heartRateBpm ? (
          <Text variant="bodyStrong">
            {t('sleeve.heartRate', { value: n(latest.heartRateBpm) })}
          </Text>
        ) : null}
      </Card>

      {activity ? (
        <Card>
          <Text variant="subheading">{t('sleeve.todayTitle')}</Text>
          <Text variant="bodyStrong">{t('sleeve.steps', { value: n(activity.steps) })}</Text>
          <Text>{t('sleeve.walking', { value: n(activity.walkingMinutes) })}</Text>
        </Card>
      ) : null}
    </>
  );
}
