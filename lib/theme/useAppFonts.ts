import { useFonts } from 'expo-font';

import { LATIN_FONTS } from './fonts';

/** True once the Latin fonts are ready (or failed, so the app still opens). */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(LATIN_FONTS);
  return loaded || error !== null;
}
