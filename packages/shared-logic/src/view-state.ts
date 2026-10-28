// Screen data states and their copy (design handoff `TAB_STATES` in
// docs/design-handoff/design/states.jsx). Empty and error copy is verbatim;
// loaded subtitles are built from live values by the formatters below, never
// from the handoff's sample counts.

export type ViewState = 'loading' | 'error' | 'empty' | 'loaded';

export interface ViewStateInput {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  // True while a request is in flight. After an error, a retry keeps the
  // error status until it settles, so a fetch in progress shows loading
  // instead of the stale error panel.
  isFetching?: boolean;
}

// Precedence: loading (incl. retrying after an error) → error → empty → loaded.
export function selectViewState({ isLoading, isError, isEmpty, isFetching = false }: ViewStateInput): ViewState {
  if (isLoading) return 'loading';
  if (isError) return isFetching ? 'loading' : 'error';
  if (isEmpty) return 'empty';
  return 'loaded';
}

export interface StatePanelCopy {
  readonly icon: string;
  readonly title: string;
  readonly body: string;
  readonly primary: string;
  readonly secondary: string;
}

export interface TabStateCopy {
  readonly sub: { readonly empty: string; readonly error: string };
  readonly empty: StatePanelCopy;
  readonly error: StatePanelCopy;
  // Inline empty-row copy for the sections shown under the empty panel.
  readonly emptyRows: Readonly<Record<string, string>>;
}

export type TabKey = 'profile' | 'connections' | 'performance' | 'clubs';

export const TAB_STATES: Readonly<Record<TabKey, TabStateCopy>> = {
  profile: {
    sub: { empty: 'Your athlete identity', error: 'Profile unavailable' },
    empty: {
      icon: 'shield',
      title: 'Build your passport',
      body: 'Add your athlete details and achievements to start building your verified profile.',
      primary: 'Build your passport',
      secondary: 'Not now',
    },
    error: {
      icon: 'alert-circle',
      title: "Couldn't load your profile",
      body: 'Check your connection and try again.',
      primary: 'Try again',
      secondary: 'Sign out',
    },
    emptyRows: { achievements: 'No achievements yet' },
  },
  connections: {
    sub: { empty: 'Your network starts here', error: 'Connection issue' },
    empty: {
      icon: 'users',
      title: 'No connections yet',
      body: 'Find athletes you know or invite teammates to join your network.',
      primary: 'Find athletes',
      secondary: 'Invite teammates',
    },
    error: {
      icon: 'alert-circle',
      title: "Couldn't load requests",
      body: 'Your saved network is shown below. Try again to refresh requests.',
      primary: 'Try again',
      secondary: 'View cached network',
    },
    emptyRows: { pending: 'No pending requests' },
  },
  performance: {
    sub: { empty: 'Trainer-reported metrics', error: 'Performance unavailable' },
    empty: {
      icon: 'activity',
      title: 'No performance data yet',
      body: 'A trainer at one of your active clubs can report your first performance update.',
      primary: 'View clubs',
      secondary: 'Manage visibility',
    },
    error: {
      icon: 'alert-circle',
      title: "Couldn't load performance data",
      body: 'Check your connection and try again.',
      primary: 'Try again',
      secondary: 'Close',
    },
    emptyRows: {},
  },
  clubs: {
    sub: { empty: 'Your clubs and invitations', error: "You're offline" },
    empty: {
      icon: 'flag',
      title: 'No active clubs yet',
      body: 'When a club invites you, review it here. You choose whether to accept.',
      primary: 'View invitations',
      secondary: 'Manage visibility',
    },
    error: {
      icon: 'wifi-off',
      title: "You're offline",
      body: 'Reconnect to refresh your club invitations and active memberships.',
      primary: 'Try again',
      secondary: 'Close',
    },
    emptyRows: { invitations: 'No club invitations' },
  },
};

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// Loaded subtitle, e.g. "247 athletes".
export function connectionsSubtitle(count: number): string {
  return plural(count, 'athlete', 'athletes');
}

// Loaded subtitle, e.g. "2 active clubs · 1 invitation".
export function clubsSubtitle(activeClubs: number, invitations: number): string {
  const clubs = plural(activeClubs, 'active club', 'active clubs');
  return invitations > 0 ? `${clubs} · ${plural(invitations, 'invitation', 'invitations')}` : clubs;
}

// Loaded subtitle, e.g. "Soccer · Midfielder". Falls back to the empty-state
// subtitle when the athlete has neither a sport nor a position.
export function performanceSubtitle(sport: string | null, position: string | null): string {
  const parts = [sport, position].filter((part): part is string => !!part && part.trim() !== '');
  return parts.length > 0 ? parts.join(' · ') : TAB_STATES.performance.sub.empty;
}
