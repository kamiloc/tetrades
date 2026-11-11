'use client';

import { getApiErrorCode, useMyTrainerInvitations } from '@packages/api-client';
import type { MyTrainerInvitationOutput } from '@packages/validators';
import { useState } from 'react';

import { Button } from '../../../../../components/button';
import { ConfirmDialog } from '../../../../../components/confirm-dialog';
import { InlineAlert } from '../../../../../components/inline-alert';
import { EmptyState, ErrorState, LoadingState } from '../../../../../components/states';
import { NameCell, Table, type Column } from '../../../../../components/table';
import { formatDateTime } from '../../../../../lib/format';
import {
  useAcceptTrainerInvitationMutation,
  useDeclineTrainerInvitationMutation,
} from '../../../../../lib/portal-mutations';

export type Notice =
  | { kind: 'accepted'; clubName: string }
  | { kind: 'declined'; clubName: string }
  | { kind: 'unavailable' }
  | { kind: 'separate-account' }
  | { kind: 'failed' };

/**
 * What to tell the user when accepting or declining fails. FORBIDDEN means
 * only "this account can't be a trainer" (admin change D4); an expired,
 * revoked or deactivated-club invitation is NOT_FOUND or BAD_REQUEST.
 */
export function noticeForError(code: string | null): { notice: Notice; refetch: boolean } {
  if (code === 'FORBIDDEN') return { notice: { kind: 'separate-account' }, refetch: false };
  if (code === 'NOT_FOUND' || code === 'BAD_REQUEST')
    return { notice: { kind: 'unavailable' }, refetch: true };
  return { notice: { kind: 'failed' }, refetch: false };
}

function NoticeAlert({ notice }: { notice: Notice }) {
  switch (notice.kind) {
    case 'accepted':
      return (
        <InlineAlert tone="success" title={`You're now a trainer of ${notice.clubName}`}>
          Your club tools will appear in the trainer portal.
        </InlineAlert>
      );
    case 'declined':
      return (
        <InlineAlert tone="info">You declined the invitation from {notice.clubName}.</InlineAlert>
      );
    case 'unavailable':
      return (
        <InlineAlert tone="warning" title="This invitation is no longer available">
          It may have expired or been withdrawn. The list has been refreshed.
        </InlineAlert>
      );
    case 'separate-account':
      return (
        <InlineAlert tone="error" title="This account can't become a trainer">
          This is an athlete or admin account. Trainer access needs a separate account with a
          different email. Ask the club&apos;s admin to invite that address.
        </InlineAlert>
      );
    case 'failed':
      return <InlineAlert tone="error">Something went wrong. Try again.</InlineAlert>;
  }
}

export function InvitationsList({ email }: { email: string }) {
  const invitations = useMyTrainerInvitations();
  const accept = useAcceptTrainerInvitationMutation();
  const decline = useDeclineTrainerInvitationMutation();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [declining, setDeclining] = useState<MyTrainerInvitationOutput | null>(null);
  const busy = accept.isPending || decline.isPending;

  const handleError = (error: unknown) => {
    const { notice: next, refetch } = noticeForError(getApiErrorCode(error));
    setNotice(next);
    if (refetch) void invitations.refetch();
  };

  const onAccept = async (invitation: MyTrainerInvitationOutput) => {
    setNotice(null);
    try {
      await accept.mutateAsync({ invitationId: invitation.id });
      setNotice({ kind: 'accepted', clubName: invitation.club.name });
    } catch (error) {
      handleError(error);
    }
  };

  const onDecline = async () => {
    if (declining === null) return;
    const invitation = declining;
    setNotice(null);
    try {
      await decline.mutateAsync({ invitationId: invitation.id });
      setNotice({ kind: 'declined', clubName: invitation.club.name });
    } catch (error) {
      handleError(error);
    }
    setDeclining(null);
  };

  const columns: Column<MyTrainerInvitationOutput>[] = [
    {
      header: 'Club',
      className: 'w-[45%]',
      cell: (i) => (
        <NameCell
          title={i.club.name}
          sub={i.club.city ? `${i.club.city}, ${i.club.countryCode}` : i.club.countryCode}
        />
      ),
    },
    {
      header: 'Expires',
      cell: (i) => <span className="text-muted">{formatDateTime(i.expiresAt)}</span>,
    },
    {
      header: 'Actions',
      hideHeader: true,
      align: 'right',
      cell: (i) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => setDeclining(i)} disabled={busy}>
            Decline
          </Button>
          <Button size="sm" variant="primary" onClick={() => void onAccept(i)} disabled={busy}>
            Accept
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      {notice ? <NoticeAlert notice={notice} /> : null}
      {invitations.isPending ? (
        <LoadingState label="Loading invitations…" />
      ) : invitations.isError ? (
        <ErrorState
          title="We couldn't load your invitations"
          onRetry={() => void invitations.refetch()}
        />
      ) : (
        <Table
          caption="Your trainer invitations"
          columns={columns}
          rows={invitations.data.items}
          rowKey={(i) => i.id}
          empty={
            <EmptyState icon="mail" title={`No trainer invitations for ${email}`}>
              If you expected one, sign out and sign in with the address the club&apos;s admin
              invited.
            </EmptyState>
          }
        />
      )}
      <ConfirmDialog
        open={declining !== null}
        title="Decline this invitation?"
        confirmLabel="Decline invitation"
        pending={decline.isPending}
        onConfirm={() => void onDecline()}
        onClose={() => {
          if (!decline.isPending) setDeclining(null);
        }}
      >
        <p>
          You won&apos;t become a trainer of <strong>{declining?.club.name}</strong>. The
          club&apos;s admin can invite you again later.
        </p>
      </ConfirmDialog>
    </div>
  );
}
