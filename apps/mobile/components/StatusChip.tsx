import { achievementChip, type VerificationStatusValue } from '@packages/shared-logic';
import type { ReactElement } from 'react';

import { Chip } from './Chip';

// Unverified / Pending / Verified / Rejected pill for an achievement.
export function StatusChip({ status, small = false }: { status: VerificationStatusValue; small?: boolean }): ReactElement {
  const chip = achievementChip(status);
  return (
    <Chip
      label={chip.label}
      tone={chip.tone}
      icon={chip.icon}
      accessibilityLabel={chip.accessibilityLabel}
      small={small}
    />
  );
}
