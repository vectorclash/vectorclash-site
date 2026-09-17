import { useMemo, useSyncExternalStore } from 'react';
import { getLevel, getSettings, subscribe } from './qualityLevel';

/**
 * The current quality level and its settings, live.
 *
 * Deliberately an external store rather than React context: <Canvas> renders
 * into its own reconciler root, so a provider mounted outside it and a consumer
 * mounted inside it are not reliably the same tree. useSyncExternalStore does
 * not care which root it is called from, which means the Canvas props (dpr,
 * multisampling) and the scene contents (star counts, bloom) can read one
 * source of truth without a context bridge.
 */
export default function useQuality() {
  const level = useSyncExternalStore(subscribe, getLevel, getLevel);
  const settings = useMemo(() => getSettings(level), [level]);

  return { level, settings };
}
