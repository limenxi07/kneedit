import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { NotoSans_400Regular } from '@expo-google-fonts/noto-sans/400Regular';
import { NotoSans_500Medium } from '@expo-google-fonts/noto-sans/500Medium';
import { NotoSans_700Bold } from '@expo-google-fonts/noto-sans/700Bold';
import * as Font from 'expo-font';
import type { TextStyle } from 'react-native';

import type { Language } from '@/lib/i18n/languages';

/**
 * Native fonts. Figtree for headings, Noto Sans for body, Noto Sans SC for
 * Chinese. React Native has no per-glyph font fallback, so when Chinese is
 * active both roles switch to Noto Sans SC (which also covers Latin).
 * The web build uses CSS font stacks instead (fonts.web.ts).
 *
 * Import each weight from its subpath: the package index requires every
 * weight, which would bundle all nine Noto Sans SC files (about 90 MB).
 */

export type FontRole = 'heading' | 'body';
export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export const LATIN_FONTS = {
  Figtree_600SemiBold,
  Figtree_700Bold,
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_700Bold,
};

/** About 10 MB each, so they are only loaded once Chinese is chosen. */
async function loadCjkFonts(): Promise<void> {
  const [{ NotoSansSC_400Regular }, { NotoSansSC_700Bold }] = await Promise.all([
    import('@expo-google-fonts/noto-sans-sc/400Regular'),
    import('@expo-google-fonts/noto-sans-sc/700Bold'),
  ]);
  await Font.loadAsync({ NotoSansSC_400Regular, NotoSansSC_700Bold });
}

let cjkLoading: Promise<void> | null = null;

export async function ensureFontsFor(language: Language): Promise<void> {
  if (language !== 'zh-Hans') return;
  cjkLoading ??= loadCjkFonts().catch(() => {
    // Fall back to the system CJK font rather than blocking the app.
    cjkLoading = null;
  });
  await cjkLoading;
}

export function fontStyle(role: FontRole, weight: FontWeight, language: Language): TextStyle {
  if (language === 'zh-Hans' && Font.isLoaded('NotoSansSC_400Regular')) {
    const bold = role === 'heading' || weight !== 'regular';
    return { fontFamily: bold ? 'NotoSansSC_700Bold' : 'NotoSansSC_400Regular' };
  }
  if (role === 'heading') {
    return { fontFamily: weight === 'bold' ? 'Figtree_700Bold' : 'Figtree_600SemiBold' };
  }
  const body: Record<FontWeight, string> = {
    regular: 'NotoSans_400Regular',
    medium: 'NotoSans_500Medium',
    semibold: 'NotoSans_700Bold',
    bold: 'NotoSans_700Bold',
  };
  return { fontFamily: body[weight] };
}
