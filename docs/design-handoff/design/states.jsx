// states.jsx — shared empty and recoverable-error patterns for every tab.
// Data state can be switched from the Tweaks panel in app.jsx.

const TAB_STATES = {
  profile: {
    sub: { loaded: 'Your athlete identity', empty: 'Your athlete identity', error: 'Profile unavailable' },
    empty: { icon: 'shield', title: 'Build your passport', body: 'Add your athlete details and achievements to start building your verified profile.', primary: 'Build your passport', secondary: 'Not now' },
    error: { title: "Couldn't load your profile", body: 'Check your connection and try again.', primary: 'Try again', secondary: 'Sign out' },
  },
  connections: {
    sub: { loaded: '247 athletes · 3 pending', empty: 'Your network starts here', error: 'Connection issue' },
    empty: { icon: 'users', title: 'No connections yet', body: 'Find athletes you know or invite teammates to join your network.', primary: 'Find athletes', secondary: 'Invite teammates' },
    error: { title: "Couldn't load requests", body: 'Your saved network is shown below. Try again to refresh requests.', primary: 'Try again', secondary: 'View cached network' },
  },
  performance: {
    sub: { loaded: 'Season 2026 · Midfielder', empty: 'Season 2026 · Midfielder', error: 'Performance unavailable' },
    empty: { icon: 'activity', title: 'No performance data yet', body: 'A trainer at one of your active clubs can report your first performance update.', primary: 'View clubs', secondary: 'Manage visibility' },
    error: { title: "Couldn't load performance data", body: 'Check your connection and try again.', primary: 'Try again', secondary: 'Close' },
  },
  clubs: {
    sub: { loaded: '2 active clubs · 1 invitation', empty: 'Your clubs and invitations', error: "You're offline" },
    empty: { icon: 'flag', title: 'No active clubs yet', body: 'When a club invites you, review it here. You choose whether to accept.', primary: 'View invitations', secondary: 'Manage visibility' },
    error: { title: "You're offline", body: 'Reconnect to refresh your club invitations and active memberships.', primary: 'Try again', secondary: 'Close' },
  },
};

const STATE_ICONS = {
  alert: 'alert-circle',
  refresh: 'refresh-cw',
  'wifi-off': 'wifi-off',
};

function StatePanel({ tone = 'blue', icon, eyebrow, title, body, primary, secondary, code, onRetry }) {
  const danger = tone === 'danger';
  return (
    <div role="status" aria-live="polite" style={{
      padding: 18, borderRadius: 16, border: `1px solid ${danger ? C.dangerLine : '#D8E4FB'}`,
      background: danger ? '#FFFFFF' : 'linear-gradient(180deg, #F7FAFF 0%, #FFFFFF 100%)',
      textAlign: 'center',
    }}>
      <div style={{ width: 52, height: 52, margin: '0 auto 12px', borderRadius: 16, background: danger ? C.dangerTint : '#E8F0FF', display: 'grid', placeItems: 'center', color: danger ? C.danger : C.blue }}>
        <Icon name={icon || (danger ? 'alert' : 'shield')} size={23} color="currentColor" />
      </div>
      {eyebrow ? <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' }}>{eyebrow}</div> : null}
      <div style={{ marginTop: 4, color: C.text, fontSize: 18, fontWeight: 700 }}>{title}</div>
      <div style={{ maxWidth: 280, margin: '6px auto 0', color: C.muted, fontSize: 13.5, lineHeight: 1.45 }}>{body}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
        <button type="button" onClick={onRetry} style={{ minHeight: 44, padding: '0 16px', border: danger ? `1px solid ${C.dangerLine}` : 0, borderRadius: 999, background: danger ? '#FFFFFF' : C.blue, color: danger ? C.danger : '#FFFFFF', fontSize: 13, fontWeight: 600 }}>
          <Icon name="refresh" size={14} color={danger ? C.danger : '#FFFFFF'} /> {primary}
        </button>
        {secondary ? <button type="button" style={{ minHeight: 44, padding: '0 8px', border: 0, borderRadius: 999, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600 }}>{secondary}</button> : null}
      </div>
      {code ? <code style={{ display: 'block', marginTop: 12, color: C.subtle, fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{code}</code> : null}
    </div>
  );
}

function EmptyRow({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', color: C.muted, fontSize: 13 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, border: `1px dashed ${C.dash}`, display: 'grid', placeItems: 'center', color: C.subtle }}>
        <Icon name={icon} size={16} color="currentColor" />
      </div>
      <span>{children}</span>
    </div>
  );
}

function OfflineBanner({ message = "You're offline", onRetry }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: C.dangerTint, color: C.danger, fontSize: 12.5 }}>
      <Icon name="wifi-off" size={15} color={C.danger} />
      <span style={{ flex: 1 }}>{message}</span>
      <button type="button" onClick={onRetry} style={{ border: 0, padding: 4, background: 'transparent', color: C.danger, fontWeight: 700 }}>Retry</button>
    </div>
  );
}

function ProfileEmpty() {
  return <div style={{ padding: '0 16px 24px' }}>
    <Card style={{ marginTop: -20, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 68, height: 68, borderRadius: 999, border: `1px dashed ${C.dash}`, background: '#FFFFFF' }} />
      <div style={{ flex: 1 }}>{['Height', 'Weight', 'Connections'].map((label) => <span key={label} style={{ display: 'inline-block', marginRight: 10, color: C.muted, fontSize: 12 }}>{label} <b style={{ display: 'block', color: C.text, fontSize: 17 }}>—</b></span>)}</div>
    </Card>
    <div style={{ marginTop: 20 }}><StatePanel icon={TAB_STATES.profile.empty.icon} title={TAB_STATES.profile.empty.title} body={TAB_STATES.profile.empty.body} primary={TAB_STATES.profile.empty.primary} secondary={TAB_STATES.profile.empty.secondary} /></div>
    <div style={{ marginTop: 20 }}><SectionTitle>Achievements</SectionTitle><Card><EmptyRow icon="shield">No achievements yet</EmptyRow></Card></div>
  </div>;
}

function ProfileError() {
  return <div style={{ padding: '16px 16px 24px' }}><StatePanel tone="danger" title={TAB_STATES.profile.error.title} body={TAB_STATES.profile.error.body} primary={TAB_STATES.profile.error.primary} secondary={TAB_STATES.profile.error.secondary} /></div>;
}

function ConnectionsEmpty() {
  return <div style={{ padding: '16px 16px 24px' }}><StatePanel icon={TAB_STATES.connections.empty.icon} title={TAB_STATES.connections.empty.title} body={TAB_STATES.connections.empty.body} primary={TAB_STATES.connections.empty.primary} secondary={TAB_STATES.connections.empty.secondary} /><div style={{ marginTop: 20 }}><SectionTitle>Pending Requests</SectionTitle><Card><EmptyRow icon="users">No pending requests</EmptyRow></Card></div></div>;
}

function ConnectionsError() {
  return <div style={{ padding: '16px 16px 24px' }}><OfflineBanner message="You're offline" /><div style={{ marginTop: 16, opacity: 0.45, pointerEvents: 'none' }}><SectionTitle>Your Network</SectionTitle><Card>{CONNECTIONS.slice(0, 3).map((athlete, index) => <ConnectionRow key={athlete.name} {...athlete} last={index === 2} />)}</Card></div><div style={{ marginTop: 20 }}><StatePanel tone="danger" title={TAB_STATES.connections.error.title} body={TAB_STATES.connections.error.body} primary={TAB_STATES.connections.error.primary} secondary={TAB_STATES.connections.error.secondary} /></div></div>;
}

function PerformanceEmpty() {
  return <div style={{ padding: '16px 16px 24px' }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>{[0, 1, 2, 3].map((n) => <Card key={n} style={{ padding: 14, borderStyle: 'dashed', borderColor: C.dash }}><div style={{ color: C.muted, fontSize: 11 }}>—</div><div style={{ color: C.text, fontSize: 24, fontWeight: 700, marginTop: 5 }}>—</div></Card>)}</div><div style={{ marginTop: 20 }}><StatePanel icon={TAB_STATES.performance.empty.icon} title={TAB_STATES.performance.empty.title} body={TAB_STATES.performance.empty.body} primary={TAB_STATES.performance.empty.primary} secondary={TAB_STATES.performance.empty.secondary} /></div></div>;
}

function PerformanceError() {
  return <div style={{ padding: '16px 16px 24px' }}><StatePanel tone="danger" title={TAB_STATES.performance.error.title} body={TAB_STATES.performance.error.body} primary={TAB_STATES.performance.error.primary} secondary={TAB_STATES.performance.error.secondary} /></div>;
}

function ClubsEmpty() {
  return <div style={{ padding: '16px 16px 24px' }}><StatePanel icon={TAB_STATES.clubs.empty.icon} title={TAB_STATES.clubs.empty.title} body={TAB_STATES.clubs.empty.body} primary={TAB_STATES.clubs.empty.primary} secondary={TAB_STATES.clubs.empty.secondary} /><div style={{ marginTop: 20 }}><SectionTitle>Club invitations</SectionTitle><Card><EmptyRow icon="users">No club invitations</EmptyRow></Card></div><div style={{ marginTop: 20 }}><SectionTitle>Trainers at your clubs</SectionTitle><Card><EmptyRow icon="user">No trainers listed</EmptyRow></Card></div></div>;
}

function ClubsError() {
  return <div style={{ padding: '16px 16px 24px' }}><StatePanel tone="danger" icon="wifi-off" title={TAB_STATES.clubs.error.title} body={TAB_STATES.clubs.error.body} primary={TAB_STATES.clubs.error.primary} secondary={TAB_STATES.clubs.error.secondary} /></div>;
}

const TAB_STATES_EXPORT = { TAB_STATES, STATE_ICONS, StatePanel, EmptyRow, OfflineBanner, ProfileEmpty, ProfileError, ConnectionsEmpty, ConnectionsError, PerformanceEmpty, PerformanceError, ClubsEmpty, ClubsError };
Object.assign(window, TAB_STATES_EXPORT);
