import { describe, expect, it } from 'vitest';

import { trainerHomeFor } from './landing';

describe('trainerHomeFor (/trainer)', () => {
  it('shows the no-club message for 0 clubs', () => {
    expect(trainerHomeFor([])).toEqual({ kind: 'no-club' });
  });

  it("redirects to the only club's roster for 1 club", () => {
    expect(trainerHomeFor(['clxclub0000000000000000001'])).toEqual({
      kind: 'redirect',
      to: '/trainer/clubs/clxclub0000000000000000001/athletes',
    });
  });

  it('redirects to the picker for 2 clubs', () => {
    expect(trainerHomeFor(['clxclub0000000000000000001', 'clxclub0000000000000000002'])).toEqual({
      kind: 'redirect',
      to: '/trainer/clubs',
    });
  });
});
