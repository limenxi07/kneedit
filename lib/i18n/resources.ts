import enCommon from '@/locales/en/common.json';
import zhCommon from '@/locales/zh-Hans/common.json';

import type { Language } from './languages';

/**
 * Every namespace, in both languages. Add a namespace here and in
 * locales/<lang>/; tests/i18n.test.ts checks the two stay in step.
 */
export const resources = {
  en: { common: enCommon },
  'zh-Hans': { common: zhCommon },
} as const satisfies Record<Language, Record<string, unknown>>;

export const NAMESPACES = Object.keys(resources.en) as (keyof (typeof resources)['en'])[];
export const DEFAULT_NAMESPACE = 'common' as const;
