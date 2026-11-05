import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { demoUrl } from '@/lib/linking/linkUrl';
import { colors } from '@/lib/theme/tokens';

/**
 * A QR code to show on a laptop or print: scanning it with any phone camera
 * opens the caregiver demo (/demo). On a preview deploy it points at that
 * preview. Open to everyone, signed in or not.
 */
export default function DemoQr() {
  const { t } = useTranslation('caregiver');
  const url = demoUrl();

  return (
    <Screen>
      <Text variant="title">{t('demo.qrTitle')}</Text>
      <Text>{t('demo.qrBody')}</Text>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('demo.qrLabel')}
        className="items-center self-center rounded-2xl bg-white p-6"
      >
        <QRCode value={url} size={280} color={colors.ink} backgroundColor={colors.white} />
      </View>
      <Text className="text-center" selectable>
        {url}
      </Text>
    </Screen>
  );
}
