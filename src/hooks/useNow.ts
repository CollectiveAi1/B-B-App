import { useEffect, useState } from 'react';

/**
 * The current time, refreshed on an interval.
 *
 * Everything time-based on the dashboard (who is in house, which reminders are
 * due, "5 minutes ago") reads from this one value, so the whole screen moves
 * forward together instead of each widget keeping its own clock.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    // Browsers throttle timers in background tabs, so catch up when the tab returns.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick();
    };

    const interval = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs]);

  return now;
}
