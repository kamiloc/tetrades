'use client';

import { getApiErrorCode, trpc, useAdminClub } from '@packages/api-client';
import type {
  AdminClubTrainerOutput,
  AdminTrainerInvitationOutput,
  TrainerInvitationState,
} from '@packages/validators';
import { useState } from 'react';

import { Button } from '../../../../../../components/button';
import { ConfirmDialog } from '../../../../../../components/confirm-dialog';
import { InlineAlert } from '../../../../../../components/inline-alert';
import { PageBody, PageHeader } from '../../../../../../components/layout';
import { TopBar } from '../../../../../../components/portal-shell';
import { EmptyState, ErrorState, LoadingState } from '../../../../../../components/states';
import { StatusChip, type StatusKey } from '../../../../../../components/status-chip';
import { NameCell, Table, type Column } from '../../../../../../components/table';
import { formatDate, formatDateTime } from '../../../../../../lib/format';
import {
  useRevokeTrainerInvitationMutation,
  useRevokeTrainerMutation,
} from '../../../../../../lib/portal-mutations';
import { ClubNotFound } from '../club-not-found';

import { InviteDialog } from './invite-dialog';

const INVITATION_STATUS: Record<TrainerInvitationState, StatusKey> = {
  PENDING: 'pending',
  EXPIRED: 'expired',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  REVOKED: 'revoked',
};

type Revoking =
  | { kind: 'trainer'; trainer: AdminClubTrainerOutput }
  | { kind: 'invitation'; invitation: AdminTrainerInvitationOutput }
  | null;

function trainerLabel(trainer: AdminClubTrainerOutput): string {
  return trainer.invitedEmail
    ? `Invited as ${trainer.invitedEmail}`
    : 'Provisioned before invitations';
}

function LoadMore({
  show,
  loading,
  onClick,
}: {
  show: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  if (!show) return null;
  return (
    <div className="flex justify-center">
      <Button onClick={onClick} disabled={loading}>
        {loading ? 'Loading…' : 'Load more'}
      </Button>
    </div>
  );
}

export function TrainersView({ clubId, appOrigin }: { clubId: string; appOrigin: string }) {
  const club = useAdminClub(clubId);
  const page = {
    getNextPageParam: (last: { nextCursor: string | null }) => last.nextCursor ?? undefined,
  };
  const trainers = trpc.admin.listClubTrainers.useInfiniteQuery({ clubId, take: 20 }, page);
  const invitations = trpc.admin.listClubTrainerInvitations.useInfiniteQuery(
    { clubId, take: 20 },
    page,
  );
  const revokeTrainer = useRevokeTrainerMutation();
  const revokeInvitation = useRevokeTrainerInvitationMutation();

  const [inviting, setInviting] = useState(false);
  const [revoking, setRevoking] = useState<Revoking>(null);
  const [revokeFailed, setRevokeFailed] = useState(false);
  const revokePending = revokeTrainer.isPending || revokeInvitation.isPending;

  if (club.isError) {
    const code = getApiErrorCode(club.error);
    if (code === 'NOT_FOUND' || code === 'BAD_REQUEST') return <ClubNotFound />;
  }

  const clubName = club.data?.name ?? 'Club';
  const isActive = club.data?.isActive ?? true;

  const confirmRevoke = async () => {
    if (revoking === null) return;
    setRevokeFailed(false);
    try {
      if (revoking.kind === 'trainer')
        await revokeTrainer.mutateAsync({ clubTrainerId: revoking.trainer.id });
      else await revokeInvitation.mutateAsync({ invitationId: revoking.invitation.id });
      setRevoking(null);
    } catch (error) {
      // Already revoked or no longer pending: the refreshed lists show it.
      if (getApiErrorCode(error) === 'BAD_REQUEST' || getApiErrorCode(error) === 'NOT_FOUND') {
        setRevoking(null);
        void trainers.refetch();
        void invitations.refetch();
      } else {
        setRevokeFailed(true);
      }
    }
  };

  const trainerColumns: Column<AdminClubTrainerOutput>[] = [
    { header: 'Trainer', className: 'w-[45%]', cell: (t) => <NameCell title={trainerLabel(t)} /> },
    {
      header: 'Status',
      cell: (t) => <StatusChip status={t.status === 'ACTIVE' ? 'active' : 'revoked'} />,
    },
    {
      header: 'Since',
      cell: (t) => (
        <span className="text-muted">
          {t.revokedAt ? `Revoked ${formatDate(t.revokedAt)}` : formatDate(t.createdAt)}
        </span>
      ),
    },
    {
      header: 'Actions',
      hideHeader: true,
      align: 'right',
      cell: (t) =>
        t.status === 'ACTIVE' ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => setRevoking({ kind: 'trainer', trainer: t })}
          >
            Revoke
          </Button>
        ) : null,
    },
  ];

  const invitationColumns: Column<AdminTrainerInvitationOutput>[] = [
    {
      header: 'Email',
      className: 'w-[35%]',
      cell: (i) => (
        <NameCell title={i.email ?? 'Address removed'} sub={`Invited ${formatDate(i.createdAt)}`} />
      ),
    },
    { header: 'Status', cell: (i) => <StatusChip status={INVITATION_STATUS[i.state]} /> },
    {
      header: 'Expires',
      cell: (i) => (
        <span className="text-muted">
          {i.state === 'PENDING' || i.state === 'EXPIRED'
            ? formatDateTime(i.expiresAt)
            : i.respondedAt
              ? `Answered ${formatDate(i.respondedAt)}`
              : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      hideHeader: true,
      align: 'right',
      cell: (i) =>
        i.state === 'PENDING' ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => setRevoking({ kind: 'invitation', invitation: i })}
          >
            Revoke
          </Button>
        ) : null,
    },
  ];

  const inviteButton = (
    <Button
      variant="primary"
      icon="plus"
      disabled={!isActive || club.isPending}
      onClick={() => setInviting(true)}
    >
      Invite trainer
    </Button>
  );

  return (
    <>
      <TopBar
        crumbs={[
          { label: 'Clubs', href: '/admin/clubs' },
          { label: clubName, href: `/admin/clubs/${clubId}` },
          { label: 'Trainers' },
        ]}
        action={inviteButton}
      />
      <PageBody>
        <PageHeader
          title="Trainers"
          sub="Trainers join only by accepting an invitation sent to their email."
          right={
            club.data ? (
              <StatusChip status={club.data.isActive ? 'active' : 'deactivated'} />
            ) : undefined
          }
        />
        {club.data && !club.data.isActive ? (
          <InlineAlert tone="warning" title="This club is deactivated">
            Its trainers have no access and new trainers can&apos;t be invited. Reactivate the club
            first.
          </InlineAlert>
        ) : null}

        <section aria-labelledby="trainers-heading" className="flex flex-col gap-2.5">
          <h2 id="trainers-heading" className="text-[14px] font-bold">
            Club trainers
          </h2>
          {trainers.isPending ? (
            <LoadingState label="Loading trainers…" />
          ) : trainers.isError ? (
            <ErrorState
              title="We couldn't load the trainers"
              onRetry={() => void trainers.refetch()}
            />
          ) : (
            <Table
              caption="Club trainers"
              columns={trainerColumns}
              rows={trainers.data.pages.flatMap((p) => p.items)}
              rowKey={(t) => t.id}
              empty={
                <EmptyState icon="users" title="No trainers yet">
                  Invite a trainer by email. They appear here once they accept.
                </EmptyState>
              }
              footer={
                trainers.hasNextPage ? (
                  <LoadMore
                    show
                    loading={trainers.isFetchingNextPage}
                    onClick={() => void trainers.fetchNextPage()}
                  />
                ) : undefined
              }
            />
          )}
        </section>

        <section aria-labelledby="invitations-heading" className="flex flex-col gap-2.5">
          <h2 id="invitations-heading" className="text-[14px] font-bold">
            Invitations
          </h2>
          {invitations.isPending ? (
            <LoadingState label="Loading invitations…" />
          ) : invitations.isError ? (
            <ErrorState
              title="We couldn't load the invitations"
              onRetry={() => void invitations.refetch()}
            />
          ) : (
            <Table
              caption="Trainer invitations"
              columns={invitationColumns}
              rows={invitations.data.pages.flatMap((p) => p.items)}
              rowKey={(i) => i.id}
              empty={
                <EmptyState
                  icon="mail"
                  title="No invitations"
                  action={isActive ? inviteButton : undefined}
                >
                  Invitations you create appear here with their state.
                </EmptyState>
              }
              footer={
                invitations.hasNextPage ? (
                  <LoadMore
                    show
                    loading={invitations.isFetchingNextPage}
                    onClick={() => void invitations.fetchNextPage()}
                  />
                ) : undefined
              }
            />
          )}
        </section>
      </PageBody>

      <InviteDialog
        open={inviting}
        onClose={() => setInviting(false)}
        clubId={clubId}
        clubName={clubName}
        appOrigin={appOrigin}
      />
      <ConfirmDialog
        open={revoking?.kind === 'trainer'}
        title="Revoke this trainer?"
        confirmLabel="Revoke trainer"
        pending={revokePending}
        error={revokeFailed ? "We couldn't revoke the trainer. Try again." : undefined}
        onConfirm={() => void confirmRevoke()}
        onClose={() => {
          if (!revokePending) {
            setRevoking(null);
            setRevokeFailed(false);
          }
        }}
      >
        {revoking?.kind === 'trainer' ? (
          <p className="font-semibold">{trainerLabel(revoking.trainer)}</p>
        ) : null}
        <p>Their access to {clubName} ends at once.</p>
        <p>Their past metric entries and certification decisions stay on record.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={revoking?.kind === 'invitation'}
        title="Revoke this invitation?"
        confirmLabel="Revoke invitation"
        pending={revokePending}
        error={revokeFailed ? "We couldn't revoke the invitation. Try again." : undefined}
        onConfirm={() => void confirmRevoke()}
        onClose={() => {
          if (!revokePending) {
            setRevoking(null);
            setRevokeFailed(false);
          }
        }}
      >
        <p>
          {revoking?.kind === 'invitation' ? (
            <strong>{revoking.invitation.email ?? 'This address'}</strong>
          ) : null}{' '}
          will no longer be able to accept it. You can invite them again later.
        </p>
      </ConfirmDialog>
    </>
  );
}
