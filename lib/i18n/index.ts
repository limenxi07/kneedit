import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';

import { ensureFontsFor } from '@/lib/theme/fonts';

import { DEFAULT_LANGUAGE, isLanguage, matchLanguage, type Language } from './languages';
import { DEFAULT_NAMESPACE, NAMESPACES, resources } from './resources';

const STORAGE_KEY = 'kneedit.language';

export function deviceLanguage(): Language {
  return matchLanguage(getLocales()[0]?.languageTag);
}

// Resources are bundled, so init is synchronous and the first render already
// has strings. The device language is used until the saved choice (if any)
// is restored by restoreLanguage().
void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: Object.keys(resources),
  ns: NAMESPACES,
  defaultNS: DEFAULT_NAMESPACE,
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const setLang = (lng: string) => document.documentElement.setAttribute('lang', lng);
  setLang(i18n.language);
  i18n.on('languageChanged', setLang);
}

/** Apply the language the user picked earlier, if there is one. */
export async function restoreLanguage(): Promise<void> {
  let saved: string | null = null;
  try {
    saved = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private browsing); the device language stands.
  }
  const language = isLanguage(saved) ? saved : matchLanguage(i18n.language);
  await ensureFontsFor(language);
  if (language !== i18n.language) await i18n.changeLanguage(language);
}

/** Switch language now and remember the choice on this device. */
export async function setLanguage(language: Language): Promise<void> {
  // Load the CJK font first so the switch doesn't flash in a fallback font.
  await ensureFontsFor(language);
  await i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not fatal: the choice just won't survive a restart.
  }
}

export default i18n;
