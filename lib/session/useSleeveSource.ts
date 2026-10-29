import { useMemo } from 'react';

import { useMe } from '@/lib/queries/me';
import { createFakeSource, createManualSource, type SleeveSource } from '@/lib/sleeve';

/**
 * Every session is logged by hand for now, demo accounts included: the
 * senior taps Done, and nothing is measured (PLAN.md, SleeveSource).
 */
export function useSessionSource(): SleeveSource {
  return useMemo(() => createManualSource(), []);
}

/**
 * The Sleeve tab: sample signals on demo accounts, tagged "Sample data", and
 * no sleeve for everyone else until the real one plugs in.
 */
export function useSleeveTabSource(): SleeveSource {
  const { data: me } = useMe();
  const isDemo = me?.profile.is_demo ?? false;
  return useMemo(
    () => (isDemo ? createFakeSource({ signalIntervalMs: 500 }) : createManualSource()),
    [isDemo],
  );
}
