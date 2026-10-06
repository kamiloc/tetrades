import { describe, expect, it } from 'vitest';

import { athleteAchievementPublicListOutput } from './athlete-achievement.js';

const ID_A = 'cm1achievement0000000001';
const ID_ATHLETE = 'cm1athlete00000000000001';

describe('athleteAchievementPublicListOutput', () => {
  const publicRow = {
    id: ID_A,
    title: 'Campeona Nacional de Ruta Sub-23',
    organization: 'Federación Colombiana de Ciclismo',
    achievedOn: new Date('2025-06-29'),
    verificationStatus: 'VERIFIED' as const,
  };

  it('accepts public rows', () => {
    expect(athleteAchievementPublicListOutput.safeParse([publicRow]).success).toBe(true);
  });

  it('strips internal fields from an over-wide row', () => {
    const [parsed] = athleteAchievementPublicListOutput.parse([
      {
        ...publicRow,
        athleteId: ID_ATHLETE,
        verificationSource: 'Resolución FCC 0412 de 2025',
        createdAt: new Date('2025-07-01T12:00:00Z'),
      },
    ]);
    expect(parsed).toStrictEqual(publicRow);
    expect(parsed).not.toHaveProperty('createdAt');
    expect(parsed).not.toHaveProperty('verificationSource');
    expect(parsed).not.toHaveProperty('athleteId');
  });
});
