import { achievementChip, type VerificationStatusValue } from '@packages/shared-logic';
import type { ReactElement } from 'react';

import { useMobileLocalization } from '../lib/i18n';

import { Chip } from './Chip';

// Unverified / Pending / Verified / Rejected pill for an achievement. Tone and
// icon come from shared-logic; the copy comes from the app catalog.
export function StatusChip({ status, small = false }: { status: VerificationStatusValue; small?: boolean }): ReactElement {
  const { t } = useMobileLocalization();
  const chip = achievementChip(status);
  return (
    <Chip
      label={t(`status.${status}`)}
      tone={chip.tone}
      icon={chip.icon}
      accessibilityLabel={t(`status.${status}.a11y`)}
      small={small}
    />
  );
}
