'use client';

import type { ClubPublicOutput } from '@packages/validators';
import { useRouter } from 'next/navigation';
import { useId } from 'react';

import { focusRing } from '../../../../components/focus';
import { Icon } from '../../../../components/icon';
import { clubRosterPath } from '../../../../lib/trainer/landing';

// The current club in the sidebar. A trainer of several clubs can switch;
// switching opens the other club's roster (spec: "Switching").
export function ClubSwitcher({
  current,
  clubs,
}: {
  current: Pick<ClubPublicOutput, 'id' | 'name'>;
  clubs: Pick<ClubPublicOutput, 'id' | 'name'>[];
}) {
  const router = useRouter();
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="px-1 text-[10px] font-bold uppercase tracking-[1.4px] text-on-ink3"
      >
        Club
      </label>
      {clubs.length > 1 ? (
        <div className="relative">
          <select
            id={id}
            value={current.id}
            onChange={(event) => router.push(clubRosterPath(event.target.value))}
            className={`h-[38px] w-full appearance-none truncate rounded-[10px] border border-ink-line bg-ink3 pl-3 pr-9 text-[13px] font-semibold text-on-ink ring-offset-ink ${focusRing}`}
          >
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
          <Icon
            name="chevronDown"
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-ink2"
          />
        </div>
      ) : (
        <output id={id} className="truncate px-1 text-[13px] font-semibold text-on-ink">
          {current.name}
        </output>
      )}
    </div>
  );
}
