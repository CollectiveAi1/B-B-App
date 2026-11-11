import { createContext, useContext } from 'react';

/**
 * The dashboard's shared clock. Timestamps anywhere in the tree read it from
 * here, so they all refresh on the same tick.
 */
export const NowContext = createContext<Date | null>(null);

export function useNowValue(): Date {
  const now = useContext(NowContext);
  if (!now) throw new Error('useNowValue must be used inside a <NowContext> provider.');
  return now;
}
