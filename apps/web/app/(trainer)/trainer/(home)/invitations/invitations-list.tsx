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
import { useWebLocalization } from '../../../../../lib/i18n';
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
  const { t } = useWebLocalization();
  switch (notice.kind) {
    case 'accepted':
      return (
        <InlineAlert tone="success" title={t('trainerInvites.acceptedTitle', { club: notice.clubName })}>
          {t('trainerInvites.acceptedBody')}
        </InlineAlert>
      );
    case 'declined':
      return (
        <InlineAlert tone="info">{t('trainerInvites.declined', { club: notice.clubName })}</InlineAlert>
      );
    case 'unavailable':
      return (
        <InlineAlert tone="warning" title={t('trainerInvites.unavailableTitle')}>
          {t('trainerInvites.unavailableBody')}
        </InlineAlert>
      );
    case 'separate-account':
      return (
        <InlineAlert tone="error" title={t('trainerInvites.separateTitle')}>
          {t('trainerInvites.separateBody')}
        </InlineAlert>
      );
    case 'failed':
      return <InlineAlert tone="error">{t('common.genericError')}</InlineAlert>;
  }
}

export function InvitationsList({ email }: { email: string }) {
  const { locale, t, rich } = useWebLocalization();
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
      header: t('trainerInvites.colClub'),
      className: 'w-[45%]',
      cell: (i) => (
        <NameCell
          title={i.club.name}
          sub={i.club.city ? t('common.location', { city: i.club.city, country: i.club.countryCode }) : i.club.countryCode}
        />
      ),
    },
    {
      header: t('trainerInvites.colExpires'),
      cell: (i) => <span className="text-muted">{formatDateTime(locale, i.expiresAt)}</span>,
    },
    {
      header: t('common.actions'),
      hideHeader: true,
      align: 'right',
      cell: (i) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => setDeclining(i)} disabled={busy}>
            {t('common.decline')}
          </Button>
          <Button size="sm" variant="primary" onClick={() => void onAccept(i)} disabled={busy}>
            {t('common.accept')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      {notice ? <NoticeAlert notice={notice} /> : null}
      {invitations.isPending ? (
        <LoadingState label={t('trainerInvites.loading')} />
      ) : invitations.isError ? (
        <ErrorState
          title={t('trainerInvites.loadFailed')}
          onRetry={() => void invitations.refetch()}
        />
      ) : (
        <Table
          caption={t('trainerInvites.caption')}
          columns={columns}
          rows={invitations.data.items}
          rowKey={(i) => i.id}
          empty={
            <EmptyState icon="mail" title={t('trainerInvites.emptyTitle', { email })}>
              {t('trainerInvites.emptyBody')}
            </EmptyState>
          }
        />
      )}
      <ConfirmDialog
        open={declining !== null}
        title={t('trainerInvites.declineTitle')}
        confirmLabel={t('trainerInvites.declineConfirm')}
        pending={decline.isPending}
        onConfirm={() => void onDecline()}
        onClose={() => {
          if (!decline.isPending) setDeclining(null);
        }}
      >
        <p>{rich('trainerInvites.declineBody', { club: <strong>{declining?.club.name}</strong> })}</p>
      </ConfirmDialog>
    </div>
  );
}
