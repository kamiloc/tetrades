import { describe, expect, it } from 'vitest';

import {
  VERIFICATION_STATUSES,
  achievementChip,
  canRequestCertification,
} from './achievement-chip.js';

describe('achievementChip', () => {
  it.each([
    ['UNVERIFIED', 'Unverified', 'neutral'],
    ['PENDING', 'Pending', 'pending'],
    ['VERIFIED', 'Verified', 'blue'],
    ['REJECTED', 'Rejected', 'danger'],
  ] as const)('%s shows %s', (status, label, tone) => {
    const chip = achievementChip(status);
    expect(chip.label).toBe(label);
    expect(chip.tone).toBe(tone);
    expect(chip.accessibilityLabel).not.toBe('');
  });

  it('gives every status a distinct label', () => {
    const labels = new Set(VERIFICATION_STATUSES.map((s) => achievementChip(s).label));
    expect(labels.size).toBe(VERIFICATION_STATUSES.length);
  });
});

describe('canRequestCertification', () => {
  it('allows only Unverified and Rejected', () => {
    expect(canRequestCertification('UNVERIFIED')).toBe(true);
    expect(canRequestCertification('REJECTED')).toBe(true);
    expect(canRequestCertification('PENDING')).toBe(false);
    expect(canRequestCertification('VERIFIED')).toBe(false);
  });
});
