'use client';

import { getApiErrorCode } from '@packages/api-client';
import { useState } from 'react';

import { Button } from '../../../../components/button';
import { Dialog } from '../../../../components/dialog';
import { InlineAlert } from '../../../../components/inline-alert';
import { useWebLocalization } from '../../../../lib/i18n';
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
  const { t } = useWebLocalization();
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
        setErrors({ slug: 'admin.clubForm.slugTaken' });
      } else {
        setFailure(true);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('admin.clubForm.title')}
      description={t('admin.clubForm.description')}
      footer={
        <>
          <Button onClick={close} disabled={createClub.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="create-club-form"
            disabled={createClub.isPending}
          >
            {createClub.isPending ? t('admin.clubForm.creating') : t('admin.clubs.create')}
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
        <InlineAlert tone="error">{t('admin.clubForm.createFailed')}</InlineAlert>
      ) : null}
    </Dialog>
  );
}
