import type { AdminAction, AdminActionEntryOutput } from '@packages/validators';

import { plural } from './format';

// Plain-language wording for admin action log entries (add-web-admin-insights
// design D3). Pure, so the activity page and the overview panel agree.

/** Filter labels, in the order the activity page lists them. */
export const ADMIN_ACTION_LABELS: Record<AdminAction, string> = {
  CLUB_CREATED: 'Created club',
  CLUB_UPDATED: 'Edited club',
  CLUB_DEACTIVATED: 'Deactivated club',
  CLUB_REACTIVATED: 'Reactivated club',
  TRAINER_INVITED: 'Invited a trainer',
  TRAINER_INVITATION_REVOKED: 'Revoked a trainer invitation',
  TRAINER_REVOKED: 'Revoked a trainer',
};

// The verb phrase that precedes the club name.
const VERBS: Record<AdminAction, string> = {
  CLUB_CREATED: 'created',
  CLUB_UPDATED: 'edited',
  CLUB_DEACTIVATED: 'deactivated',
  CLUB_REACTIVATED: 'reactivated',
  TRAINER_INVITED: 'invited a trainer to',
  TRAINER_INVITATION_REVOKED: 'revoked a trainer invitation at',
  TRAINER_REVOKED: 'revoked a trainer at',
};

type Describable = Pick<AdminActionEntryOutput, 'action' | 'actor' | 'club'>;

export interface AdminActionSentence {
  /** "You deactivated " — everything before the club name. */
  before: string;
  /** The club name, or null when the club is unknown ("a club"). */
  club: string | null;
}

/** Who acted: "You", the acting admin's email, or "An admin". */
export function actorLabel(actor: Describable['actor']): string {
  if (actor.isYou) return 'You';
  return actor.email ?? 'An admin';
}

export function describeAdminAction(entry: Describable): AdminActionSentence {
  const before = `${actorLabel(entry.actor)} ${VERBS[entry.action]} `;
  return entry.club === null
    ? { before: `${before}a club`, club: null }
    : { before, club: entry.club.name };
}

export function adminActionText(entry: Describable): string {
  const { before, club } = describeAdminAction(entry);
  return `${before}${club ?? ''}`;
}

const FIELD_LABELS = { name: 'name', countryCode: 'country', city: 'city' } as const;

/** The recorded details: changed field names and cancelled counts. */
export function adminActionDetails(details: AdminActionEntryOutput['details']): string[] {
  const lines: string[] = [];
  if (details.changedFields !== undefined && details.changedFields.length > 0) {
    lines.push(`Changed: ${details.changedFields.map((f) => FIELD_LABELS[f]).join(', ')}`);
  }
  const counts = [
    details.cancelledCertificationRequests === undefined
      ? null
      : plural(
          details.cancelledCertificationRequests,
          'certification request',
          'certification requests',
        ),
    details.rejectedMembershipInvitations === undefined
      ? null
      : plural(details.rejectedMembershipInvitations, 'athlete invitation', 'athlete invitations'),
    details.revokedTrainerInvitations === undefined
      ? null
      : plural(details.revokedTrainerInvitations, 'trainer invitation', 'trainer invitations'),
  ].filter((c): c is string => c !== null);
  if (counts.length > 0) lines.push(`Cancelled: ${counts.join(', ')}`);
  return lines;
}
