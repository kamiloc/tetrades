// "Inactive club" chip (ADR-017, D10). A deactivated club keeps appearing in
// the athlete's club history; the chip labels it, and Leave stays available
// for an ACTIVE membership. The API sends the derived `isActive` flag only.

import type { ChipTone } from './achievement-chip.js';

export interface ClubActivityChip {
  readonly label: string;
  readonly tone: ChipTone;
  readonly icon: 'alert-circle';
  readonly accessibilityLabel: string;
}

const INACTIVE_CLUB_CHIP: ClubActivityChip = {
  label: 'Inactive club',
  tone: 'pending',
  icon: 'alert-circle',
  accessibilityLabel: 'This club is inactive',
};

/** The chip for a deactivated club; null (no chip) for an active one. */
export function clubActivityChip(club: { isActive: boolean }): ClubActivityChip | null {
  return club.isActive ? null : INACTIVE_CLUB_CHIP;
}
