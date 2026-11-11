'use client';

import { trpc, useReportMetricEntry } from '@packages/api-client';
import type { ClubRosterEntryOutput, MetricDefinitionPublicOutput } from '@packages/validators';
import { useMemo, useState } from 'react';

import { Button } from '../../../../../../../components/button';
import { Dialog } from '../../../../../../../components/dialog';
import { describedBy, Field, Select, TextInput } from '../../../../../../../components/field';
import { InlineAlert } from '../../../../../../../components/inline-alert';
import { TRAINER_NOTICE_COPY } from '../../../../../../../lib/trainer/errors';
import { localDay, measuredAtFor } from '../../../../../../../lib/trainer/measured-at';
import { catalogForSport } from '../../../../../../../lib/trainer/metric-catalog';
import { useTrainerErrors } from '../../../../../../../lib/trainer/use-trainer';

interface Errors {
  metric?: string;
  value?: string;
  day?: string;
}

/** A decimal typed with a point or a comma; null unless finite. */
export function parseMetricValue(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

// Log a trainer-reported entry (design D4). Entries are append-only.
export function LogMetricDialog({
  open,
  onClose,
  onLogged,
  clubId,
  clubName,
  athlete,
  definitions,
}: {
  open: boolean;
  onClose: () => void;
  onLogged: (label: string) => void;
  clubId: string;
  clubName: string;
  athlete: ClubRosterEntryOutput['athlete'];
  definitions: MetricDefinitionPublicOutput[];
}) {
  const report = useReportMetricEntry();
  const utils = trpc.useUtils();
  const resolveError = useTrainerErrors(clubId);
  const catalog = useMemo(() => catalogForSport(definitions, athlete.sport.id), [definitions, athlete.sport.id]);
  const [metricId, setMetricId] = useState('');
  const [valueText, setValueText] = useState('');
  const [day, setDay] = useState(() => localDay(new Date()));
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);

  const selected = [...catalog.sport, ...catalog.general].find((d) => d.id === metricId);

  const close = () => {
    if (report.isPending) return;
    setMetricId('');
    setValueText('');
    setDay(localDay(new Date()));
    setErrors({});
    setFailure(null);
    onClose();
  };

  const submit = async () => {
    setFailure(null);
    const value = parseMetricValue(valueText);
    const measuredAt = measuredAtFor(day, new Date());
    const next: Errors = {
      ...(selected === undefined ? { metric: 'Choose a metric.' } : {}),
      ...(valueText.trim() === ''
        ? { value: 'Enter a value.' }
        : value === null
          ? { value: 'Enter a number, like 11.42.' }
          : {}),
      ...(measuredAt === null
        ? { day: day > localDay(new Date()) ? "The date can't be in the future." : 'Enter a valid date.' }
        : {}),
    };
    setErrors(next);
    if (selected === undefined || value === null || measuredAt === null) return;

    try {
      await report.mutateAsync({
        clubId,
        athleteId: athlete.id,
        metricDefinitionId: selected.id,
        value,
        measuredAt,
      });
      onLogged(`${selected.name}: ${value} ${selected.unit}`);
      close();
    } catch (error) {
      const notice = await resolveError(error, 'report-entry');
      setFailure(TRAINER_NOTICE_COPY[notice.kind]);
      // The membership ended meanwhile: refresh the athlete (spec).
      if (notice.kind === 'no-longer-member') {
        void utils.club.getRosterAthlete.invalidate({ clubId, athleteId: athlete.id });
      }
    }
  };

  const today = localDay(new Date());

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Log metric"
      description={`For ${athlete.displayName}. Trainer-reported entries can't be edited or deleted.`}
      footer={
        <>
          <Button onClick={close} disabled={report.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="log-metric-form" disabled={report.isPending}>
            {report.isPending ? 'Saving…' : 'Save entry'}
          </Button>
        </>
      }
    >
      <form
        id="log-metric-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field id="log-metric" label="Metric" error={errors.metric}>
          <Select
            id="log-metric"
            value={metricId}
            onChange={(event) => setMetricId(event.target.value)}
            invalid={errors.metric !== undefined}
            aria-describedby={describedBy('log-metric', undefined, errors.metric)}
            disabled={report.isPending}
          >
            <option value="">Choose a metric</option>
            {catalog.sport.length > 0 ? (
              <optgroup label={`${athlete.sport.name} metrics`}>
                {catalog.sport.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.unit})
                  </option>
                ))}
              </optgroup>
            ) : null}
            {catalog.general.length > 0 ? (
              <optgroup label="General">
                {catalog.general.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.unit})
                  </option>
                ))}
              </optgroup>
            ) : null}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="log-value"
            label={selected ? `Value (${selected.unit})` : 'Value'}
            error={errors.value}
          >
            <TextInput
              id="log-value"
              inputMode="decimal"
              value={valueText}
              onChange={(event) => setValueText(event.target.value)}
              invalid={errors.value !== undefined}
              aria-describedby={describedBy('log-value', undefined, errors.value)}
              disabled={report.isPending}
              autoComplete="off"
            />
          </Field>
          <Field id="log-day" label="Measured on" error={errors.day}>
            <TextInput
              id="log-day"
              type="date"
              max={today}
              value={day}
              onChange={(event) => setDay(event.target.value)}
              invalid={errors.day !== undefined}
              aria-describedby={describedBy('log-day', undefined, errors.day)}
              disabled={report.isPending}
            />
          </Field>
        </div>
      </form>
      <InlineAlert tone="info">
        This entry is trainer-reported and permanent: it can&apos;t be edited or deleted. It shows
        as reported by {clubName}.
      </InlineAlert>
      {failure ? <InlineAlert tone="error">{failure}</InlineAlert> : null}
    </Dialog>
  );
}
