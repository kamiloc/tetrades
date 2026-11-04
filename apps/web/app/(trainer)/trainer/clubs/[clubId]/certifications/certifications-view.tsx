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
import { TRAINER_NOTICE_COPY } from '../../../../../../lib/trainer/errors';
import {
  useCurrentClub,
  useRefreshOnLostAccess,
  useTrainerErrors,
} from '../../../../../../lib/trainer/use-trainer';
import { LoadMore } from '../../../_components/load-more';

type Deciding = { kind: 'approve' | 'reject'; request: PendingCertificationOutput } | null;


export function CertificationsView({ clubId }: { clubId: string }) {
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
  const clubName = club?.name ?? 'Club';

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
          reason.trim() === '' ? 'Give the athlete a reason.' : 'Use at most 300 characters.',
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
            ? `Certified "${request.achievement.title}" for ${request.athlete.displayName}.`
            : `Rejected "${request.achievement.title}". ${request.athlete.displayName} sees your reason.`,
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
      setFailure(TRAINER_NOTICE_COPY[result.kind]);
    }
  };

  const columns: Column<PendingCertificationOutput>[] = [
    {
      header: 'Achievement',
      className: 'w-[32%]',
      cell: (r) => <NameCell title={r.achievement.title} sub={r.achievement.organization} />,
    },
    { header: 'Date', cell: (r) => <span className="text-muted">{formatDate(r.achievement.achievedOn)}</span> },
    {
      header: 'Athlete',
      cell: (r) => <NameCell title={r.athlete.displayName} sub={`@${r.athlete.slug}`} />,
    },
    { header: 'Requested', cell: (r) => <span className="text-muted">{formatDate(r.requestedAt)}</span> },
    {
      header: 'Actions',
      hideHeader: true,
      align: 'right',
      className: 'w-[180px]',
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="danger"
            aria-label={`Reject ${r.achievement.title}`}
            onClick={() => {
              setNotice(null);
              setDeciding({ kind: 'reject', request: r });
            }}
          >
            Reject
          </Button>
          <Button
            size="sm"
            variant="primary"
            aria-label={`Approve ${r.achievement.title}`}
            onClick={() => {
              setNotice(null);
              setDeciding({ kind: 'approve', request: r });
            }}
          >
            Approve
          </Button>
        </div>
      ),
    },
  ];

  const summary =
    deciding !== null ? (
      <p>
        <strong>{deciding.request.achievement.title}</strong> · {deciding.request.achievement.organization},{' '}
        {formatDate(deciding.request.achievement.achievedOn)}, by {deciding.request.athlete.displayName}.
      </p>
    ) : null;

  return (
    <>
      <TopBar
        crumbs={[{ label: clubName, href: `/trainer/clubs/${clubId}/athletes` }, { label: 'Certifications' }]}
      />
      <PageBody>
        <PageHeader
          title="Certifications"
          sub="Achievements your club's athletes asked the club to certify."
        />
        {notice ? (
          <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert>
        ) : null}
        {queue.isPending || lostAccess ? (
          <LoadingState label="Loading requests…" />
        ) : queue.isError ? (
          <ErrorState title="We couldn't load the requests" onRetry={() => void queue.refetch()} />
        ) : (
          <>
            <Table
              caption={`Pending certification requests for ${clubName}`}
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              empty={
                <EmptyState icon="check" title="Nothing to review">
                  When an athlete asks the club to certify an achievement, it appears here.
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
        title="Certify this achievement?"
        confirmLabel="Approve"
        tone="primary"
        pending={decide.isPending}
        error={failure}
        onConfirm={() => void confirm()}
        onClose={close}
      >
        {summary}
        <p className="text-muted">The achievement shows as certified by {clubName}.</p>
      </ConfirmDialog>

      <Dialog
        open={deciding?.kind === 'reject'}
        onClose={close}
        title="Reject this request?"
        width="sm"
        footer={
          <>
            <Button onClick={close} disabled={decide.isPending}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" form="reject-form" disabled={decide.isPending}>
              {decide.isPending ? 'Working…' : 'Reject'}
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
          <Field id="reject-reason" label="Reason" hint="The athlete sees this reason." error={reasonError}>
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
