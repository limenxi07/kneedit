import { useTranslation } from 'react-i18next';

import { setLanguage } from './index';
import { matchLanguage, type Language } from './languages';

export function useLanguage(): { language: Language; setLanguage: (l: Language) => Promise<void> } {
  const { i18n } = useTranslation();
  return { language: matchLanguage(i18n.resolvedLanguage ?? i18n.language), setLanguage };
}
