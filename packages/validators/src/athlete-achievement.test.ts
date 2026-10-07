import { describe, expect, it } from 'vitest';

import {
  athleteAchievementPublicListOutput,
  listAchievementsInput,
} from './athlete-achievement.js';

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

  it('accepts a page of public rows', () => {
    expect(
      athleteAchievementPublicListOutput.safeParse({ items: [publicRow], nextCursor: null }).success,
    ).toBe(true);
  });

  it('strips internal fields from an over-wide row', () => {
    const {
      items: [parsed],
    } = athleteAchievementPublicListOutput.parse({
      items: [
        {
          ...publicRow,
          athleteId: ID_ATHLETE,
          verificationSource: 'Resolución FCC 0412 de 2025',
          createdAt: new Date('2025-07-01T12:00:00Z'),
        },
      ],
      nextCursor: null,
    });
    expect(parsed).toStrictEqual(publicRow);
    expect(parsed).not.toHaveProperty('createdAt');
    expect(parsed).not.toHaveProperty('verificationSource');
    expect(parsed).not.toHaveProperty('athleteId');
  });
});

describe('listAchievementsInput', () => {
  it('defaults take to 20', () => {
    expect(listAchievementsInput.parse({ athleteId: ID_ATHLETE }).take).toBe(20);
  });

  it('caps take at 50', () => {
    expect(listAchievementsInput.safeParse({ athleteId: ID_ATHLETE, take: 50 }).success).toBe(true);
    expect(listAchievementsInput.safeParse({ athleteId: ID_ATHLETE, take: 51 }).success).toBe(false);
    expect(listAchievementsInput.safeParse({ athleteId: ID_ATHLETE, take: 0 }).success).toBe(false);
  });

  it('requires the cursor to be a cuid', () => {
    expect(
      listAchievementsInput.safeParse({ athleteId: ID_ATHLETE, cursor: 'not-a-cuid' }).success,
    ).toBe(false);
  });
});
