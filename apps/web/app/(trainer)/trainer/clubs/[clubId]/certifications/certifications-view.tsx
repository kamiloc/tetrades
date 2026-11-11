'use client';

import { trpc, useDecideCertification } from '@packages/api-client';
import { rejectionReasonSchema, type PendingCertificationOutput } from '@packages/validators';
import { useState } from 'react';

import { Button } from '../../../../../../components/button';
import { ConfirmDialog } from '../../../../../../components/confirm-dialog';
import { Dialog } from '../../../../../../components/dialog';
import { describedBy, Field } from '../../../../../../components/field';
import { focusRing } from '../../../../../../components/focus';
import { InlineAlert } from '../../../../../../components/inline-alert';
import { PageBody, PageHeader } from '../../../../../../components/layout';
import { TopBar } from '../../../../../../components/portal-shell';
import { EmptyState, ErrorState, LoadingState } from '../../../../../../components/states';
import { NameCell, Table, type Column } from '../../../../../../components/table';
import { formatDate } from '../../../../../../lib/format';
import { useWebLocalization } from '../../../../../../lib/i18n';
import { TRAINER_NOTICE_COPY } from '../../../../../../lib/trainer/errors';
import {
  useCurrentClub,
  useRefreshOnLostAccess,
  useTrainerErrors,
} from '../../../../../../lib/trainer/use-trainer';
import { LoadMore } from '../../../_components/load-more';

type Deciding = { kind: 'approve' | 'reject'; request: PendingCertificationOutput } | null;


export function CertificationsView({ clubId }: { clubId: string }) {
  const { locale, t, rich } = useWebLocalization();
  const { club } = useCurrentClub(clubId);
  const utils = trpc.useUtils();
  const queue = trpc.achievement.listPendingCertifications.useInfiniteQuery(
    { clubId, take: 20 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );
  const lostAccess = useRefreshOnLostAccess(queue.error);
  const decide = useDecideCertification();
  const resolveError = useTrainerErrors(clubId);

  const [deciding, setDeciding] = useState<Deciding>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'warning'; text: string } | null>(null);

  const rows = queue.data?.pages.flatMap((page) => page.items) ?? [];
  const clubName = club?.name ?? t('trainer.clubLabel');

  const close = () => {
    if (decide.isPending) return;
    setDeciding(null);
    setReason('');
    setReasonError(undefined);
    setFailure(null);
  };

  const confirm = async () => {
    if (deciding === null) return;
    const { request } = deciding;
    setFailure(null);
    let input: Parameters<typeof decide.mutateAsync>[0];
    if (deciding.kind === 'reject') {
      const parsed = rejectionReasonSchema.safeParse(reason);
      if (!parsed.success) {
        setReasonError(
          reason.trim() === '' ? t('certs.reasonRequired') : t('certs.reasonTooLong'),
        );
        return;
      }
      setReasonError(undefined);
      input = { clubId, requestId: request.id, decision: 'REJECT', rejectionReason: parsed.data };
    } else {
      input = { clubId, requestId: request.id, decision: 'APPROVE' };
    }

    try {
      await decide.mutateAsync(input);
      setNotice({
        tone: 'success',
        text:
          deciding.kind === 'approve'
            ? t('certs.certified', { achievement: request.achievement.title, athlete: request.athlete.displayName })
            : t('certs.rejected', { achievement: request.achievement.title, athlete: request.athlete.displayName }),
      });
      setDeciding(null);
      setReason('');
    } catch (error) {
      // The dialog says why; the queue refreshes behind it (spec). A lost
      // trainer role refreshes the page into the club guard instead.
      const result = await resolveError(error, 'decide-certification');
      if (result.kind === 'no-longer-pending' || result.kind === 'no-longer-member') {
        void utils.achievement.listPendingCertifications.invalidate({ clubId });
      }
      setFailure(t(TRAINER_NOTICE_COPY[result.kind]));
    }
  };

  const columns: Column<PendingCertificationOutput>[] = [
    {
      header: t('certs.colAchievement'),
      className: 'w-[32%]',
      cell: (r) => <NameCell title={r.achievement.title} sub={r.achievement.organization} />,
    },
    { header: t('certs.colDate'), cell: (r) => <span className="text-muted">{formatDate(locale, r.achievement.achievedOn)}</span> },
    {
      header: t('common.athlete'),
      cell: (r) => <NameCell title={r.athlete.displayName} sub={`@${r.athlete.slug}`} />,
    },
    { header: t('certs.colRequested'), cell: (r) => <span className="text-muted">{formatDate(locale, r.requestedAt)}</span> },
    {
      header: t('common.actions'),
      hideHeader: true,
      align: 'right',
      className: 'w-[180px]',
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="danger"
            aria-label={t('certs.rejectLabel', { achievement: r.achievement.title })}
            onClick={() => {
              setNotice(null);
              setDeciding({ kind: 'reject', request: r });
            }}
          >
            {t('certs.reject')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            aria-label={t('certs.approveLabel', { achievement: r.achievement.title })}
            onClick={() => {
              setNotice(null);
              setDeciding({ kind: 'approve', request: r });
            }}
          >
            {t('certs.approve')}
          </Button>
        </div>
      ),
    },
  ];

  const summary =
    deciding !== null ? (
      <p>
        {rich('certs.summary', {
          achievement: <strong>{deciding.request.achievement.title}</strong>,
          organization: deciding.request.achievement.organization,
          date: formatDate(locale, deciding.request.achievement.achievedOn),
          athlete: deciding.request.athlete.displayName,
        })}
      </p>
    ) : null;

  return (
    <>
      <TopBar
        crumbs={[{ label: clubName, href: `/trainer/clubs/${clubId}/athletes` }, { label: t('nav.certifications') }]}
      />
      <PageBody>
        <PageHeader
          title={t('nav.certifications')}
          sub={t('certs.sub')}
        />
        {notice ? (
          <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert>
        ) : null}
        {queue.isPending || lostAccess ? (
          <LoadingState label={t('certs.loading')} />
        ) : queue.isError ? (
          <ErrorState title={t('certs.loadFailed')} onRetry={() => void queue.refetch()} />
        ) : (
          <>
            <Table
              caption={t('certs.caption', { club: clubName })}
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              empty={
                <EmptyState icon="check" title={t('certs.emptyTitle')}>
                  {t('certs.emptyBody')}
                </EmptyState>
              }
            />
            <LoadMore
              show={queue.hasNextPage}
              loading={queue.isFetchingNextPage}
              onClick={() => void queue.fetchNextPage()}
            />
          </>
        )}
      </PageBody>

      <ConfirmDialog
        open={deciding?.kind === 'approve'}
        title={t('certs.approveTitle')}
        confirmLabel={t('certs.approve')}
        tone="primary"
        pending={decide.isPending}
        error={failure}
        onConfirm={() => void confirm()}
        onClose={close}
      >
        {summary}
        <p className="text-muted">{t('certs.approveBody', { club: clubName })}</p>
      </ConfirmDialog>

      <Dialog
        open={deciding?.kind === 'reject'}
        onClose={close}
        title={t('certs.rejectTitle')}
        width="sm"
        footer={
          <>
            <Button onClick={close} disabled={decide.isPending}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" type="submit" form="reject-form" disabled={decide.isPending}>
              {decide.isPending ? t('common.working') : t('certs.reject')}
            </Button>
          </>
        }
      >
        <div className="text-[13px] text-text">{summary}</div>
        <form
          id="reject-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          <Field id="reject-reason" label={t('certs.reason')} hint={t('certs.reasonHint')} error={reasonError}>
            <textarea
              id="reject-reason"
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={decide.isPending}
              aria-invalid={reasonError !== undefined || undefined}
              aria-describedby={describedBy('reject-reason', true, reasonError)}
              className={`w-full rounded-[10px] border bg-paper px-3 py-2 text-[13px] text-text placeholder:text-subtle ${reasonError ? 'border-rejected' : 'border-line'} ${focusRing}`}
            />
          </Field>
        </form>
        {failure ? <InlineAlert tone="error">{failure}</InlineAlert> : null}
      </Dialog>
    </>
  );
}
