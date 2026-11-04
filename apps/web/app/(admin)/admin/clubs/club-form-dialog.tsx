'use client';

import { getApiErrorCode } from '@packages/api-client';
import { useState } from 'react';

import { Button } from '../../../../components/button';
import { Dialog } from '../../../../components/dialog';
import { InlineAlert } from '../../../../components/inline-alert';
import { useCreateClubMutation } from '../../../../lib/portal-mutations';

import { ClubFields, validateCreate, type ClubErrors, type ClubValues } from './club-fields';

const EMPTY: ClubValues = { name: '', slug: '', countryCode: 'CO', city: '' };

export function ClubFormDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (club: { id: string; name: string }) => void;
}) {
  const createClub = useCreateClubMutation();
  const [values, setValues] = useState<ClubValues>(EMPTY);
  const [errors, setErrors] = useState<ClubErrors>({});
  const [failure, setFailure] = useState(false);

  const close = () => {
    if (createClub.isPending) return;
    setValues(EMPTY);
    setErrors({});
    setFailure(false);
    onClose();
  };

  const submit = async () => {
    setFailure(false);
    const result = validateCreate(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    try {
      const club = await createClub.mutateAsync(result.input);
      setValues(EMPTY);
      onCreated({ id: club.id, name: club.name });
    } catch (error) {
      if (getApiErrorCode(error) === 'CONFLICT') {
        setErrors({ slug: 'That slug is already used by another club.' });
      } else {
        setFailure(true);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Create a club"
      description="New clubs start active. Clubs can be deactivated later, never deleted."
      footer={
        <>
          <Button onClick={close} disabled={createClub.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="create-club-form"
            disabled={createClub.isPending}
          >
            {createClub.isPending ? 'Creating…' : 'Create club'}
          </Button>
        </>
      }
    >
      <form
        id="create-club-form"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <ClubFields
          idPrefix="create-club"
          values={values}
          errors={errors}
          onChange={setValues}
          disabled={createClub.isPending}
        />
      </form>
      {failure ? (
        <InlineAlert tone="error">We couldn&apos;t create the club. Try again.</InlineAlert>
      ) : null}
    </Dialog>
  );
}
