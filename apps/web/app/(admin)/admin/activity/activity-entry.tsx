import type { AdminActionEntryOutput } from '@packages/validators';
import Link from 'next/link';

import { focusRing } from '../../../../components/focus';
import { adminActionDetails, describeAdminAction } from '../../../../lib/admin-actions';
import { formatDateTime } from '../../../../lib/format';

// One admin action log entry: the sentence with its club linked, the time,
// and the recorded details. Shared by the activity page and the overview.

export function ActivityEntry({ entry }: { entry: AdminActionEntryOutput }) {
  const { before, club } = describeAdminAction(entry);
  const details = adminActionDetails(entry.details);
  return (
    <li className="flex flex-col gap-0.5 border-t border-line2 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-[13px] text-text">
        {before}
        {club !== null && entry.club !== null ? (
          <Link
            href={`/admin/clubs/${entry.club.id}`}
            className={`rounded-sm font-semibold hover:underline ${focusRing}`}
          >
            {club}
          </Link>
        ) : null}
      </p>
      <p className="text-[12px] text-muted">
        <time dateTime={entry.createdAt.toISOString()}>{formatDateTime(entry.createdAt)}</time>
        {details.map((line) => (
          <span key={line}> · {line}</span>
        ))}
      </p>
    </li>
  );
}

export function ActivityList({ entries }: { entries: AdminActionEntryOutput[] }) {
  return (
    <ul className="flex flex-col">
      {entries.map((e) => (
        <ActivityEntry key={e.id} entry={e} />
      ))}
    </ul>
  );
}
