import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { codeFromScan } from '@/lib/linking/code';

type Props = {
  onCode: (code: string) => void;
  onClose: () => void;
};

/** Scans a Kneedit QR code with the camera. Typing the code always works too. */
export function QrScanner({ onCode, onClose }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View className="gap-3">
        <Notice>
          {permission.canAskAgain ? t('scan.permission') : t('scan.permissionDenied')}
        </Notice>
        {permission.canAskAgain ? (
          <Button label={t('scan.allowCamera')} onPress={() => void requestPermission()} />
        ) : null}
        <Button label={t('scan.typeInstead')} variant="secondary" onPress={onClose} />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text>{t('scan.instructions')}</Text>
      <View
        accessible
        accessibilityLabel={t('scan.cameraLabel')}
        className="aspect-square w-full overflow-hidden rounded-3xl border-4 border-secondary"
      >
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            const code = codeFromScan(data);
            if (!code || done.current) return;
            done.current = true;
            onCode(code);
          }}
        />
      </View>
      <Button label={t('scan.typeInstead')} variant="secondary" onPress={onClose} />
    </View>
  );
}

/** Whether this platform can scan. */
export const CAN_SCAN = true;
