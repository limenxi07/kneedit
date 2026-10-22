import type { TextStyle } from 'react-native';

import type { Language } from '@/lib/i18n/languages';

import type { FontRole, FontWeight } from './fonts';

export type { FontRole, FontWeight } from './fonts';

/**
 * Web fonts come from Google Fonts, which splits Noto Sans SC into small
 * unicode-range files so the browser only downloads the characters a page
 * uses. CSS stacks give the per-glyph fallback that native lacks: Latin
 * stays in Figtree or Noto Sans, Chinese falls through to Noto Sans SC.
 */
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Figtree:wght@600;700&family=Noto+Sans:wght@400;500;700&family=Noto+Sans+SC:wght@400;700&display=swap';

export const LATIN_FONTS = {};

if (typeof document !== 'undefined' && !document.getElementById('kneedit-fonts')) {
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://fonts.gstatic.com';
  preconnect.crossOrigin = 'anonymous';
  const sheet = document.createElement('link');
  sheet.id = 'kneedit-fonts';
  sheet.rel = 'stylesheet';
  sheet.href = GOOGLE_FONTS_URL;
  document.head.append(preconnect, sheet);
}

export async function ensureFontsFor(_language: Language): Promise<void> {}

const STACKS: Record<FontRole, string> = {
  heading: 'Figtree, "Noto Sans SC", system-ui, sans-serif',
  body: '"Noto Sans", "Noto Sans SC", system-ui, sans-serif',
};

const WEIGHTS: Record<FontWeight, TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export function fontStyle(role: FontRole, weight: FontWeight, _language: Language): TextStyle {
  const w = role === 'heading' && weight !== 'bold' ? 'semibold' : weight;
  return { fontFamily: STACKS[role], fontWeight: WEIGHTS[w] };
}
