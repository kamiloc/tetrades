'use client';

import { trpc, useReportMetricEntry } from '@packages/api-client';
import type { ClubRosterEntryOutput, MetricDefinitionPublicOutput } from '@packages/validators';
import { useMemo, useState } from 'react';

import { Button } from '../../../../../../../components/button';
import { Dialog } from '../../../../../../../components/dialog';
import { describedBy, Field, Select, TextInput } from '../../../../../../../components/field';
import { InlineAlert } from '../../../../../../../components/inline-alert';
import { formatNumber } from '../../../../../../../lib/format';
import { useWebLocalization } from '../../../../../../../lib/i18n';
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
  const { locale, t } = useWebLocalization();
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
      ...(selected === undefined ? { metric: t('logMetric.chooseMetricError') } : {}),
      ...(valueText.trim() === ''
        ? { value: t('logMetric.valueRequired') }
        : value === null
          ? { value: t('logMetric.valueInvalid') }
          : {}),
      ...(measuredAt === null
        ? { day: day > localDay(new Date()) ? t('logMetric.dateFuture') : t('logMetric.dateInvalid') }
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
      onLogged(t('logMetric.logged', { metric: selected.name, value: formatNumber(locale, value, 3), unit: selected.unit }));
      close();
    } catch (error) {
      const notice = await resolveError(error, 'report-entry');
      setFailure(t(TRAINER_NOTICE_COPY[notice.kind]));
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
      title={t('athlete.logMetric')}
      description={t('logMetric.description', { athlete: athlete.displayName })}
      footer={
        <>
          <Button onClick={close} disabled={report.isPending}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" form="log-metric-form" disabled={report.isPending}>
            {report.isPending ? t('common.saving') : t('logMetric.save')}
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
        <Field id="log-metric" label={t('athlete.colMetric')} error={errors.metric}>
          <Select
            id="log-metric"
            value={metricId}
            onChange={(event) => setMetricId(event.target.value)}
            invalid={errors.metric !== undefined}
            aria-describedby={describedBy('log-metric', undefined, errors.metric)}
            disabled={report.isPending}
          >
            <option value="">{t('logMetric.chooseMetric')}</option>
            {catalog.sport.length > 0 ? (
              <optgroup label={t('logMetric.sportMetrics', { sport: athlete.sport.name })}>
                {catalog.sport.map((d) => (
                  <option key={d.id} value={d.id}>
                    {t('logMetric.option', { name: d.name, unit: d.unit })}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {catalog.general.length > 0 ? (
              <optgroup label={t('logMetric.general')}>
                {catalog.general.map((d) => (
                  <option key={d.id} value={d.id}>
                    {t('logMetric.option', { name: d.name, unit: d.unit })}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="log-value"
            label={selected ? t('logMetric.valueUnit', { unit: selected.unit }) : t('athlete.colValue')}
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
          <Field id="log-day" label={t('logMetric.measuredOn')} error={errors.day}>
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
        {t('logMetric.permanent', { club: clubName })}
      </InlineAlert>
      {failure ? <InlineAlert tone="error">{failure}</InlineAlert> : null}
    </Dialog>
  );
}
