import { useSyncExternalStore } from 'react';
import { contentVersion, subscribeContent } from './client';

/**
 * Re-renders the caller whenever site content changes — whether the write came
 * from this tab (an /admin save) or another one (the `storage` event).
 */
export function useContentVersion(): number {
  return useSyncExternalStore(subscribeContent, contentVersion, contentVersion);
}
