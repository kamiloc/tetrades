'use client';

import { useFindAthleteToInvite, useInviteAthleteToClub } from '@packages/api-client';
import type { AthleteToInviteOutput } from '@packages/validators';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../../../../../components/button';
import { Dialog } from '../../../../../../components/dialog';
import { describedBy, Field, TextInput } from '../../../../../../components/field';
import { InlineAlert } from '../../../../../../components/inline-alert';
import { StatusChip } from '../../../../../../components/status-chip';
import { parseAthleteQuery } from '../../../../../../lib/trainer/athlete-query';
import { TRAINER_NOTICE_COPY } from '../../../../../../lib/trainer/errors';
import { useRefreshOnLostAccess, useTrainerErrors } from '../../../../../../lib/trainer/use-trainer';

export const SEARCH_DEBOUNCE_MS = 300;

function useDebounced(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const NO_SLUG = 'none';

// Find an athlete by profile link, handle or name, then invite one result
// (design D3). The athlete must confirm before joining.
export function InviteAthleteDialog({
  open,
  onClose,
  clubId,
  clubName,
}: {
  open: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
}) {
  const invite = useInviteAthleteToClub();
  const resolveError = useTrainerErrors(clubId);
  const [text, setText] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const debounced = useDebounced(text, SEARCH_DEBOUNCE_MS);
  const query = parseAthleteQuery(debounced);
  const settled = text === debounced;

  const slugLookup = useFindAthleteToInvite(
    { clubId, by: 'slug', slug: query.kind === 'slug' ? query.slug : NO_SLUG },
    { enabled: open && query.kind === 'slug' },
  );
  const slugItems = slugLookup.data?.pages.flatMap((page) => page.items) ?? [];
  const slugMissed = query.kind === 'slug' && slugLookup.isSuccess && slugItems.length === 0;

  // A handle that finds nothing falls back to a name search for the same text.
  const nameText =
    query.kind === 'name' ? query.query : slugMissed && query.kind === 'slug' ? query.fallbackName : null;
  const nameLookup = useFindAthleteToInvite(
    { clubId, by: 'name', query: nameText ?? '', take: 20 },
    { enabled: open && nameText !== null },
  );
  const lostAccess = useRefreshOnLostAccess(slugLookup.error ?? nameLookup.error);

  const results = useMemo(() => {
    const seen = new Set<string>();
    const all = [
      ...slugItems,
      ...(nameText !== null ? (nameLookup.data?.pages.flatMap((page) => page.items) ?? []) : []),
    ];
    return all.filter((item) => (seen.has(item.athlete.id) ? false : (seen.add(item.athlete.id), true)));
  }, [slugItems, nameLookup.data, nameText]);

  const searching =
    !settled ||
    (query.kind === 'slug' && slugLookup.isFetching) ||
    (nameText !== null && nameLookup.isFetching && !nameLookup.isFetchingNextPage);
  const lookupFailed =
    !lostAccess && ((query.kind === 'slug' && slugLookup.isError) || (nameText !== null && nameLookup.isError));
  const searched = query.kind === 'slug' || query.kind === 'name';
  const nothingFound = settled && searched && !searching && !lookupFailed && results.length === 0;

  const close = () => {
    if (invite.isPending) return;
    setText('');
    setFailure(null);
    setSent(null);
    setInvitingId(null);
    onClose();
  };

  const send = async (item: AthleteToInviteOutput) => {
    setFailure(null);
    setInvitingId(item.athlete.id);
    try {
      await invite.mutateAsync({ clubId, athleteId: item.athlete.id });
      setSent(item.athlete.displayName);
    } catch (error) {
      setFailure(TRAINER_NOTICE_COPY[(await resolveError(error, 'invite')).kind]);
    } finally {
      setInvitingId(null);
    }
  };

  if (sent !== null) {
    return (
      <Dialog
        open={open}
        onClose={close}
        title="Invitation sent"
        footer={
          <>
            <Button
              onClick={() => {
                setSent(null);
                setText('');
              }}
            >
              Invite another
            </Button>
            <Button variant="primary" onClick={close}>
              Done
            </Button>
          </>
        }
      >
        <InlineAlert tone="success" title={`Invitation sent. ${sent} must confirm before joining.`}>
          Until they confirm, they appear on the roster as waiting for the athlete, and you
          can&apos;t log metrics for them.
        </InlineAlert>
      </Dialog>
    );
  }

  const fieldHint =
    query.kind === 'too-short'
      ? 'Type at least 2 characters.'
      : 'Paste their profile link or handle, or type their name. Name search only finds athletes who chose to be searchable.';
  const fieldError = query.kind === 'too-long' ? 'Use at most 100 characters.' : undefined;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Invite an athlete"
      description={`They join ${clubName} only after they confirm the invitation.`}
      footer={
        <Button onClick={close} disabled={invite.isPending}>
          Close
        </Button>
      }
    >
      <form noValidate onSubmit={(event) => event.preventDefault()}>
        <Field id="find-athlete" label="Profile link, handle or name" hint={fieldHint} error={fieldError}>
          <TextInput
            id="find-athlete"
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setFailure(null);
            }}
            invalid={fieldError !== undefined}
            aria-describedby={describedBy('find-athlete', true, fieldError)}
            placeholder="https://…/athlete/mariana-pajon, @mariana-pajon or Mariana"
            autoComplete="off"
          />
        </Field>
      </form>

      {failure ? <InlineAlert tone="error">{failure}</InlineAlert> : null}
      {lookupFailed ? (
        <InlineAlert tone="error">We couldn&apos;t search right now. Try again.</InlineAlert>
      ) : null}

      <div aria-live="polite" className="flex flex-col gap-2">
        {searched && searching && results.length === 0 ? (
          <p className="text-[13px] text-muted">Searching…</p>
        ) : null}
        {nothingFound ? (
          <InlineAlert tone="info" title="No athlete found">
            Check the link or name, or ask the athlete for their profile link. A link finds them
            even if their profile isn&apos;t searchable.
          </InlineAlert>
        ) : null}
        {results.length > 0 ? (
          <ul aria-label="Athletes found" className="flex flex-col divide-y divide-line2 rounded-[12px] border border-line">
            {results.map((item) => (
              <li key={item.athlete.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[13px] font-semibold text-text">{item.athlete.displayName}</p>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    @{item.athlete.slug} · {item.athlete.sport.name}
                  </p>
                </div>
                {item.relation === 'MEMBER' ? (
                  <StatusChip status="member" />
                ) : item.relation === 'INVITED_BY_YOU' ? (
                  <StatusChip status="waitingAthlete" />
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    aria-label={`Invite ${item.athlete.displayName}`}
                    disabled={invite.isPending}
                    onClick={() => void send(item)}
                  >
                    {invitingId === item.athlete.id ? 'Inviting…' : 'Invite'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {nameText !== null && nameLookup.hasNextPage ? (
          <div className="flex justify-center">
            <Button
              size="sm"
              onClick={() => void nameLookup.fetchNextPage()}
              disabled={nameLookup.isFetchingNextPage}
            >
              {nameLookup.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
