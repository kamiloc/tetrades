import type { AdminAction, AdminActionEntryOutput } from '@packages/validators';

import type { AppLocale } from './locale-selection';
import { translate, type MessageKey } from './translations';

// Plain-language wording for admin action log entries (add-web-admin-insights
// design D3). Pure, so the activity page and the overview panel agree.

interface ActionMessages {
  /** The filter label. */
  label: MessageKey;
  /** The sentence when the viewer acted ("You created {club}"). */
  you: MessageKey;
  /** The sentence when another admin acted ("{actor} created {club}"). */
  other: MessageKey;
}

// Separate "you" and "other" sentences: Spanish conjugates the verb for the
// actor, so the actor can't be swapped into a single sentence.
const MESSAGES: Record<AdminAction, ActionMessages> = {
  CLUB_CREATED: {
    label: 'admin.activity.label.clubCreated',
    you: 'admin.activity.you.clubCreated',
    other: 'admin.activity.other.clubCreated',
  },
  CLUB_UPDATED: {
    label: 'admin.activity.label.clubUpdated',
    you: 'admin.activity.you.clubUpdated',
    other: 'admin.activity.other.clubUpdated',
  },
  CLUB_DEACTIVATED: {
    label: 'admin.activity.label.clubDeactivated',
    you: 'admin.activity.you.clubDeactivated',
    other: 'admin.activity.other.clubDeactivated',
  },
  CLUB_REACTIVATED: {
    label: 'admin.activity.label.clubReactivated',
    you: 'admin.activity.you.clubReactivated',
    other: 'admin.activity.other.clubReactivated',
  },
  TRAINER_INVITED: {
    label: 'admin.activity.label.trainerInvited',
    you: 'admin.activity.you.trainerInvited',
    other: 'admin.activity.other.trainerInvited',
  },
  TRAINER_INVITATION_REVOKED: {
    label: 'admin.activity.label.trainerInvitationRevoked',
    you: 'admin.activity.you.trainerInvitationRevoked',
    other: 'admin.activity.other.trainerInvitationRevoked',
  },
  TRAINER_REVOKED: {
    label: 'admin.activity.label.trainerRevoked',
    you: 'admin.activity.you.trainerRevoked',
    other: 'admin.activity.other.trainerRevoked',
  },
};

/** The filter label key for an action. */
export function adminActionLabel(action: AdminAction): MessageKey {
  return MESSAGES[action].label;
}

type Describable = Pick<AdminActionEntryOutput, 'action' | 'actor' | 'club'>;

export interface AdminActionSentence {
  /** The sentence; `{club}` marks where the club name goes. */
  key: MessageKey;
  /** The acting admin's email, or "An admin" (unused in "you" sentences). */
  actor: string;
  /** The club name, or null when the club is unknown. */
  club: string | null;
}

export function describeAdminAction(locale: AppLocale, entry: Describable): AdminActionSentence {
  const messages = MESSAGES[entry.action];
  return {
    key: entry.actor.isYou ? messages.you : messages.other,
    actor: entry.actor.email ?? translate(locale, 'admin.activity.unknownActor'),
    club: entry.club?.name ?? null,
  };
}

/** The whole sentence as text, with "a club" when the club is unknown. */
export function adminActionText(locale: AppLocale, entry: Describable): string {
  const { key, actor, club } = describeAdminAction(locale, entry);
  return translate(locale, key, {
    actor,
    club: club ?? translate(locale, 'admin.activity.unknownClub'),
  });
}

const FIELD_LABELS = {
  name: 'admin.activity.field.name',
  countryCode: 'admin.activity.field.country',
  city: 'admin.activity.field.city',
} as const satisfies Record<string, MessageKey>;

/** The recorded details: changed field names and cancelled counts. */
export function adminActionDetails(
  locale: AppLocale,
  details: AdminActionEntryOutput['details'],
): string[] {
  const lines: string[] = [];
  if (details.changedFields !== undefined && details.changedFields.length > 0) {
    const fields = details.changedFields.map((f) => translate(locale, FIELD_LABELS[f])).join(', ');
    lines.push(translate(locale, 'admin.activity.changed', { fields }));
  }
  const counted: [number | undefined, MessageKey][] = [
    [details.cancelledCertificationRequests, 'admin.activity.certificationRequests'],
    [details.rejectedMembershipInvitations, 'admin.club.cancelledAthleteInvitations'],
    [details.revokedTrainerInvitations, 'admin.club.cancelledTrainerInvitations'],
  ];
  const items = counted.flatMap(([count, key]) =>
    count === undefined ? [] : [translate(locale, key, { count })],
  );
  if (items.length > 0) {
    lines.push(translate(locale, 'admin.activity.cancelled', { items: items.join(', ') }));
  }
  return lines;
}
