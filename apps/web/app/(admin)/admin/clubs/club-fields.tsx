'use client';

import { createClubInput, updateClubInput } from '@packages/validators';

import { describedBy, Field, TextInput } from '../../../../components/field';

// Club form fields shared by the create dialog and the edit form. Values are
// validated with the same Zod schemas the API uses before anything is sent.

export interface ClubValues {
  name: string;
  slug: string;
  countryCode: string;
  city: string;
}

export type ClubErrors = Partial<Record<keyof ClubValues, string>>;

const MESSAGES: Record<keyof ClubValues, string> = {
  name: 'Enter a name of 2 to 150 characters.',
  slug: 'Use 3 to 60 lowercase letters, numbers and single hyphens, like liga-antioquia.',
  countryCode: 'Use a two-letter country code, like CO.',
  city: 'Keep the city under 100 characters.',
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
  const set = (key: keyof ClubValues) => (event: { target: { value: string } }) =>
    onChange({ ...values, [key]: event.target.value });
  const id = (key: keyof ClubValues) => `${idPrefix}-${key}`;
  const slugHint = slugReadOnly
    ? "The slug can't be changed after the club is created."
    : "Used in the club's address. It can't be changed later.";

  return (
    <>
      <Field id={id('name')} label="Name" error={errors.name}>
        <TextInput
          id={id('name')}
          value={values.name}
          onChange={set('name')}
          disabled={disabled}
          invalid={errors.name !== undefined}
          aria-describedby={describedBy(id('name'), undefined, errors.name)}
          autoComplete="off"
        />
      </Field>
      <Field id={id('slug')} label="Slug" hint={slugHint} error={errors.slug}>
        <TextInput
          id={id('slug')}
          value={values.slug}
          onChange={set('slug')}
          readOnly={slugReadOnly}
          disabled={disabled && !slugReadOnly}
          mono
          invalid={errors.slug !== undefined}
          aria-describedby={describedBy(id('slug'), slugHint, errors.slug)}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
        <Field id={id('countryCode')} label="Country" error={errors.countryCode}>
          <TextInput
            id={id('countryCode')}
            value={values.countryCode}
            onChange={set('countryCode')}
            disabled={disabled}
            maxLength={2}
            placeholder="CO"
            className="uppercase"
            invalid={errors.countryCode !== undefined}
            aria-describedby={describedBy(id('countryCode'), undefined, errors.countryCode)}
            autoComplete="off"
          />
        </Field>
        <Field id={id('city')} label="City (optional)" error={errors.city}>
          <TextInput
            id={id('city')}
            value={values.city}
            onChange={set('city')}
            disabled={disabled}
            invalid={errors.city !== undefined}
            aria-describedby={describedBy(id('city'), undefined, errors.city)}
            autoComplete="off"
          />
        </Field>
      </div>
    </>
  );
}
