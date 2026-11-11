import { format, formatDistance } from 'date-fns';
import { useNowValue } from '../../hooks/nowContext';

/** "5 minutes ago", with the exact time available on hover and to assistive tech. */
export function RelativeTime({ date }: { date: Date }) {
  const now = useNowValue();
  // The shared clock ticks every 30 seconds, so a fresh event can be slightly
  // ahead of it. Clamp so that reads "less than a minute ago", never "in ...".
  const reference = date > now ? date : now;

  return (
    <time dateTime={date.toISOString()} title={format(date, 'PPpp')}>
      {formatDistance(date, reference, { addSuffix: true })}
    </time>
  );
}
