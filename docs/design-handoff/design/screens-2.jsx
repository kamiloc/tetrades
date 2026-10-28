// screens-2.jsx — Performance and Clubs & trainers screens.
// Mobile only. Match screens.jsx: 375×812, dark header, white cards, blue accent.

// Illustrative demo data for the design prototype only. These are not live
// athlete records and must not be treated as API or seed data.
const PF_KPI = [
  { label: '40-yard dash', value: '4.61', unit: 'seconds' },
  { label: 'Vertical jump', value: '28', unit: 'inches' },
];
const PF_SPEED = [42, 51, 57, 68, 73, 82];
const PF_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const PF_BENCH = [
  { label: '40-yard dash', percentile: 78 },
  { label: 'Vertical jump', percentile: 64 },
];
const PF_TESTS = [
  { name: '40-yard dash', result: '4.61 seconds · Oct 12, 2026 · Reported by a trainer at Stanford Athletics' },
  { name: 'Vertical jump', result: '28 inches · Sep 28, 2026 · Reported by a trainer at Stanford Athletics' },
];
const CL_REQ = [{ club: 'San Jose Surf', inviter: 'a club trainer', initials: 'SJ', hue: 222 }];
const CL_HIST = [
  { club: 'Stanford Athletics', period: '2023 – present', current: true },
  { club: 'Bay FC Academy', period: '2021 – 2023', current: false },
];
const CL_STAFF = [
  { name: 'Head trainer', role: 'Trainer', club: 'Stanford Athletics', initials: 'HT', hue: 189 },
  { name: 'Performance trainer', role: 'Performance Trainer', club: 'Stanford Athletics', initials: 'PT', hue: 268 },
];

function MSegmented({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 2, padding: 3, borderRadius: 10,
      background: C.segmented,
    }}>
      {options.map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)} style={{
          flex: 1, minHeight: 34, border: 0, borderRadius: 8,
          background: option === value ? '#FFFFFF' : 'transparent',
          color: option === value ? C.text : C.muted,
          fontSize: 12, fontWeight: option === value ? 600 : 500,
        }}>{option}</button>
      ))}
    </div>
  );
}

function SpeedChart({ values = PF_SPEED, months = PF_MONTHS }) {
  const width = 300;
  const height = 116;
  const points = values.map((value, index) => ({
    x: months.length < 2 ? 0 : index * width / (months.length - 1),
    y: height - value,
  }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Speed by month">
      {[0, 1, 2, 3].map((row) => (
        <line key={row} x1="0" x2={width} y1={row * height / 3} y2={row * height / 3}
          stroke={C.line} strokeWidth="1" />
      ))}
      {path ? <path d={`${path} L${width},${height} L0,${height} Z`} fill={C.blueTint} opacity="0.55" /> : null}
      {path ? <path d={path} fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
}

function PerformanceScreen() {
  return (
    <div data-screen-label="Performance" style={{ paddingBottom: 24 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {PF_KPI.map((item) => (
            <Card key={item.label} style={{ padding: 14 }}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ marginTop: 6, color: C.text, fontSize: 24, fontWeight: 700 }}>{item.value}</div>
              <div style={{ marginTop: 2, color: C.subtle, fontSize: 12 }}>{item.unit}</div>
            </Card>
          ))}
        </div>
      </div>
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle>Speed</SectionTitle>
        <Card style={{ padding: 16 }}>
          <SpeedChart />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: C.muted, fontSize: 11 }}>
            {PF_MONTHS.map((month) => <span key={month}>{month}</span>)}
          </div>
        </Card>
      </div>
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle>Benchmarks</SectionTitle>
        <Card style={{ padding: 16 }}>
          {PF_BENCH.map((item) => (
            <div key={item.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.text }}>
                <span>{item.label}</span><strong>{item.percentile}</strong>
              </div>
              <div style={{ height: 6, marginTop: 7, borderRadius: 999, background: C.canvas }}>
                <div style={{ width: `${item.percentile}%`, height: '100%', borderRadius: 999, background: C.blue }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle>Trainer-reported metrics</SectionTitle>
        <Card>
          {PF_TESTS.map((item, index) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: index === PF_TESTS.length - 1 ? 'none' : `1px solid ${C.line}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{item.result}</div>
              </div>
              <span style={{ color: C.subtle, fontSize: 11 }}>Trainer-reported</span>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ padding: '20px 16px 0' }}>
        <MSegmented options={[]} value="" onChange={() => {}} />
      </div>
    </div>
  );
}

function ClubsScreen() {
  const [invitationState, setInvitationState] = React.useState('PENDING_ATHLETE_CONFIRMATION');
  const activeHistory = invitationState === 'ACTIVE' && CL_REQ[0]
    ? [{ club: CL_REQ[0].club, period: '2026 – present', current: true }, ...CL_HIST]
    : CL_HIST;
  return (
    <div data-screen-label="Clubs & trainers" style={{ paddingBottom: 24 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <SectionTitle>Club invitations</SectionTitle>
        <Card>
          {CL_REQ.filter(() => invitationState === 'PENDING_ATHLETE_CONFIRMATION').map((item) => (
            <div key={item.club} style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={40} initials={item.initials} hue={item.hue} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{item.club}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Invited by {item.inviter}</div>
                </div>
                <PendingChip small />
              </div>
              {invitationState === 'PENDING_ATHLETE_CONFIRMATION' ? <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setInvitationState('ACTIVE')} style={{ minHeight: 38, padding: '0 13px', border: 0, borderRadius: 999, background: C.blue, color: '#fff', fontSize: 12, fontWeight: 600 }}>Accept</button>
                <button type="button" onClick={() => setInvitationState('REJECTED')} style={{ minHeight: 38, padding: '0 13px', border: `1px solid ${C.line}`, borderRadius: 999, background: '#fff', color: C.muted, fontSize: 12, fontWeight: 600 }}>Decline</button>
              </div> : <div style={{ marginTop: 10, color: invitationState === 'ACTIVE' ? C.blue : C.muted, fontSize: 12 }}>Invitation {invitationState.toLowerCase()}</div>}
            </div>
          ))}
          {invitationState !== 'PENDING_ATHLETE_CONFIRMATION' ? <EmptyRow icon="users">No pending invitations</EmptyRow> : null}
        </Card>
      </div>
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle>Active club history</SectionTitle>
        <Card style={{ padding: '4px 16px' }}>
          {activeHistory.map((item, index) => (
            <div key={item.club} style={{ display: 'flex', gap: 12, padding: '14px 0', borderBottom: index === CL_HIST.length - 1 ? 'none' : `1px solid ${C.line}` }}>
              <div style={{ width: 10, height: 10, marginTop: 4, borderRadius: 999, background: item.current ? C.blue : C.subtle, boxShadow: item.current ? `0 0 0 4px ${C.blueTint}` : 'none' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.text, fontSize: 14, fontWeight: 600 }}>
                  {item.club}{item.current ? <Tag tone="blue">Current</Tag> : null}
                </div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>{item.period}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle>Trainers at your clubs</SectionTitle>
        <Card>
          {CL_STAFF.map((item, index) => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: index === CL_STAFF.length - 1 ? 'none' : `1px solid ${C.line}` }}>
              <Avatar size={40} initials={item.initials} hue={item.hue} />
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{item.role}</div>
              </div>
              <span style={{ color: C.subtle, fontSize: 12 }}>{item.club}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { PerformanceScreen, ClubsScreen, MSegmented, SpeedChart });
