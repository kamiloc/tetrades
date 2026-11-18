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
import { useWebLocalization } from '../../../../../../lib/i18n';
import {
  useRevokeTrainerInvitationMutation,
  useRevokeTrainerMutation,
} from '../../../../../../lib/portal-mutations';
import type { MessageKey, MessageValues } from '../../../../../../lib/translations';
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

function trainerLabel(
  trainer: AdminClubTrainerOutput,
  t: (key: MessageKey, values?: MessageValues) => string,
): string {
  return trainer.invitedEmail
    ? t('admin.trainers.invitedAs', { email: trainer.invitedEmail })
    : t('admin.trainers.provisioned');
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
  const { t } = useWebLocalization();
  if (!show) return null;
  return (
    <div className="flex justify-center">
      <Button onClick={onClick} disabled={loading}>
        {loading ? t('common.loading') : t('common.loadMore')}
      </Button>
    </div>
  );
}

export function TrainersView({ clubId, appOrigin }: { clubId: string; appOrigin: string }) {
  const { locale, t, rich } = useWebLocalization();
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

  if (club.isPending || club.isError) {
    if (club.isError) {
      const code = getApiErrorCode(club.error);
      // An unknown or malformed id.
      if (code === 'NOT_FOUND' || code === 'BAD_REQUEST') return <ClubNotFound />;
    }
    // Nothing club-specific (invite, lists) renders until the club loads, so
    // a failed load never looks like an active club.
    return (
      <>
        <TopBar
          crumbs={[
            { label: t('nav.clubs'), href: '/admin/clubs' },
            { label: t('admin.club.crumb'), href: `/admin/clubs/${clubId}` },
            { label: t('admin.club.trainers') },
          ]}
        />
        <PageBody>
          {club.isPending ? (
            <LoadingState label={t('admin.club.loading')} />
          ) : (
            <ErrorState title={t('admin.club.loadFailed')} onRetry={() => void club.refetch()} />
          )}
        </PageBody>
      </>
    );
  }

  const clubName = club.data.name;
  const isActive = club.data.isActive;

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
    {
      header: t('admin.trainers.colTrainer'),
      className: 'w-[45%]',
      cell: (trainer) => <NameCell title={trainerLabel(trainer, t)} />,
    },
    {
      header: t('common.status'),
      cell: (trainer) => <StatusChip status={trainer.status === 'ACTIVE' ? 'active' : 'revoked'} />,
    },
    {
      header: t('admin.trainers.colSince'),
      cell: (trainer) => (
        <span className="text-muted">
          {trainer.revokedAt
            ? t('admin.trainers.revokedOn', { date: formatDate(locale, trainer.revokedAt) })
            : formatDate(locale, trainer.createdAt)}
        </span>
      ),
    },
    {
      header: t('common.actions'),
      hideHeader: true,
      align: 'right',
      cell: (trainer) =>
        trainer.status === 'ACTIVE' ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => setRevoking({ kind: 'trainer', trainer })}
          >
            {t('common.revoke')}
          </Button>
        ) : null,
    },
  ];

  const invitationColumns: Column<AdminTrainerInvitationOutput>[] = [
    {
      header: t('common.email'),
      className: 'w-[35%]',
      cell: (i) => (
        <NameCell
          title={i.email ?? t('admin.trainers.addressRemoved')}
          sub={t('admin.trainers.invitedOn', { date: formatDate(locale, i.createdAt) })}
        />
      ),
    },
    { header: t('common.status'), cell: (i) => <StatusChip status={INVITATION_STATUS[i.state]} /> },
    {
      header: t('admin.trainers.colExpires'),
      cell: (i) => (
        <span className="text-muted">
          {i.state === 'PENDING' || i.state === 'EXPIRED'
            ? formatDateTime(locale, i.expiresAt)
            : i.respondedAt
              ? t('admin.trainers.answeredOn', { date: formatDate(locale, i.respondedAt) })
              : '—'}
        </span>
      ),
    },
    {
      header: t('common.actions'),
      hideHeader: true,
      align: 'right',
      cell: (i) =>
        i.state === 'PENDING' ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => setRevoking({ kind: 'invitation', invitation: i })}
          >
            {t('common.revoke')}
          </Button>
        ) : null,
    },
  ];

  const inviteButton = (
    <Button variant="primary" icon="plus" disabled={!isActive} onClick={() => setInviting(true)}>
      {t('admin.trainers.invite')}
    </Button>
  );

  return (
    <>
      <TopBar
        crumbs={[
          { label: t('nav.clubs'), href: '/admin/clubs' },
          { label: clubName, href: `/admin/clubs/${clubId}` },
          { label: t('admin.club.trainers') },
        ]}
        action={inviteButton}
      />
      <PageBody>
        <PageHeader
          title={t('admin.club.trainers')}
          sub={t('admin.trainers.sub')}
          right={<StatusChip status={isActive ? 'active' : 'deactivated'} />}
        />
        {!isActive ? (
          <InlineAlert tone="warning" title={t('admin.trainers.deactivatedTitle')}>
            {t('admin.trainers.deactivatedBody')}
          </InlineAlert>
        ) : null}

        <section aria-labelledby="trainers-heading" className="flex flex-col gap-2.5">
          <h2 id="trainers-heading" className="text-[14px] font-bold">
            {t('admin.trainers.clubTrainers')}
          </h2>
          {trainers.isPending ? (
            <LoadingState label={t('admin.trainers.loading')} />
          ) : trainers.isError ? (
            <ErrorState
              title={t('admin.trainers.loadFailed')}
              onRetry={() => void trainers.refetch()}
            />
          ) : (
            <Table
              caption={t('admin.trainers.clubTrainers')}
              columns={trainerColumns}
              rows={trainers.data.pages.flatMap((p) => p.items)}
              rowKey={(t) => t.id}
              empty={
                <EmptyState icon="users" title={t('admin.trainers.emptyTitle')}>
                  {t('admin.trainers.emptyBody')}
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
            {t('admin.trainers.invitations')}
          </h2>
          {invitations.isPending ? (
            <LoadingState label={t('admin.trainers.invitationsLoading')} />
          ) : invitations.isError ? (
            <ErrorState
              title={t('admin.trainers.invitationsLoadFailed')}
              onRetry={() => void invitations.refetch()}
            />
          ) : (
            <Table
              caption={t('admin.trainers.invitationsCaption')}
              columns={invitationColumns}
              rows={invitations.data.pages.flatMap((p) => p.items)}
              rowKey={(i) => i.id}
              empty={
                <EmptyState
                  icon="mail"
                  title={t('admin.trainers.noInvitations')}
                  action={isActive ? inviteButton : undefined}
                >
                  {t('admin.trainers.noInvitationsBody')}
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
        title={t('admin.trainers.revokeTrainerTitle')}
        confirmLabel={t('admin.trainers.revokeTrainer')}
        pending={revokePending}
        error={revokeFailed ? t('admin.trainers.revokeTrainerFailed') : undefined}
        onConfirm={() => void confirmRevoke()}
        onClose={() => {
          if (!revokePending) {
            setRevoking(null);
            setRevokeFailed(false);
          }
        }}
      >
        {revoking?.kind === 'trainer' ? (
          <p className="font-semibold">{trainerLabel(revoking.trainer, t)}</p>
        ) : null}
        <p>{t('admin.trainers.revokeTrainerBody1', { club: clubName })}</p>
        <p>{t('admin.trainers.revokeTrainerBody2')}</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={revoking?.kind === 'invitation'}
        title={t('admin.trainers.revokeInvitationTitle')}
        confirmLabel={t('admin.trainers.revokeInvitation')}
        pending={revokePending}
        error={revokeFailed ? t('admin.trainers.revokeInvitationFailed') : undefined}
        onConfirm={() => void confirmRevoke()}
        onClose={() => {
          if (!revokePending) {
            setRevoking(null);
            setRevokeFailed(false);
          }
        }}
      >
        {revoking?.kind === 'invitation' ? (
          <p>
            {rich('admin.trainers.revokeInvitationBody', {
              email: <strong>{revoking.invitation.email ?? t('admin.trainers.thisAddress')}</strong>,
            })}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
