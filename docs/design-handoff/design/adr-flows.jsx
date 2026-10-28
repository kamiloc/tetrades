// adr-flows.jsx — clickable previews for athlete visibility, certification,
// club invitations, and trainer workflows required by ADR-013–016.

const FLOW_AUDIENCES = ['Private', 'Connections', 'Public'];
const flowLabel = (key) => ({
  visibility: 'Visibility settings',
  certification: 'Request certification',
  invitations: 'Club invitations',
  trainerInbox: 'Trainer certification inbox',
  metricEntry: 'Report a metric',
})[key] || 'Profile';

function FlowButton({ children, onClick, secondary = false, danger = false }) {
  return <button type="button" onClick={onClick} style={{ minHeight: 42, padding: '0 14px', border: secondary ? `1px solid ${C.line}` : 0, borderRadius: 999, background: danger ? C.dangerTint : secondary ? '#fff' : C.blue, color: danger ? C.danger : secondary ? C.text : '#fff', fontSize: 13, fontWeight: 650 }}>{children}</button>;
}

function FlowNote({ children }) {
  return <div style={{ padding: 12, borderRadius: 12, background: C.blueTint, color: '#24416f', fontSize: 12.5, lineHeight: 1.45 }}>{children}</div>;
}

function FlowShell({ children }) {
  return <div style={{ padding: '16px 16px 28px', display: 'grid', gap: 16 }}>{children}</div>;
}

function AudienceRow({ title, description, value, onChange, defaultLabel }) {
  return <div style={{ padding: 14, borderBottom: `1px solid ${C.line}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
      <div><div style={{ fontSize: 14, fontWeight: 650, color: C.text }}>{title}</div><div style={{ marginTop: 4, color: C.muted, fontSize: 12, lineHeight: 1.4 }}>{description}</div></div>
      <span style={{ flexShrink: 0, color: C.subtle, fontSize: 10 }}>{defaultLabel}</span>
    </div>
    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
      {FLOW_AUDIENCES.map((audience) => <button key={audience} type="button" aria-pressed={value === audience} onClick={() => onChange(audience)} style={{ flex: 1, minHeight: 36, border: `1px solid ${value === audience ? C.blue : C.line}`, borderRadius: 9, background: value === audience ? C.blueTint : '#fff', color: value === audience ? C.blue : C.muted, fontSize: 11.5, fontWeight: value === audience ? 700 : 500 }}>{audience}</button>)}
    </div>
  </div>;
}

function VisibilityFlow() {
  const [audiences, setAudiences] = React.useState({ achievements: 'Public', clubs: 'Private', metrics: 'Private' });
  const update = (key, value) => setAudiences((current) => ({ ...current, [key]: value }));
  return <FlowShell>
    <FlowNote>Choose who can see each part of your athlete profile. Your choices apply to profile, search, and club roster views.</FlowNote>
    <Card>
      <AudienceRow title="Achievements" description="Verified achievements are visible by default." defaultLabel="Default: Public" value={audiences.achievements} onChange={(v) => update('achievements', v)} />
      <AudienceRow title="Club memberships" description="Only active memberships can appear on your profile." defaultLabel="Default: Private" value={audiences.clubs} onChange={(v) => update('clubs', v)} />
      <AudienceRow title="Performance metrics" description="Trainer-reported entries and summaries." defaultLabel="Default: Private" value={audiences.metrics} onChange={(v) => update('metrics', v)} />
    </Card>
    <FlowButton onClick={(event) => { event.currentTarget.textContent = 'Saved'; }}>Save visibility</FlowButton>
  </FlowShell>;
}

function CertificationFlow({ status = 'UNVERIFIED', setStatus = () => {} }) {
  return <FlowShell>
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong style={{ color: C.text, fontSize: 15 }}>PAC-12 All-Conference</strong><span style={{ color: status === 'VERIFIED' ? C.blue : C.pending, fontSize: 11, fontWeight: 700 }}>{status === 'UNVERIFIED' ? 'UNVERIFIED' : status}</span></div>
      <div style={{ marginTop: 5, color: C.muted, fontSize: 12 }}>2024 · Stanford Athletics</div>
    </Card>
    {status === 'UNVERIFIED' ? <>
      <label style={{ display: 'grid', gap: 7, color: C.muted, fontSize: 12, fontWeight: 600 }}>Choose an active club<select defaultValue="Stanford Athletics" style={inputStyle}><option>Stanford Athletics</option><option>Bay FC Academy</option></select></label>
      <FlowNote>Only trainers from the selected club can review this achievement. You must have an active membership with that club.</FlowNote>
      <FlowButton onClick={() => setStatus('PENDING')}>Send for certification</FlowButton>
    </> : status === 'PENDING' ? <>
      <FlowNote>Sent to Stanford Athletics. You can edit this achievement after withdrawing the request.</FlowNote>
      <FlowButton secondary onClick={() => setStatus('CANCELLED')}>Withdraw request</FlowButton>
    </> : status === 'REJECTED' ? <>
      <FlowNote>Trainer’s note: Please attach the official season roster. You can update the details and request certification again.</FlowNote>
      <FlowButton onClick={() => setStatus('UNVERIFIED')}>Request again</FlowButton>
    </> : <><FlowNote>Approved by Stanford Athletics. The certifying club appears to others only when your club-membership visibility allows it.</FlowNote><FlowNote>Editing the title, organization, or date of this verified achievement resets it to Unverified. Confirm that change before saving.</FlowNote></>}
    {status === 'CANCELLED' && <FlowButton onClick={() => setStatus('UNVERIFIED')}>Request again</FlowButton>}
  </FlowShell>;
}

function InvitationFlow() {
  const [state, setState] = React.useState('PENDING_ATHLETE_CONFIRMATION');
  return <FlowShell>
    <FlowNote>A club invitation does not activate membership or grant trainer access until you accept.</FlowNote>
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Avatar size={44} initials="SC" hue={222} /><div><div style={{ fontSize: 14, fontWeight: 650, color: C.text }}>Stanford Athletics</div><div style={{ marginTop: 3, fontSize: 12, color: C.muted }}>Invited by a club trainer</div></div></div>
      <div style={{ marginTop: 14, color: C.muted, fontSize: 12 }}>Status: <strong style={{ color: state === 'ACTIVE' ? C.blue : state === 'REJECTED' ? C.danger : C.pending }}>{state.replaceAll('_', ' ')}</strong></div>
      {state === 'PENDING_ATHLETE_CONFIRMATION' && <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><FlowButton onClick={() => setState('ACTIVE')}>Accept invitation</FlowButton><FlowButton danger secondary onClick={() => setState('REJECTED')}>Decline</FlowButton></div>}
      {state === 'ACTIVE' && <FlowNote>You’re now a member. Club trainers can report metrics and review certification requests for this club.</FlowNote>}
    </Card>
    <FlowNote>Pending and rejected invitations never appear in your public club history.</FlowNote>
  </FlowShell>;
}

function TrainerInboxFlow() {
  const [selected, setSelected] = React.useState(false);
  const [decision, setDecision] = React.useState('PENDING');
  const [reason, setReason] = React.useState('');
  return <FlowShell>
    <FlowNote>Requests are limited to your club and are available only while the athlete’s membership is active.</FlowNote>
    <Card>
      {!selected ? <button type="button" onClick={() => setSelected(true)} style={{ width: '100%', padding: 16, border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}><div style={{ fontSize: 14, fontWeight: 650, color: C.text }}>PAC-12 All-Conference</div><div style={{ marginTop: 4, fontSize: 12, color: C.muted }}>Marcus Chen · 2024 · Pending review</div></button> : <div style={{ padding: 16 }}>
        <button type="button" onClick={() => { setSelected(false); setDecision('PENDING'); setReason(''); }} style={{ border: 0, padding: 0, background: 'transparent', color: C.blue, fontSize: 12 }}>‹ All requests</button>
        <h2 style={{ margin: '14px 0 4px', fontSize: 17, color: C.text }}>PAC-12 All-Conference</h2><div style={{ fontSize: 12, color: C.muted }}>Marcus Chen · 2024 · Stanford Athletics</div>
        <div style={{ marginTop: 14, padding: 12, background: C.canvas, borderRadius: 10, color: C.muted, fontSize: 12 }}>Review the title, organization, and achievement date before deciding. Do not request private identity information.</div>
        {decision === 'PENDING' ? <div style={{ display: 'grid', gap: 8, marginTop: 14 }}><FlowButton onClick={() => setDecision('APPROVED')}>Approve achievement</FlowButton><label style={{ display: 'grid', gap: 6, color: C.muted, fontSize: 12 }}>Reason required to reject<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain what evidence is missing" rows="3" style={{ ...inputStyle, resize: 'vertical' }} /></label><button type="button" disabled={!reason.trim()} onClick={() => setDecision('REJECTED')} style={{ minHeight: 42, padding: '0 14px', border: `1px solid ${C.dangerLine}`, borderRadius: 999, background: reason.trim() ? C.dangerTint : '#fff', color: reason.trim() ? C.danger : C.subtle, fontSize: 13, fontWeight: 650 }}>Reject request</button></div> : <FlowNote>Decision recorded: {decision}. The athlete will be notified.</FlowNote>}
      </div>}
    </Card>
  </FlowShell>;
}

function MetricEntryFlow() {
  const [saved, setSaved] = React.useState(false);
  return <FlowShell>
    <FlowNote>Report a metric for an athlete with an active membership at your club. Entries are attributed to you and summaries are calculated automatically.</FlowNote>
    <Card style={{ padding: 16, display: 'grid', gap: 13 }}>
      <label style={fieldLabel}>Athlete<select style={inputStyle} defaultValue="Marcus Chen"><option>Marcus Chen · Active member</option></select></label>
      <label style={fieldLabel}>Metric<select style={inputStyle}><option>40-yard dash</option><option>Vertical jump</option><option>Yo-Yo test</option></select></label>
      <label style={fieldLabel}>Result<input style={inputStyle} inputMode="decimal" placeholder="4.61 seconds" /></label>
      <label style={fieldLabel}>Measured on<input style={inputStyle} type="date" defaultValue="2026-10-15" /></label>
      <div style={{ fontSize: 11, color: C.muted }}>Reported by a trainer at Stanford Athletics</div>
      {saved ? <FlowNote>Metric reported. The athlete’s summary updates from recorded entries.</FlowNote> : <FlowButton onClick={() => setSaved(true)}>Report metric</FlowButton>}
    </Card>
  </FlowShell>;
}

const inputStyle = { boxSizing: 'border-box', width: '100%', minHeight: 42, padding: '9px 11px', border: `1px solid ${C.line}`, borderRadius: 10, background: '#fff', color: C.text, font: 'inherit', fontSize: 13 };
const fieldLabel = { display: 'grid', gap: 6, color: C.muted, fontSize: 12, fontWeight: 600 };
const FLOW_SCREENS = { visibility: VisibilityFlow, certification: CertificationFlow, invitations: InvitationFlow, trainerInbox: TrainerInboxFlow, metricEntry: MetricEntryFlow };
Object.assign(window, { FLOW_SCREENS, flowLabel });
