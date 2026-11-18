'use client';

import { createClubInput, updateClubInput } from '@packages/validators';

import { describedBy, Field, TextInput } from '../../../../components/field';
import { useWebLocalization } from '../../../../lib/i18n';
import type { MessageKey } from '../../../../lib/translations';

// Club form fields shared by the create dialog and the edit form. Values are
// validated with the same Zod schemas the API uses before anything is sent.

export interface ClubValues {
  name: string;
  slug: string;
  countryCode: string;
  city: string;
}

/** Message keys, translated when shown. */
export type ClubErrors = Partial<Record<keyof ClubValues, MessageKey>>;

const MESSAGES: Record<keyof ClubValues, MessageKey> = {
  name: 'admin.clubForm.nameInvalid',
  slug: 'admin.clubForm.slugInvalid',
  countryCode: 'admin.clubForm.countryInvalid',
  city: 'admin.clubForm.cityInvalid',
};

function collect(issues: { path: (string | number)[] }[]): ClubErrors {
  const errors: ClubErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (key === 'name' || key === 'slug' || key === 'countryCode' || key === 'city') {
      errors[key] = MESSAGES[key];
    }
  }
  return errors;
}

const cityOrNull = (city: string) => (city.trim() === '' ? null : city);

export function validateCreate(values: ClubValues) {
  const result = createClubInput.safeParse({
    slug: values.slug.trim(),
    name: values.name,
    countryCode: values.countryCode.trim(),
    city: cityOrNull(values.city),
  });
  return result.success
    ? ({ ok: true, input: result.data } as const)
    : ({ ok: false, errors: collect(result.error.issues) } as const);
}

export function validateUpdate(clubId: string, values: ClubValues) {
  const result = updateClubInput.safeParse({
    clubId,
    name: values.name,
    countryCode: values.countryCode.trim(),
    city: cityOrNull(values.city),
  });
  return result.success
    ? ({ ok: true, input: result.data } as const)
    : ({ ok: false, errors: collect(result.error.issues) } as const);
}

export function ClubFields({
  idPrefix,
  values,
  errors,
  onChange,
  slugReadOnly = false,
  disabled = false,
}: {
  idPrefix: string;
  values: ClubValues;
  errors: ClubErrors;
  onChange: (values: ClubValues) => void;
  slugReadOnly?: boolean;
  disabled?: boolean;
}) {
  const { t } = useWebLocalization();
  const error = (key: keyof ClubValues): string | undefined => {
    const message = errors[key];
    return message === undefined ? undefined : t(message);
  };
  const set = (key: keyof ClubValues) => (event: { target: { value: string } }) =>
    onChange({ ...values, [key]: event.target.value });
  const id = (key: keyof ClubValues) => `${idPrefix}-${key}`;
  const slugHint = slugReadOnly
    ? t('admin.clubForm.slugFixed')
    : t('admin.clubForm.slugHint');

  return (
    <>
      <Field id={id('name')} label={t('admin.clubForm.name')} error={error('name')}>
        <TextInput
          id={id('name')}
          value={values.name}
          onChange={set('name')}
          disabled={disabled}
          invalid={errors.name !== undefined}
          aria-describedby={describedBy(id('name'), undefined, error('name'))}
          autoComplete="off"
        />
      </Field>
      <Field id={id('slug')} label={t('admin.clubForm.slug')} hint={slugHint} error={error('slug')}>
        <TextInput
          id={id('slug')}
          value={values.slug}
          onChange={set('slug')}
          readOnly={slugReadOnly}
          disabled={disabled && !slugReadOnly}
          mono
          invalid={errors.slug !== undefined}
          aria-describedby={describedBy(id('slug'), slugHint, error('slug'))}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
        <Field id={id('countryCode')} label={t('admin.clubForm.country')} error={error('countryCode')}>
          <TextInput
            id={id('countryCode')}
            value={values.countryCode}
            onChange={set('countryCode')}
            disabled={disabled}
            maxLength={2}
            placeholder="CO"
            className="uppercase"
            invalid={errors.countryCode !== undefined}
            aria-describedby={describedBy(id('countryCode'), undefined, error('countryCode'))}
            autoComplete="off"
          />
        </Field>
        <Field id={id('city')} label={t('admin.clubForm.city')} error={error('city')}>
          <TextInput
            id={id('city')}
            value={values.city}
            onChange={set('city')}
            disabled={disabled}
            invalid={errors.city !== undefined}
            aria-describedby={describedBy(id('city'), undefined, error('city'))}
            autoComplete="off"
          />
        </Field>
      </div>
    </>
  );
}
