import 'i18next';

import type { DEFAULT_NAMESPACE, resources } from './resources';

// Type-checks every t('...') key against the English resources.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: (typeof resources)['en'];
    returnNull: false;
  }
}
