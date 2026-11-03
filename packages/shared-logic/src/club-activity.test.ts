import { describe, expect, it } from 'vitest';

import { clubActivityChip } from './club-activity.js';

describe('clubActivityChip', () => {
  it('labels a deactivated club "Inactive club" in the pending tone', () => {
    expect(clubActivityChip({ isActive: false })).toEqual({
      label: 'Inactive club',
      tone: 'pending',
      icon: 'alert-circle',
      accessibilityLabel: 'This club is inactive',
    });
  });

  it('shows no chip for an active club', () => {
    expect(clubActivityChip({ isActive: true })).toBeNull();
  });
});
