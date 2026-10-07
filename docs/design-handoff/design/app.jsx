// app.jsx — Athlete Passport tab navigation shell
// Wires header + screen + tab bar inside an iOS frame, with Tweaks.

const { useState } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "activeTab": "profile",
  "authenticated": true,
  "authMode": "signin",
  "dataState": "loaded",
  "accent": "#1A6BFF"
}/*EDITMODE-END*/;

const HEADER_BY_TAB = {
  profile:     { title: 'Profile' },
  connections: { title: 'Connections' },
  performance: { title: 'Performance' },
  clubs:       { title: 'Clubs & trainers' },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const active = t.activeTab;
  const head = { ...HEADER_BY_TAB[active], subtitle: TAB_STATES[active].sub[t.dataState] };

  // override --blue at runtime if accent changed
  React.useEffect(() => {
    document.documentElement.style.setProperty('--blue', t.accent);
  }, [t.accent]);

  const renderTabBody = () => {
    if (t.dataState === 'empty') {
      switch (active) {
        case 'profile': return <ProfileEmpty />;
        case 'connections': return <ConnectionsEmpty />;
        case 'performance': return <PerformanceEmpty />;
        case 'clubs': return <ClubsEmpty />;
        default: return null;
      }
    }
    if (t.dataState === 'error') {
      switch (active) {
        case 'profile': return <ProfileError />;
        case 'connections': return <ConnectionsError />;
        case 'performance': return <PerformanceError />;
        case 'clubs': return <ClubsError />;
        default: return null;
      }
    }
    switch (active) {
      case 'profile':     return <ProfileScreen />;
      case 'connections': return <ConnectionsScreen />;
      case 'performance': return <PerformanceScreen />;
      case 'clubs':       return <ClubsScreen />;
      default:            return null;
    }
  };

  return (
    <React.Fragment>
      <IOSDevice width={375} height={812} dark={true}>
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column',
          background: 'var(--canvas)', overflow: 'hidden',
        }}>
          {t.authenticated ? (
            <React.Fragment>
              <Header title={head.title} subtitle={head.subtitle} />
              <main style={{
                flex: 1, overflow: 'auto',
                background: 'var(--canvas)',
                WebkitOverflowScrolling: 'touch',
              }}>
                {renderTabBody()}
              </main>
              <TabBar active={active} hideBadges={t.dataState !== 'loaded'} onChange={(id) => setTweak('activeTab', id)} />
            </React.Fragment>
          ) : (
            <main style={{ flex: 1, overflow: 'auto' }}>
              <LoginScreen
                mode={t.authMode}
                onAuth={() => setTweak('authenticated', true)}
              />
            </main>
          )}
          {/* safe area for home indicator — black to match frame */}
          <div style={{ height: 34, background: t.authenticated ? '#000' : '#050811' }} />
        </div>
      </IOSDevice>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Navigation">
          <TweakSelect
            label="Active tab"
            value={t.activeTab}
            onChange={(v) => setTweak('activeTab', v)}
            options={TABS.map(x => ({ value: x.id, label: x.label }))}
          />
          <TweakToggle
            label="Authenticated"
            value={t.authenticated}
            onChange={(v) => setTweak('authenticated', v)}
          />
          <TweakRadio
            label="Data state"
            value={t.dataState}
            onChange={(v) => setTweak('dataState', v)}
            options={[
              { value: 'loaded', label: 'Loaded' },
              { value: 'empty', label: 'Empty' },
              { value: 'error', label: 'Error' },
            ]}
          />
          <TweakRadio
            label="Login mode"
            value={t.authMode}
            onChange={(v) => setTweak('authMode', v)}
            options={[
              { value: 'signin', label: 'Sign in' },
              { value: 'create', label: 'Create' },
            ]}
          />
        </TweakSection>
        <TweakSection label="Branding">
          <TweakColor
            label="Accent"
            value={t.accent}
            onChange={(v) => setTweak('accent', v)}
            options={['#1A6BFF', '#0E7C66', '#D9482F', '#6938EF']}
          />
        </TweakSection>
        <TweakSection label="Hand-off">
          <div style={{
            fontSize: 12, lineHeight: 1.5, color: '#6B7280',
            background: '#F4F6FA', borderRadius: 10, padding: 10,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}>
            app/(tabs)/_layout.tsx<br/>
            ├── profile.tsx<br/>
            ├── connections.tsx<br/>
            ├── performance.tsx<br/>
            └── clubs.tsx
          </div>
        </TweakSection>
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
