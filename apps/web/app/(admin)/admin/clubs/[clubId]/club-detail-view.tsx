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
import { formatDate, plural } from '../../../../../lib/format';
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
      {result === 'saved' ? <InlineAlert tone="success">Changes saved.</InlineAlert> : null}
      {result === 'failed' ? (
        <InlineAlert tone="error">We couldn&apos;t save the changes. Try again.</InlineAlert>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={!dirty || updateClub.isPending}>
          {updateClub.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          onClick={() => {
            setValues(original);
            setErrors({});
          }}
          disabled={!dirty || updateClub.isPending}
        >
          Discard
        </Button>
      </div>
    </form>
  );
}

function StatusPanel({ club }: { club: AdminClubOutput }) {
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
    <Panel title="Status" right={<StatusChip status={club.isActive ? 'active' : 'deactivated'} />}>
      <div className="flex flex-col gap-3 text-[13px]">
        {club.isActive ? (
          <p className="text-muted">
            Active since {formatDate(club.createdAt)}.{' '}
            {plural(club.activeTrainerCount, 'active trainer', 'active trainers')}.
          </p>
        ) : (
          <p className="text-muted">
            Deactivated{club.deactivatedAt ? ` on ${formatDate(club.deactivatedAt)}` : ''}. Trainers
            have no access while the club is deactivated.
          </p>
        )}
        {cancelled !== null && !club.isActive ? (
          <InlineAlert tone="success" title="Club deactivated">
            Cancelled{' '}
            {plural(
              cancelled.cancelledCertificationRequests,
              'pending certification request',
              'pending certification requests',
            )}
            ,{' '}
            {plural(
              cancelled.rejectedMembershipInvitations,
              'athlete invitation',
              'athlete invitations',
            )}{' '}
            and{' '}
            {plural(
              cancelled.revokedTrainerInvitations,
              'trainer invitation',
              'trainer invitations',
            )}
            .
          </InlineAlert>
        ) : null}
        <div>
          {club.isActive ? (
            <Button variant="danger" onClick={() => setConfirming('deactivate')}>
              Deactivate club
            </Button>
          ) : (
            <Button onClick={() => setConfirming('reactivate')}>Reactivate club</Button>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirming === 'deactivate'}
        title={`Deactivate ${club.name}?`}
        confirmLabel="Deactivate club"
        pending={pending}
        error={failed ? "We couldn't deactivate the club. Try again." : undefined}
        onConfirm={() => void confirm()}
        onClose={() => {
          if (!pending) {
            setConfirming(null);
            setFailed(false);
          }
        }}
      >
        <p>Its trainers lose access to the club at once.</p>
        <p>
          Pending certification requests, athlete invitations and trainer invitations are cancelled.
          You&apos;ll see how many of each.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirming === 'reactivate'}
        title={`Reactivate ${club.name}?`}
        confirmLabel="Reactivate club"
        tone="primary"
        pending={pending}
        error={failed ? "We couldn't reactivate the club. Try again." : undefined}
        onConfirm={() => void confirm()}
        onClose={() => {
          if (!pending) {
            setConfirming(null);
            setFailed(false);
          }
        }}
      >
        <p>Trainers who weren&apos;t revoked regain access.</p>
        <p>
          Certification requests and invitations cancelled when the club was deactivated stay
          cancelled. Send new invitations if you need them.
        </p>
      </ConfirmDialog>
    </Panel>
  );
}

export function ClubDetailView({ clubId }: { clubId: string }) {
  const club = useAdminClub(clubId);

  if (club.isPending) {
    return (
      <>
        <TopBar crumbs={[{ label: 'Clubs', href: '/admin/clubs' }, { label: 'Club' }]} />
        <PageBody>
          <LoadingState label="Loading club…" />
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
        <TopBar crumbs={[{ label: 'Clubs', href: '/admin/clubs' }, { label: 'Club' }]} />
        <PageBody>
          <ErrorState title="We couldn't load this club" onRetry={() => void club.refetch()} />
        </PageBody>
      </>
    );
  }

  const data = club.data;
  return (
    <>
      <TopBar
        crumbs={[{ label: 'Clubs', href: '/admin/clubs' }, { label: data.name }]}
        action={
          <Link href={`/admin/clubs/${data.id}/trainers`} className={buttonClasses('secondary')}>
            Trainers
          </Link>
        }
      />
      <PageBody>
        <PageHeader title={data.name} sub={<span className="font-mono">{data.slug}</span>} />
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-[18px]">
          <Panel title="Details">
            {/* Remount on server changes so the form shows the saved values. */}
            <EditClubForm key={`${data.name}|${data.countryCode}|${data.city ?? ''}`} club={data} />
          </Panel>
          <StatusPanel club={data} />
        </div>
      </PageBody>
    </>
  );
}
