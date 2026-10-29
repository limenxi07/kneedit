import '../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth/AuthProvider';
import { restoreLanguage } from '@/lib/i18n';
import { queryClient } from '@/lib/queries/client';
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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
