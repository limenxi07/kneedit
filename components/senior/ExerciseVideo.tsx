import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { exerciseMediaUrl } from '@/lib/media';

type Props = {
  videoPath: string | null;
  /** The exercise name, for screen readers. */
  name: string;
  /** Paused while the senior takes a break. */
  paused: boolean;
};

/**
 * The exercise's demonstration video, muted and looping, with the player's
 * own controls. Some exercises have no video yet; the steps below it are
 * always there.
 */
export function ExerciseVideo({ videoPath, name, paused }: Props) {
  const { t } = useTranslation('senior');
  const url = exerciseMediaUrl(videoPath);
  if (!url) {
    return (
      <Card tone="primary">
        <Text>{t('session.noVideo')}</Text>
      </Card>
    );
  }
  return <Player key={url} url={url} name={name} paused={paused} />;
}

function Player({ url, name, paused }: { url: string; name: string; paused: boolean }) {
  const { t } = useTranslation('senior');
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);

  if (status === 'error') {
    return (
      <Card tone="primary">
        <Text>{t('session.videoUnavailable')}</Text>
      </Card>
    );
  }
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      accessibilityLabel={t('session.videoLabel', { name })}
      style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 24, overflow: 'hidden' }}
    />
  );
}
