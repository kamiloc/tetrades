'use client';

import { getApiErrorCode, trpc, useAdminClub } from '@packages/api-client';
import type { AdminClubOutput, DeactivateClubOutput } from '@packages/validators';
import Link from 'next/link';
import { useState } from 'react';

import { Button, buttonClasses } from '../../../../../components/button';
import { ConfirmDialog } from '../../../../../components/confirm-dialog';
import { InlineAlert } from '../../../../../components/inline-alert';
import { PageBody, PageHeader, Panel } from '../../../../../components/layout';
import { TopBar } from '../../../../../components/portal-shell';
import { ErrorState, LoadingState } from '../../../../../components/states';
import { StatusChip } from '../../../../../components/status-chip';
import { formatDate } from '../../../../../lib/format';
import { useWebLocalization } from '../../../../../lib/i18n';
import {
  useDeactivateClubMutation,
  useReactivateClubMutation,
  useUpdateClubMutation,
} from '../../../../../lib/portal-mutations';
import { ClubFields, validateUpdate, type ClubErrors, type ClubValues } from '../club-fields';

import { ClubNotFound } from './club-not-found';

function valuesOf(club: AdminClubOutput): ClubValues {
  return { name: club.name, slug: club.slug, countryCode: club.countryCode, city: club.city ?? '' };
}

function EditClubForm({ club }: { club: AdminClubOutput }) {
  const { t } = useWebLocalization();
  const updateClub = useUpdateClubMutation();
  const [values, setValues] = useState<ClubValues>(() => valuesOf(club));
  const [errors, setErrors] = useState<ClubErrors>({});
  const [result, setResult] = useState<'saved' | 'failed' | null>(null);

  const original = valuesOf(club);
  const dirty =
    values.name !== original.name ||
    values.countryCode !== original.countryCode ||
    values.city !== original.city;

  const submit = async () => {
    setResult(null);
    const validation = validateUpdate(club.id, values);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    try {
      const updated = await updateClub.mutateAsync(validation.input);
      setValues(valuesOf(updated));
      setResult('saved');
    } catch {
      setResult('failed');
    }
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <ClubFields
        idPrefix="edit-club"
        values={values}
        errors={errors}
        onChange={(next) => {
          setValues(next);
          setResult(null);
        }}
        slugReadOnly
        disabled={updateClub.isPending}
      />
      {result === 'saved' ? <InlineAlert tone="success">{t('common.changesSaved')}</InlineAlert> : null}
      {result === 'failed' ? (
        <InlineAlert tone="error">{t('common.saveFailed')}</InlineAlert>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={!dirty || updateClub.isPending}>
          {updateClub.isPending ? t('common.saving') : t('common.save')}
        </Button>
        <Button
          onClick={() => {
            setValues(original);
            setErrors({});
          }}
          disabled={!dirty || updateClub.isPending}
        >
          {t('common.discard')}
        </Button>
      </div>
    </form>
  );
}

function StatusPanel({ club }: { club: AdminClubOutput }) {
  const { locale, t } = useWebLocalization();
  const deactivate = useDeactivateClubMutation();
  const reactivate = useReactivateClubMutation();
  const utils = trpc.useUtils();
  const [confirming, setConfirming] = useState<'deactivate' | 'reactivate' | null>(null);
  const [failed, setFailed] = useState(false);
  const [cancelled, setCancelled] = useState<DeactivateClubOutput | null>(null);
  const pending = deactivate.isPending || reactivate.isPending;

  const confirm = async () => {
    setFailed(false);
    try {
      if (confirming === 'deactivate') {
        setCancelled(await deactivate.mutateAsync({ clubId: club.id }));
      } else {
        await reactivate.mutateAsync({ clubId: club.id });
        setCancelled(null);
      }
      setConfirming(null);
    } catch (error) {
      // Already in the requested state (another admin acted): reload the
      // club so the page shows its current status and the right action.
      if (getApiErrorCode(error) === 'BAD_REQUEST') {
        setConfirming(null);
        await Promise.all([
          utils.admin.getClub.invalidate({ clubId: club.id }),
          utils.admin.listClubs.invalidate(),
          utils.admin.listClubTrainerInvitations.invalidate({ clubId: club.id }),
        ]);
      } else {
        setFailed(true);
      }
    }
  };

  return (
    <Panel title={t('common.status')} right={<StatusChip status={club.isActive ? 'active' : 'deactivated'} />}>
      <div className="flex flex-col gap-3 text-[13px]">
        {club.isActive ? (
          <p className="text-muted">
            {t('admin.club.activeSince', {
              date: formatDate(locale, club.createdAt),
              trainers: t('admin.club.activeTrainers', { count: club.activeTrainerCount }),
            })}
          </p>
        ) : (
          <p className="text-muted">
            {club.deactivatedAt
              ? t('admin.club.deactivatedOn', { date: formatDate(locale, club.deactivatedAt) })
              : t('admin.club.deactivatedBody')}
          </p>
        )}
        {cancelled !== null && !club.isActive ? (
          <InlineAlert tone="success" title={t('admin.club.deactivatedTitle')}>
            {t('admin.club.cancelledSummary', {
              requests: t('admin.club.cancelledRequests', { count: cancelled.cancelledCertificationRequests }),
              athleteInvitations: t('admin.club.cancelledAthleteInvitations', {
                count: cancelled.rejectedMembershipInvitations,
              }),
              trainerInvitations: t('admin.club.cancelledTrainerInvitations', {
                count: cancelled.revokedTrainerInvitations,
              }),
            })}
          </InlineAlert>
        ) : null}
        <div>
          {club.isActive ? (
            <Button variant="danger" onClick={() => setConfirming('deactivate')}>
              {t('admin.club.deactivate')}
            </Button>
          ) : (
            <Button onClick={() => setConfirming('reactivate')}>{t('admin.club.reactivate')}</Button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirming === 'deactivate'}
        title={t('admin.club.deactivateTitle', { club: club.name })}
        confirmLabel={t('admin.club.deactivate')}
        pending={pending}
        error={failed ? t('admin.club.deactivateFailed') : undefined}
        onConfirm={() => void confirm()}
        onClose={() => {
          if (!pending) {
            setConfirming(null);
            setFailed(false);
          }
        }}
      >
        <p>{t('admin.club.deactivateBody1')}</p>
        <p>{t('admin.club.deactivateBody2')}</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirming === 'reactivate'}
        title={t('admin.club.reactivateTitle', { club: club.name })}
        confirmLabel={t('admin.club.reactivate')}
        tone="primary"
        pending={pending}
        error={failed ? t('admin.club.reactivateFailed') : undefined}
        onConfirm={() => void confirm()}
        onClose={() => {
          if (!pending) {
            setConfirming(null);
            setFailed(false);
          }
        }}
      >
        <p>{t('admin.club.reactivateBody1')}</p>
        <p>{t('admin.club.reactivateBody2')}</p>
      </ConfirmDialog>
    </Panel>
  );
}

export function ClubDetailView({ clubId }: { clubId: string }) {
  const { t } = useWebLocalization();
  const club = useAdminClub(clubId);

  if (club.isPending) {
    return (
      <>
        <TopBar crumbs={[{ label: t('nav.clubs'), href: '/admin/clubs' }, { label: t('admin.club.crumb') }]} />
        <PageBody>
          <LoadingState label={t('admin.club.loading')} />
        </PageBody>
      </>
    );
  }

  if (club.isError) {
    const code = getApiErrorCode(club.error);
    // An unknown or malformed id.
    if (code === 'NOT_FOUND' || code === 'BAD_REQUEST') return <ClubNotFound />;
    return (
      <>
        <TopBar crumbs={[{ label: t('nav.clubs'), href: '/admin/clubs' }, { label: t('admin.club.crumb') }]} />
        <PageBody>
          <ErrorState title={t('admin.club.loadFailed')} onRetry={() => void club.refetch()} />
        </PageBody>
      </>
    );
  }

  const data = club.data;
  return (
    <>
      <TopBar
        crumbs={[{ label: t('nav.clubs'), href: '/admin/clubs' }, { label: data.name }]}
        action={
          <Link href={`/admin/clubs/${data.id}/trainers`} className={buttonClasses('secondary')}>
            {t('admin.club.trainers')}
          </Link>
        }
      />
      <PageBody>
        <PageHeader title={data.name} sub={<span className="font-mono">{data.slug}</span>} />
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-[18px]">
          <Panel title={t('admin.club.details')}>
            {/* Remount on server changes so the form shows the saved values. */}
            <EditClubForm key={`${data.name}|${data.countryCode}|${data.city ?? ''}`} club={data} />
          </Panel>
          <StatusPanel club={data} />
        </div>
      </PageBody>
    </>
  );
}
