// screens.jsx — Athlete Passport UI atoms + four tab screens
// Mobile only. 375×812. Dark header, white content, blue (#1A6BFF) accent.

// ─────────────────────────────────────────────────────────────
// Color tokens (mirrored from :root for inline use)
// ─────────────────────────────────────────────────────────────
const C = {
  ink: '#0B1220',
  ink2: '#131B2E',
  paper: '#FFFFFF',
  canvas: '#F4F6FA',
  line: '#E5E8EE',
  muted: '#6B7280',
  subtle: '#9AA3B2',
  text: '#0F172A',
  blue: '#1A6BFF',
  blueTint: '#E8F0FF',
  pending: '#B5651D',
  pendingTint: '#FFF3E0',
};

// ─────────────────────────────────────────────────────────────
// Tiny icon set — single-color, 24×24 stroke icons
// ─────────────────────────────────────────────────────────────
const Icon = ({ name, size = 24, color = 'currentColor', stroke = 1.8 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
              stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'user':
      return (<svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>);
    case 'users':
      return (<svg {...p}><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/><circle cx="17" cy="7" r="2.6"/><path d="M16 13.4c2.9.4 5.5 2.9 5.5 6.1"/></svg>);
    case 'doc':
      return (<svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>);
    case 'search':
      return (<svg {...p}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></svg>);
    case 'bell':
      return (<svg {...p}><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>);
    case 'check':
      return (<svg {...p}><path d="m5 12 5 5 9-10"/></svg>);
    case 'lock':
      return (<svg {...p}><rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>);
    case 'plus':
      return (<svg {...p}><path d="M12 5v14M5 12h14"/></svg>);
    case 'clock':
      return (<svg {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>);
    case 'pin':
      return (<svg {...p}><path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>);
    case 'shield':
      return (<svg {...p}><path d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-3z"/><path d="m9 12 2 2 4-4"/></svg>);
    default: return null;
  }
};

// ─────────────────────────────────────────────────────────────
// Verified / Pending chips
// ─────────────────────────────────────────────────────────────
function VerifiedChip({ small = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: C.blueTint, color: C.blue,
      fontSize: small ? 10 : 11, fontWeight: 600,
      letterSpacing: 0.2, textTransform: 'uppercase',
      padding: small ? '2px 6px' : '3px 8px', borderRadius: 999,
    }}>
      <svg width={small ? 9 : 10} height={small ? 9 : 10} viewBox="0 0 24 24" fill="none"
           stroke={C.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5 9-10"/>
      </svg>
      Verified
    </span>
  );
}
function PendingChip({ small = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: C.pendingTint, color: C.pending,
      fontSize: small ? 10 : 11, fontWeight: 600,
      letterSpacing: 0.2, textTransform: 'uppercase',
      padding: small ? '2px 6px' : '3px 8px', borderRadius: 999,
    }}>
      <svg width={small ? 9 : 10} height={small ? 9 : 10} viewBox="0 0 24 24" fill="none"
           stroke={C.pending} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2"/>
      </svg>
      Pending
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar — stripe placeholder with initials, jersey-style
// ─────────────────────────────────────────────────────────────
function Avatar({ size = 56, initials = '', hue = 220, ring = false }) {
  const bg1 = `oklch(0.62 0.13 ${hue})`;
  const bg2 = `oklch(0.48 0.16 ${hue + 18})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${bg1}, ${bg2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36,
      letterSpacing: 0.5, flexShrink: 0,
      boxShadow: ring ? `0 0 0 3px #fff, 0 0 0 5px ${C.blue}` : 'none',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* faint diagonal stripe — jersey hint */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 8px, transparent 8px 16px)',
      }} />
      <span style={{ position: 'relative' }}>{initials}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Header — dark, sits under status bar (47px safe area on top)
// ─────────────────────────────────────────────────────────────
function Header({ title, action, subtitle, dense = false }) {
  return (
    <header style={{
      background: `linear-gradient(180deg, ${C.ink} 0%, ${C.ink2} 100%)`,
      paddingTop: 47,
      paddingBottom: dense ? 12 : 16,
      paddingLeft: 20, paddingRight: 20,
      color: '#fff',
      position: 'relative',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* brand row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 32, marginTop: 6,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, letterSpacing: '0.22em', fontWeight: 600,
          color: 'rgba(255,255,255,0.78)', textTransform: 'uppercase',
        }}>
          <ApMark />
          The Athlete Passport
        </div>
        <button style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          width: 32, height: 32, borderRadius: 999, display: 'grid', placeItems: 'center',
          color: '#fff', position: 'relative', cursor: 'pointer',
        }}>
          <Icon name="bell" size={16} color="#fff" stroke={1.8} />
          <span style={{
            position: 'absolute', top: 5, right: 6,
            width: 6, height: 6, borderRadius: '50%', background: C.blue,
            boxShadow: `0 0 0 1.5px ${C.ink}`,
          }} />
        </button>
      </div>
      {/* large title */}
      <div style={{ marginTop: 6 }}>
        <h1 style={{
          margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.4,
          color: '#fff', lineHeight: 1.15,
        }}>{title}</h1>
        {subtitle && (
          <div style={{
            marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.55)',
            letterSpacing: 0.1,
          }}>{subtitle}</div>
        )}
      </div>
      {action && (
        <div style={{ position: 'absolute', right: 20, bottom: 14 }}>{action}</div>
      )}
    </header>
  );
}

// AP shield mark
function ApMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2.5 3.5 5.5v5.7c0 5.4 3.6 9.1 8.5 10.3 4.9-1.2 8.5-4.9 8.5-10.3V5.5L12 2.5z"
            stroke={C.blue} strokeWidth="1.8" fill="rgba(26,107,255,0.15)"/>
      <path d="M9.2 16V8.5h3.3c1.7 0 2.9 1 2.9 2.6s-1.2 2.6-2.9 2.6h-1.5V16"
            stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Section card wrapper
// ─────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: `1px solid ${C.line}`,
      boxShadow: 'var(--shadow-sm)', ...style,
    }}>{children}</div>
  );
}
function SectionTitle({ children, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '0 4px 8px',
    }}>
      <h2 style={{
        margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: C.muted,
      }}>{children}</h2>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 1) PROFILE SCREEN
// ─────────────────────────────────────────────────────────────
function ProfileScreen() {
  return (
    <div data-screen-label="Profile" style={{ paddingBottom: 24 }}>
      {/* Identity card — overlaps slightly with header */}
      <div style={{ padding: '0 16px', marginTop: -20 }}>
        <Card style={{ padding: '20px 18px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar size={68} initials="MC" hue={230} ring />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{
                  margin: 0, fontSize: 19, fontWeight: 700, color: C.text,
                  letterSpacing: -0.2, lineHeight: 1.1,
                }}>Marcus Chen</h2>
                <BlueCheck />
              </div>
              <div style={{
                marginTop: 4, fontSize: 13.5, color: C.muted,
                display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
              }}>
                <span>Midfielder · Soccer</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Tag>Stanford Cardinal</Tag>
                <Tag tone="blue">NCAA D1</Tag>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}`,
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          }}>
            <Stat label="Height" value={`6'1"`} />
            <Stat label="Weight" value="178 lb" divider />
            <Stat label="Connections" value="247" divider linkish />
          </div>
        </Card>
      </div>

      {/* Bio */}
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle>About</SectionTitle>
        <Card style={{ padding: '14px 16px' }}>
          <p style={{
            margin: 0, fontSize: 14.5, lineHeight: 1.55, color: C.text,
            textWrap: 'pretty',
          }}>
            Center mid at Stanford. PAC-12 All-Conference 2024.
            Two-footed playmaker focused on tempo control and final-third creation.
            Records verified through Athlete Passport since 2023.
          </p>
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 14,
            fontSize: 12.5, color: C.muted,
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="pin" size={13} color={C.subtle} /> Palo Alto, CA
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="clock" size={13} color={C.subtle} /> Joined Aug 2023
            </span>
          </div>
        </Card>
      </div>

      {/* Achievements */}
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle right={<a style={{
          fontSize: 12.5, color: C.blue, fontWeight: 600, textDecoration: 'none',
        }}>See all</a>}>Achievements</SectionTitle>
        <Card>
          <AchievementRow
            title="PAC-12 All-Conference"
            meta="2024 · Stanford Athletics"
            verified />
          <AchievementRow
            title="U.S. Youth National Team — Player Pool"
            meta="2023 · U.S. Soccer"
            verified />
          <AchievementRow
            title="Combine: 40-yd dash · 4.61s"
            meta="2025 · Bay Area Showcase"
            pending />
          <AchievementRow
            title="Annual Physical — Cleared"
            meta="Mar 2025 · Stanford Sports Med"
            verified last />
        </Card>
      </div>

      {/* Profile completeness footer */}
      <div style={{ padding: '20px 16px 0' }}>
        <Card style={{
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(180deg, #F7FAFF 0%, #FFFFFF 100%)',
          borderColor: '#D8E4FB',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: C.blueTint, display: 'grid', placeItems: 'center',
          }}>
            <Icon name="shield" size={20} color={C.blue} stroke={1.9} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>
              Passport 82% complete
            </div>
            <div style={{ height: 6, background: '#E6ECF6', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: '82%', height: '100%', background: C.blue, borderRadius: 999 }} />
            </div>
          </div>
          <button style={btnGhost}>Finish</button>
        </Card>
      </div>
    </div>
  );
}

function BlueCheck({ size = 16 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', background: C.blue,
      display: 'inline-grid', placeItems: 'center', flexShrink: 0,
    }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none"
           stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5 9-10"/>
      </svg>
    </span>
  );
}
function Tag({ children, tone }) {
  const blue = tone === 'blue';
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11, fontWeight: 600, letterSpacing: 0.1,
      padding: '3px 8px', borderRadius: 6,
      background: blue ? C.blueTint : '#F1F4F9',
      color: blue ? C.blue : '#475569',
      border: blue ? '1px solid #D8E4FB' : `1px solid ${C.line}`,
    }}>{children}</span>
  );
}
function Stat({ label, value, divider, linkish }) {
  return (
    <div style={{
      padding: '0 4px', position: 'relative', textAlign: 'left',
      borderLeft: divider ? `1px solid ${C.line}` : 'none',
      paddingLeft: divider ? 14 : 0,
    }}>
      <div style={{
        fontSize: 17, fontWeight: 700, color: linkish ? C.blue : C.text,
        letterSpacing: -0.2,
      }}>{value}</div>
      <div style={{
        fontSize: 11, color: C.muted, marginTop: 2,
        letterSpacing: 0.2, textTransform: 'uppercase', fontWeight: 600,
      }}>{label}</div>
    </div>
  );
}
function AchievementRow({ title, meta, verified, pending, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: last ? 'none' : `1px solid ${C.line}`,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: pending ? C.pendingTint : C.blueTint,
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <Icon name={pending ? 'clock' : 'check'} size={17}
              color={pending ? C.pending : C.blue} stroke={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.25 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{meta}</div>
      </div>
      {verified && <VerifiedChip small />}
      {pending && <PendingChip small />}
    </div>
  );
}
const btnGhost = {
  background: '#fff', border: `1px solid ${C.line}`, borderRadius: 999,
  padding: '7px 14px', fontSize: 12.5, fontWeight: 600, color: C.text, cursor: 'pointer',
};

// ─────────────────────────────────────────────────────────────
// 2) CONNECTIONS SCREEN
// ─────────────────────────────────────────────────────────────
const CONNECTIONS = [
  { name: 'Sofia Martinez', sport: 'Volleyball · Outside Hitter', org: 'UCLA Bruins',     init: 'SM', hue: 320, verified: true },
  { name: 'James Okafor',   sport: 'Track & Field · 400m',       org: 'Oregon Ducks',     init: 'JO', hue: 35,  verified: true },
  { name: 'Amelia Reed',    sport: 'Soccer · Forward',           org: 'Stanford Cardinal', init: 'AR', hue: 200, verified: true },
  { name: 'Devon Brooks',   sport: 'Football · Safety',           org: 'USC Trojans',      init: 'DB', hue: 10,  verified: false },
  { name: 'Priya Shah',     sport: 'Tennis · Singles',           org: 'Stanford Cardinal', init: 'PS', hue: 280, verified: true },
  { name: 'Liam O\u2019Connor', sport: 'Rowing · Stroke',         org: 'Yale Bulldogs',    init: 'LO', hue: 150, verified: true },
];
const PENDING = [
  { name: 'Kai Nakamura', sport: 'Swimming · 200m Free', org: 'Cal Bears', init: 'KN', hue: 195 },
  { name: 'Zara Williams', sport: 'Basketball · Point Guard', org: 'UConn Huskies', init: 'ZW', hue: 260 },
  { name: 'Ethan Park', sport: 'Baseball · Pitcher', org: 'Vanderbilt', init: 'EP', hue: 100 },
];

function ConnectionsScreen() {
  return (
    <div data-screen-label="Connections" style={{ paddingBottom: 24 }}>
      {/* Pending requests */}
      <div style={{ padding: '16px 16px 0' }}>
        <SectionTitle right={<a style={{
          fontSize: 12.5, color: C.blue, fontWeight: 600, textDecoration: 'none',
        }}>Manage</a>}>Pending Requests</SectionTitle>
        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Stacked avatars */}
            <div style={{ display: 'flex' }}>
              {PENDING.map((p, i) => (
                <div key={p.init} style={{ marginLeft: i === 0 ? 0 : -10, border: '2px solid #fff', borderRadius: '50%' }}>
                  <Avatar size={36} initials={p.init} hue={p.hue} />
                </div>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: C.text, fontWeight: 600 }}>
                3 athletes want to connect
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                Kai, Zara, Ethan
              </div>
            </div>
            <span style={{
              minWidth: 22, height: 22, padding: '0 7px', borderRadius: 999,
              background: C.blue, color: '#fff', fontSize: 12, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>3</span>
          </div>
        </Card>
      </div>

      {/* Connection list */}
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle right={<span style={{
          fontSize: 12.5, color: C.muted, fontWeight: 600,
        }}>247 total</span>}>Your Network</SectionTitle>
        <Card>
          {CONNECTIONS.map((c, i) => (
            <ConnectionRow key={c.name} {...c} last={i === CONNECTIONS.length - 1} />
          ))}
        </Card>
      </div>
    </div>
  );
}

function ConnectionRow({ name, sport, org, init, hue, verified, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: last ? 'none' : `1px solid ${C.line}`,
    }}>
      <Avatar size={44} initials={init} hue={hue} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>{name}</span>
          {verified && <BlueCheck size={13} />}
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 1 }}>{sport}</div>
        <div style={{ fontSize: 12, color: C.subtle, marginTop: 1 }}>{org}</div>
      </div>
      <button style={{
        ...btnGhost, padding: '6px 12px', fontSize: 12,
        color: C.blue, borderColor: '#D8E4FB',
      }}>Message</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3) DOCUMENTS — Locked / Sprint 4 placeholder
// ─────────────────────────────────────────────────────────────
const DOC_PREVIEW = [
  { title: 'Annual Physical Examination', meta: 'Stanford Sports Medicine' },
  { title: 'ECG · Cardiac Screening',     meta: 'CardioCheck Clinic' },
  { title: 'Concussion Baseline (ImPACT)', meta: 'Stanford Athletics' },
  { title: 'Orthopedic Clearance',         meta: 'Bay Area Orthopedics' },
];

function DocumentsScreen() {
  return (
    <div data-screen-label="Documents" style={{ paddingBottom: 24 }}>
      {/* Lock hero */}
      <div style={{ padding: '24px 16px 0' }}>
        <Card style={{
          padding: '22px 18px',
          background: 'linear-gradient(180deg, #F7FAFF 0%, #FFFFFF 100%)',
          borderColor: '#D8E4FB',
          textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto',
            background: C.ink, color: '#fff',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 8px 20px rgba(11,18,32,0.18)',
          }}>
            <Icon name="lock" size={26} color="#fff" stroke={1.9} />
          </div>
          <div style={{
            marginTop: 14, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
            color: C.blue, textTransform: 'uppercase',
          }}>Sprint 4 · Coming soon</div>
          <h2 style={{
            margin: '6px 0 6px', fontSize: 19, fontWeight: 700, color: C.text,
            letterSpacing: -0.2,
          }}>Verified medical records</h2>
          <p style={{
            margin: 0, fontSize: 13.5, color: C.muted, lineHeight: 1.5,
            maxWidth: 280, marginLeft: 'auto', marginRight: 'auto',
          }}>
            Securely upload physicals, ECGs, and clearance forms. Cryptographically
            signed by your team's medical staff.
          </p>
          <button style={{
            marginTop: 14, background: C.blue, color: '#fff',
            border: 'none', borderRadius: 999, padding: '10px 20px',
            fontSize: 13, fontWeight: 600, letterSpacing: 0.1, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(26,107,255,0.25)',
          }}>Notify me when ready</button>
        </Card>
      </div>

      {/* Locked preview rows */}
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle>Preview · locked</SectionTitle>
        <Card>
          {DOC_PREVIEW.map((d, i) => (
            <div key={d.title} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: i === DOC_PREVIEW.length - 1 ? 'none' : `1px solid ${C.line}`,
              opacity: 0.7,
            }}>
              <div style={{
                width: 38, height: 44, borderRadius: 6, flexShrink: 0,
                background: 'repeating-linear-gradient(135deg, #EEF1F6 0 6px, #F6F8FB 6px 12px)',
                border: `1px solid ${C.line}`, position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                }}>
                  <Icon name="lock" size={14} color={C.subtle} />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{d.title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{d.meta}</div>
              </div>
              <Icon name="lock" size={16} color={C.subtle} />
            </div>
          ))}
        </Card>
        <div style={{
          marginTop: 10, padding: '0 6px',
          fontSize: 11.5, color: C.subtle, lineHeight: 1.5,
        }}>
          Document uploads, signing, and sharing will arrive in Sprint 4.
          Today this tab is a placeholder.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4) SEARCH SCREEN — empty state with suggestions
// ─────────────────────────────────────────────────────────────
const SPORTS = ['Soccer', 'Basketball', 'Football', 'Track & Field', 'Volleyball',
                'Baseball', 'Tennis', 'Swimming', 'Rowing', 'Lacrosse'];
const RECENT = [
  { q: 'Stanford soccer', meta: 'Sport · org' },
  { q: 'D1 swimmers',     meta: 'Sport · division' },
  { q: 'Sofia Martinez',  meta: 'Athlete' },
];

function SearchScreen() {
  return (
    <div data-screen-label="Search" style={{ paddingBottom: 24 }}>
      {/* Search field */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: `1px solid ${C.line}`, borderRadius: 12,
          padding: '11px 14px', boxShadow: 'var(--shadow-sm)',
        }}>
          <Icon name="search" size={18} color={C.subtle} />
          <span style={{ color: C.subtle, fontSize: 14.5, flex: 1 }}>
            Search athletes by name or sport
          </span>
          <span style={{
            fontSize: 11, color: C.muted, background: C.canvas,
            padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.line}`,
          }}>⌘K</span>
        </div>
      </div>

      {/* Browse by sport */}
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle>Browse by sport</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SPORTS.map(s => (
            <button key={s} style={{
              background: '#fff', border: `1px solid ${C.line}`, borderRadius: 999,
              padding: '8px 14px', fontSize: 13, fontWeight: 500, color: C.text,
              cursor: 'pointer',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Recent */}
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle right={<a style={{ fontSize: 12.5, color: C.blue, fontWeight: 600 }}>Clear</a>}>
          Recent
        </SectionTitle>
        <Card>
          {RECENT.map((r, i) => (
            <div key={r.q} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: i === RECENT.length - 1 ? 'none' : `1px solid ${C.line}`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, background: C.canvas,
                display: 'grid', placeItems: 'center', border: `1px solid ${C.line}`,
              }}>
                <Icon name="clock" size={15} color={C.muted} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{r.q}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{r.meta}</div>
              </div>
              <Icon name="search" size={15} color={C.subtle} />
            </div>
          ))}
        </Card>
      </div>

      {/* Suggested */}
      <div style={{ padding: '20px 16px 0' }}>
        <SectionTitle>Suggested for you</SectionTitle>
        <Card>
          {CONNECTIONS.slice(0, 3).map((c, i) => (
            <div key={c.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: i === 2 ? 'none' : `1px solid ${C.line}`,
            }}>
              <Avatar size={40} initials={c.init} hue={c.hue} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{c.name}</span>
                  {c.verified && <BlueCheck size={12} />}
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 1 }}>
                  {c.sport} · {c.org}
                </div>
              </div>
              <button style={{
                background: C.blue, color: '#fff', border: 'none',
                borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              }}>
                <Icon name="plus" size={13} color="#fff" stroke={2.5} />
                Connect
              </button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LOGIN SCREEN — full-bleed dark hero, shown when unauthenticated.
// Replaces the entire tab UI (no header, no tab bar) at the
// (auth)/sign-in route in Expo Router.
// ─────────────────────────────────────────────────────────────
function LoginScreen({ mode = 'signin', onAuth }) {
  const creating = mode === 'create';
  return (
    <div data-screen-label="Sign In" style={{
      height: '100%', position: 'relative',
      background: `radial-gradient(120% 80% at 50% 0%, #1B2845 0%, ${C.ink} 55%, #050811 100%)`,
      color: '#fff', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* faint diagonal field-line pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none',
        background: 'repeating-linear-gradient(120deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 28px)',
      }} />
      {/* subtle blue glow */}
      <div style={{
        position: 'absolute', top: -120, left: -80, width: 320, height: 320,
        background: 'radial-gradient(closest-side, rgba(26,107,255,0.35), transparent)',
        pointerEvents: 'none',
      }} />

      {/* Brand block */}
      <div style={{
        position: 'relative', zIndex: 1,
        paddingTop: 47 + 56, paddingLeft: 28, paddingRight: 28,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(26,107,255,0.16)',
          border: '1px solid rgba(26,107,255,0.35)',
          display: 'grid', placeItems: 'center',
          boxShadow: '0 8px 30px rgba(11,18,32,0.6), inset 0 0 0 1px rgba(255,255,255,0.04)',
        }}>
          <ApMark size={28} />
        </div>
        <div style={{
          marginTop: 10, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
        }}>The Athlete Passport</div>
        <h1 style={{
          margin: '14px 0 8px', fontSize: 32, fontWeight: 700,
          letterSpacing: -0.6, lineHeight: 1.1, color: '#fff', textWrap: 'pretty',
        }}>
          {creating ? <>Build your verified<br/>athletic identity.</>
                    : <>Welcome back,<br/>athlete.</>}
        </h1>
        <p style={{
          margin: 0, fontSize: 14.5, color: 'rgba(255,255,255,0.62)',
          lineHeight: 1.5, maxWidth: 300, textWrap: 'pretty',
        }}>
          {creating
            ? 'Cryptographically signed physicals, clearances, and stats — owned by you, shareable with coaches and teams.'
            : 'Sign in to your verified records, network, and document vault.'}
        </p>

        {/* Value props */}
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ValueProp icon="shield" label="Records signed by team medical staff" />
          <ValueProp icon="users"  label="A trusted network of athletes & coaches" />
          <ValueProp icon="lock"   label="End-to-end secure · athlete-owned" />
        </div>
      </div>

      {/* Auth actions */}
      <div style={{
        marginTop: 'auto', position: 'relative', zIndex: 1,
        padding: '20px 20px 0',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <AuthButton
          variant="apple"
          label={creating ? 'Continue with Apple' : 'Sign in with Apple'}
          onClick={onAuth} />
        <AuthButton
          variant="google"
          label={creating ? 'Continue with Google' : 'Sign in with Google'}
          onClick={onAuth} />
        <AuthButton
          variant="email"
          label={creating ? 'Continue with email' : 'Sign in with email'}
          onClick={onAuth} />

        <div style={{
          marginTop: 10, textAlign: 'center', fontSize: 13.5,
          color: 'rgba(255,255,255,0.62)',
        }}>
          {creating ? 'Already a member?' : 'New to Athlete Passport?'}{' '}
          <a style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}>
            {creating ? 'Sign in' : 'Create account'}
          </a>
        </div>

        <div style={{
          marginTop: 6, paddingBottom: 12,
          fontSize: 11.5, lineHeight: 1.5, textAlign: 'center',
          color: 'rgba(255,255,255,0.42)',
        }}>
          By continuing you agree to our{' '}
          <a style={{ color: 'rgba(255,255,255,0.72)' }}>Terms</a> &{' '}
          <a style={{ color: 'rgba(255,255,255,0.72)' }}>Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}

function ValueProp({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.10)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <Icon name={icon} size={15} color="rgba(255,255,255,0.78)" stroke={1.9} />
      </div>
      <span style={{
        fontSize: 13.5, color: 'rgba(255,255,255,0.78)', letterSpacing: 0.1,
      }}>{label}</span>
    </div>
  );
}

function AuthButton({ variant, label, onClick }) {
  const base = {
    height: 50, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: '0 16px',
    fontSize: 15, fontWeight: 600, letterSpacing: 0.1, cursor: 'pointer',
    border: 'none', width: '100%',
  };
  const variants = {
    apple: {
      background: '#000', color: '#fff',
      border: '1px solid rgba(255,255,255,0.12)',
    },
    google: {
      background: '#fff', color: C.text,
    },
    email: {
      background: C.blue, color: '#fff',
      boxShadow: '0 6px 18px rgba(26,107,255,0.40)',
    },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...variants[variant] }}>
      <ProviderMark variant={variant} />
      {label}
    </button>
  );
}

// Neutral provider monograms — implementer should swap to the official
// Sign in with Apple / Google buttons (their SDKs ship the canonical assets).
function ProviderMark({ variant }) {
  if (variant === 'apple') {
    return (
      <span style={{
        width: 22, height: 22, borderRadius: 999,
        background: '#fff', color: '#000',
        display: 'grid', placeItems: 'center',
        fontWeight: 700, fontSize: 13,
        fontFamily: 'ui-serif, Georgia, serif',
      }}></span>
    );
  }
  if (variant === 'google') {
    return (
      <span style={{
        width: 22, height: 22, borderRadius: 999,
        background: C.canvas, color: C.text, border: `1px solid ${C.line}`,
        display: 'grid', placeItems: 'center',
        fontWeight: 700, fontSize: 12,
      }}>G</span>
    );
  }
  return (
    <span style={{
      width: 22, height: 22, borderRadius: 999,
      background: 'rgba(255,255,255,0.18)',
      display: 'grid', placeItems: 'center',
    }}>
      <Icon name="bell" size={12} color="#fff" stroke={2.2} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// BOTTOM TAB BAR — 64px high, +34 safe area below for home indicator
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'profile',     label: 'Profile',     route: '(tabs)/profile',     icon: 'user' },
  { id: 'connections', label: 'Connections', route: '(tabs)/connections', icon: 'users',  badge: 3 },
  { id: 'documents',   label: 'Documents',   route: '(tabs)/documents',   icon: 'doc',    lock: true },
  { id: 'search',      label: 'Search',      route: '(tabs)/search',      icon: 'search' },
];

function TabBar({ active, onChange }) {
  return (
    <nav style={{
      background: '#fff',
      borderTop: `1px solid ${C.line}`,
      paddingTop: 8, paddingBottom: 8,
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      position: 'relative',
    }}>
      {TABS.map(t => {
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, padding: '6px 0', color: on ? C.blue : '#8A93A4',
            position: 'relative',
          }}>
            <div style={{ position: 'relative', height: 24 }}>
              <Icon name={t.icon} size={24} color={on ? C.blue : '#8A93A4'} stroke={on ? 2.1 : 1.8} />
              {t.badge && (
                <span style={{
                  position: 'absolute', top: -4, right: -8,
                  minWidth: 16, height: 16, padding: '0 4px',
                  borderRadius: 999, background: C.blue, color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid #fff', letterSpacing: 0,
                }}>{t.badge}</span>
              )}
              {t.lock && (
                <span style={{
                  position: 'absolute', top: -4, right: -8,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#fff', display: 'grid', placeItems: 'center',
                  border: `1.5px solid ${on ? C.blue : '#CBD2DE'}`,
                }}>
                  <Icon name="lock" size={8} color={on ? C.blue : '#8A93A4'} stroke={2.2} />
                </span>
              )}
            </div>
            <span style={{
              fontSize: 10.5, fontWeight: on ? 700 : 500, letterSpacing: 0.1,
            }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

Object.assign(window, {
  C, Icon, Header, ApMark, Avatar, Card, SectionTitle,
  VerifiedChip, PendingChip, BlueCheck, Tag,
  ProfileScreen, ConnectionsScreen, DocumentsScreen, SearchScreen,
  LoginScreen, TabBar, TABS,
});
