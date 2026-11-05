import { useEffect, useState } from 'react';

import { readPendingLinkCode } from './pendingLinkCode';

/** The link code waiting from a scanned QR: undefined while it loads, then the code or null. */
export function usePendingLinkCode(): string | null | undefined {
  const [code, setCode] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void readPendingLinkCode().then((c) => {
      if (active) setCode(c);
    });
    return () => {
      active = false;
    };
  }, []);
  return code;
}
