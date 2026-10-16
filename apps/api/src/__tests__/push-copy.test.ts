/**
 * Push copy (membership-notifications spec): every notification type has
 * fixed copy, and the copy names no person, club, achievement, or reason.
 */
import { describe, expect, it } from 'vitest';

import { PUSH_COPY } from '../services/notifications.js';

describe('PUSH_COPY', () => {
  it('has copy for every notification type, including certification', () => {
    expect(Object.keys(PUSH_COPY).sort()).toEqual(
      [
        'CERTIFICATION_DECIDED',
        'CERTIFICATION_REQUESTED',
        'CLUB_INVITATION',
        'CONNECTION_ACCEPTED',
        'CONNECTION_REQUEST',
      ].sort(),
    );
    for (const { title, body } of Object.values(PUSH_COPY)) {
      expect(title.trim().length).toBeGreaterThan(0);
      expect(body.trim().length).toBeGreaterThan(0);
    }
  });

  it('certification copy carries no placeholders or decision details', () => {
    for (const type of ['CERTIFICATION_REQUESTED', 'CERTIFICATION_DECIDED'] as const) {
      const text = `${PUSH_COPY[type].title} ${PUSH_COPY[type].body}`;
      // Fixed text only: no templating, and the decision is not revealed.
      expect(text).not.toMatch(/[{}$%]/);
      expect(text.toLowerCase()).not.toMatch(/aprobad|rechazad|motivo/);
    }
  });
});
