import '../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { restoreLanguage } from '@/lib/i18n';
import { colors } from '@/lib/theme/tokens';
import { useAppFonts } from '@/lib/theme/useAppFonts';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsReady = useAppFonts();
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    void restoreLanguage().finally(() => setLanguageReady(true));
  }, []);

  const ready = fontsReady && languageReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}
      />
    </SafeAreaProvider>
  );
}
