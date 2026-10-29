/* global React, I, Avatar, Chip, Tag, Btn, PageHead, Segmented, Sparkline, Stripes, PSidebar, PTopBar, PMain, PBody, ClubMark, StatusChip, KpiStrip, PTable, NameCell, Num, Mono, IconBtn, Toolbar, Field, Input, Select, Check, Modal, PermPills, Panel */

const TR_NAV = (active) => ({
  role: "Trainer portal",
  roleTone: "amber",
  active,
  switcher: { name: "Stanford Cardinal T&F", short: "SC", hue: 20 },
  user: { name: "Miguel Garza", hue: 30, sub: "Head coach · USATF L3", verified: true },
  sections: [
    { title: "Coaching", items: [
      { key: "home", label: "Home", icon: "grid" },
      { key: "athletes", label: "Athletes", icon: "users" },
      { key: "achievements", label: "Achievements", icon: "trophy", badge: 6, badgeTone: "amber" },
      { key: "metrics", label: "Metrics", icon: "activity" },
    ] },
    { title: "Club", items: [
      { key: "invitations", label: "Invitations", icon: "link", badge: 4 },
      { key: "clubs", label: "My clubs", icon: "flag" },
    ] },
  ],
});

const TR_ATH = [
  { name: "Cristian Valencia", hue: 210, ev: "100m / 200m", grp: "Sprints", pb: "10.84", u: "s", trend: [11.12, 11.05, 11.01, 10.98, 10.96, 10.93, 10.91, 10.88, 10.84], att: 96, last: "Today", pend: 1, s: "active" },
  { name: "Sofia Martinez", hue: 340, ev: "200m / 400m", grp: "Sprints", pb: "23.02", u: "s", trend: [23.6, 23.5, 23.4, 23.4, 23.3, 23.2, 23.1, 23.05, 23.02], att: 92, last: "Today", pend: 1, s: "active" },
  { name: "Jalen Brooks", hue: 150, ev: "Long jump", grp: "Jumps", pb: "7.62", u: "m", trend: [7.2, 7.25, 7.31, 7.3, 7.42, 7.44, 7.5, 7.58, 7.62], att: 88, last: "Yesterday", pend: 2, s: "active" },
  { name: "Emma Lindqvist", hue: 30, ev: "400m H", grp: "Hurdles", pb: "56.40", u: "s", trend: [58.1, 57.9, 57.6, 57.4, 57.2, 57.0, 56.8, 56.6, 56.4], att: 94, last: "Today", pend: 1, s: "active" },
  { name: "Mateo Rossi", hue: 260, ev: "400m", grp: "Sprints", pb: "47.10", u: "s", trend: [48.2, 48.0, 47.9, 47.7, 47.6, 47.5, 47.4, 47.2, 47.1], att: 81, last: "3 days ago", pend: 1, s: "active" },
  { name: "Aaliyah Grant", hue: 0, ev: "Shot put", grp: "Throws", pb: "16.85", u: "m", trend: [15.9, 16.0, 16.1, 16.2, 16.3, 16.4, 16.6, 16.7, 16.85], att: 90, last: "Yesterday", pend: 0, s: "active" },
  { name: "Noah Kim", hue: 190, ev: "1500m", grp: "Distance", pb: "3:44.2", u: "", trend: [3, 3.1, 3.2, 3.1, 3.3, 3.4, 3.5, 3.5, 3.6], att: 74, last: "1 week ago", pend: 0, s: "active" },
  { name: "Grace Adeyemi", hue: 300, ev: "100m H", grp: "Hurdles", pb: "—", u: "", trend: [], att: 0, last: "—", pend: 0, s: "invited" },
];

const TR_QUEUE = [
  { a: "Cristian Valencia", hue: 210, type: "Result", title: "100m · 10.84s", meta: "Bay Area Showcase · Sep 27, 2026 · wind +1.2", ev: "FAT timing sheet", when: "2h ago", pb: true },
  { a: "Jalen Brooks", hue: 150, type: "Result", title: "Long jump · 7.62m", meta: "Stanford Invitational · Sep 13 · wind +0.8", ev: "Official results PDF", when: "5h ago", pb: true },
  { a: "Emma Lindqvist", hue: 30, type: "Honor", title: "All-Pac-12 Second Team", meta: "Pac-12 Conference · 2026 outdoor", ev: "Conference release", when: "Yesterday" },
  { a: "Sofia Martinez", hue: 340, type: "Result", title: "200m · 23.02s", meta: "Stanford Invitational · Sep 13 · wind +0.6", ev: "FAT timing sheet", when: "Yesterday", pb: true },
  { a: "Mateo Rossi", hue: 260, type: "Result", title: "400m · 47.10s", meta: "Cal Opener · Sep 06", ev: "Missing evidence", when: "2 days ago", warn: true },
  { a: "Jalen Brooks", hue: 150, type: "Test", title: "Vertical jump · 78cm", meta: "Testing day · Oct 20", ev: "Logged by D. Ruiz", when: "3 days ago" },
];

// ─── T1 · Home ──────────────────────────────────────────────
const TrainerHome = () => (
  <PMain>
    <PTopBar crumbs={["Stanford Cardinal T&F", "Home"]} search="Search athletes" action="Log session" />
    <PBody>
      <PageHead eyebrow="Wed, Oct 28 · Week 9 of fall block" title="Good morning, Miguel" sub="6 achievements to verify and 4 open invitations." />
      <KpiStrip items={[
        { l: "Athletes", v: "64", d: "+3 this month" },
        { l: "To verify", v: "6", c: "var(--pending)", d: "oldest 2 days", dTone: "warn" },
        { l: "PBs this season", v: "38", d: "+9 vs 2025" },
        { l: "Avg. attendance", v: "89%", d: "+2 pts" },
      ]} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 18, flex: 1, minHeight: 0 }}>
        <Panel title="Waiting for your verification" right={<Btn variant="link" sm>Open queue</Btn>}>
          {TR_QUEUE.slice(0, 4).map((q, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderTop: i ? "1px solid var(--line-2)" : "none" }}>
              <Avatar name={q.a} hue={q.hue} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>{q.title}{q.pb && <Chip tone="blue">PB</Chip>}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{q.a} · {q.meta}</div>
              </div>
              <span style={{ fontSize: 11.5, color: "var(--subtle)" }}>{q.when}</span>
              <Btn sm variant="primary" icon="check">Verify</Btn>
            </div>
          ))}
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minHeight: 0 }}>
          <Panel title="My clubs" right={<Btn variant="link" sm>Manage</Btn>}>
            {[["SC", 20, "Stanford Cardinal T&F", "Head coach · 64 athletes", ["View", "Log", "Verify"]], ["BA", 230, "Bay Area Sprint Academy", "Guest coach · 12 athletes", ["View", "Log"]]].map(([s, h, n, r, p], i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderTop: i ? "1px solid var(--line-2)" : "none" }}>
                <ClubMark short={s} hue={h} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{n}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{r}</div></div>
                <PermPills perms={p} />
              </div>
            ))}
          </Panel>
          <Panel title="Invitations" right={<Btn variant="link" sm>View all</Btn>}>
            {[["Grace Adeyemi", 300, "Athlete · 100m H", "opened"], ["Hannah Osei", 330, "Trainer · Sprint specialist", "sent"], ["Liam Carter", 120, "Athlete · 800m", "sent"]].map(([n, h, r, s], i) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderTop: i ? "1px solid var(--line-2)" : "none" }}>
                <Avatar name={n} hue={h} size={30} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{n}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{r}</div></div>
                <StatusChip s={s} />
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </PBody>
  </PMain>
);

// ─── T2 · Athletes roster ───────────────────────────────────
const TrainerAthletes = () => (
  <PMain>
    <PTopBar crumbs={["Stanford Cardinal T&F", "Athletes"]} search="Search athletes" action="Invite athlete" />
    <PBody>
      <PageHead title="Athletes" sub="64 athletes · 5 event groups · season 2026" right={<Btn icon="download">Export CSV</Btn>} />
      <Toolbar
        left={<Segmented items={[{ l: "All", n: 64 }, { l: "Sprints", n: 22 }, { l: "Hurdles", n: 9 }, { l: "Jumps", n: 11 }, { l: "Throws", n: 10 }, { l: "Distance", n: 12 }]} active="All" />}
        right={<React.Fragment><Btn icon="filter">Has pending</Btn><Btn icon="sliders">Columns</Btn></React.Fragment>}
      />
      <PTable selected={0} cols={[
        { h: "Athlete", w: "minmax(0,1.7fr)", r: (r) => <NameCell lead={<Avatar name={r.name} hue={r.hue} size={34} verified={r.s === "active"} />} title={r.name} sub={`${r.grp} · ${r.ev}`} /> },
        { h: "Season best", w: "110px", align: "right", r: (r) => <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: r.pb === "—" ? "var(--subtle)" : "var(--text)" }}>{r.pb}<span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 2 }}>{r.u}</span></span> },
        { h: "Trend · 9 mo", w: "120px", r: (r) => r.trend.length ? <Sparkline data={r.u === "m" || r.u === "" ? r.trend : r.trend.map((v) => -v)} width={100} height={26} /> : <span style={{ color: "var(--subtle)", fontSize: 12 }}>No data</span> },
        { h: "Attendance", w: "130px", r: (r) => r.att ? <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}><div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--line-2)" }}><div style={{ width: `${r.att}%`, height: "100%", borderRadius: 3, background: r.att < 80 ? "var(--pending)" : "var(--blue)" }}></div></div><Num>{r.att}%</Num></div> : <span style={{ color: "var(--subtle)", fontSize: 12 }}>—</span> },
        { h: "Last session", w: "100px", r: (r) => <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{r.last}</span> },
        { h: "To verify", w: "80px", r: (r) => r.s === "invited" ? <StatusChip s="invited" /> : r.pend ? <Chip tone="pending">{r.pend} pending</Chip> : <span style={{ color: "var(--subtle)", fontSize: 12 }}>—</span> },
        { h: "", w: "30px", r: () => <IconBtn icon="chevronRight" /> },
      ]} rows={TR_ATH} />
    </PBody>
  </PMain>
);

// ─── T3 · Athlete detail: metrics + achievements ────────────
const SERIES = [11.12, 11.05, 11.01, 10.98, 10.96, 10.93, 10.91, 10.88, 10.84];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const LineChart = ({ w = 560, h = 180 }) => {
  const min = 10.8, max = 11.15, px = 36, py = 14;
  const x = (i) => px + (i * (w - px - 8)) / (SERIES.length - 1);
  const y = (v) => py + ((v - min) / (max - min)) * (h - py * 2);
  const pts = SERIES.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <svg width={w} height={h + 20} viewBox={`0 0 ${w} ${h + 20}`}>
      {[10.8, 10.9, 11.0, 11.1].map((g) => <g key={g}><line x1={px} x2={w} y1={y(g)} y2={y(g)} stroke="#EEF1F5" /><text x={0} y={y(g) + 4} fontSize="10.5" fill="#9AA3B2" fontFamily="JetBrains Mono">{g.toFixed(2)}</text></g>)}
      <polygon points={`${x(0)},${h} ${pts} ${x(SERIES.length - 1)},${h}`} fill="#1A6BFF" fillOpacity="0.07" />
      <polyline points={pts} fill="none" stroke="#1A6BFF" strokeWidth="2" strokeLinejoin="round" />
      {SERIES.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === SERIES.length - 1 ? 5 : 3} fill={i === SERIES.length - 1 ? "#1A6BFF" : "#fff"} stroke="#1A6BFF" strokeWidth="2" />)}
      {MONTHS.map((m, i) => <text key={m} x={x(i)} y={h + 16} fontSize="10.5" fill="#9AA3B2" textAnchor="middle">{m}</text>)}
    </svg>
  );
};

const TrainerAthlete = ({ modal = false }) => (
  <PMain>
    <PTopBar crumbs={["Stanford Cardinal T&F", "Athletes", "Cristian Valencia"]} search="Search athletes" />
    <div style={{ padding: "20px 28px", background: "var(--paper)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 16 }}>
      <Avatar name="Cristian Valencia" hue={210} size={56} verified ring />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Cristian Valencia</h1><Mono>AP-2847-CV-09</Mono></div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, display: "flex", gap: 8 }}><span>Sprints · 100m / 200m</span><span>·</span><span>Junior · 21 y/o</span><span>·</span><span>Joined Aug 2023</span></div>
      </div>
      <Btn icon="message">Message</Btn>
      <Btn icon="trophy">Add achievement</Btn>
      <Btn variant="primary" icon="plus">Log metrics</Btn>
    </div>
    <PBody>
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--line)", marginTop: -6 }}>
        {["Overview", "Metrics", "Achievements", "Sessions", "Access"].map((t) => <div key={t} style={{ padding: "8px 14px", fontSize: 13, fontWeight: 600, color: t === "Overview" ? "var(--text)" : "var(--muted)", borderBottom: `2px solid ${t === "Overview" ? "var(--blue)" : "transparent"}`, marginBottom: -1 }}>{t}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
        {[["100m PB", "10.84", "s", "−0.28s vs 2025", "pending"], ["200m PB", "21.92", "s", "−0.41s vs 2025", "verified"], ["Top speed", "11.2", "m/s", "+0.3 vs 2025", "verified"], ["Reaction", "0.138", "s", "Club avg 0.152", "verified"]].map(([l, v, u, d, s]) => (
          <div key={l} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--muted)" }}>{l}</span><StatusChip s={s} /></div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 700, letterSpacing: -0.7, fontVariantNumeric: "tabular-nums" }}>{v}<span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 3, fontWeight: 600 }}>{u}</span></div>
            <div style={{ fontSize: 12, color: "var(--verified)", fontWeight: 600, marginTop: 2 }}>{d}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 18, flex: 1, minHeight: 0 }}>
        <Panel title="100m progression" right={<Segmented items={["100m", "200m", "Top speed"]} active="100m" />} pad="14px 18px">
          <LineChart />
        </Panel>
        <Panel title="Achievements" right={<Btn variant="link" sm>All 14</Btn>}>
          {[["100m · 10.84s", "Bay Area Showcase · Sep 27", "pending", true], ["200m · 21.92s", "Stanford Invitational · Sep 13", "verified"], ["Pac-12 Finalist · 100m", "Pac-12 Championships · May 2026", "verified"], ["Team captain", "Stanford Cardinal · 2026", "verified"]].map(([t, m, s, act], i) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderTop: i ? "1px solid var(--line-2)" : "none", background: act ? "var(--pending-tint)" : "transparent" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: act ? "#fff" : "var(--canvas)", display: "grid", placeItems: "center" }}><I.trophy size={15} color={act ? "var(--pending)" : "var(--muted)"} /></div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>{m}</div></div>
              {act ? <div style={{ display: "flex", gap: 6 }}><Btn sm variant="danger">Reject</Btn><Btn sm variant="primary">Verify</Btn></div> : <StatusChip s={s} />}
            </div>
          ))}
        </Panel>
      </div>
    </PBody>
    {modal && (
      <Modal title="Log metrics" sub="Cristian Valencia · Session on Oct 28, 2026" width={600}
        footer={<React.Fragment><Btn>Cancel</Btn><Btn>Save draft</Btn><Btn variant="primary" icon="check">Save & verify</Btn></React.Fragment>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Session type"><Select value="Speed testing" /></Field>
          <Field label="Date"><Input value="Oct 28, 2026" icon="calendar" /></Field>
        </div>
        <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 28px", gap: 12, padding: "8px 14px", background: "var(--paper-2)", fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--muted)" }}><span>Metric</span><span>Value</span><span>Conditions</span><span></span></div>
          {[["30m fly", "2.71", "s", "Wind +0.4"], ["Top speed", "11.2", "m/s", "Laser"], ["Reaction", "0.138", "s", "Blocks"]].map(([m, v, u, c]) => (
            <div key={m} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 28px", gap: 12, padding: "8px 14px", borderTop: "1px solid var(--line-2)", alignItems: "center" }}>
              <Select value={m} /><Input value={v} suffix={u} mono /><Input value={c} /><I.x size={14} color="var(--subtle)" />
            </div>
          ))}
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line-2)" }}><Btn variant="link" sm icon="plus">Add metric</Btn></div>
        </div>
        <Field label="Evidence" hint="Timing export or video. Required to mark as verified.">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px dashed var(--line)", borderRadius: 10, fontSize: 13, color: "var(--muted)" }}><I.upload size={16} />Drop a file or <span style={{ color: "var(--blue)", fontWeight: 600 }}>browse</span></div>
        </Field>
      </Modal>
    )}
  </PMain>
);

// ─── T4 · Achievements review queue ─────────────────────────
const TrainerAchievements = () => {
  const q = TR_QUEUE[0];
  return (
    <PMain>
      <PTopBar crumbs={["Stanford Cardinal T&F", "Achievements"]} search="Search achievements" />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <PBody>
          <PageHead title="Achievements" sub="Verify results, honors and tests submitted by your athletes." />
          <Toolbar left={<Segmented items={[{ l: "To verify", n: 6 }, { l: "Verified", n: 212 }, { l: "Rejected", n: 4 }]} active="To verify" />} right={<React.Fragment><Btn icon="filter">Type: All</Btn><Btn icon="users">Group: All</Btn></React.Fragment>} />
          <PTable selected={0} dense cols={[
            { h: "Athlete", w: "minmax(0,1.2fr)", r: (r) => <NameCell lead={<Avatar name={r.a} hue={r.hue} size={30} />} title={r.a} /> },
            { h: "Achievement", w: "minmax(0,1.6fr)", r: (r) => <NameCell title={<span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>{r.title}{r.pb && <Chip tone="blue">PB</Chip>}</span>} sub={r.meta} /> },
            { h: "Type", w: "70px", r: (r) => <Tag>{r.type}</Tag> },
            { h: "Evidence", w: "150px", r: (r) => <span style={{ fontSize: 12, color: r.warn ? "var(--rejected)" : "var(--muted)", display: "flex", gap: 6, alignItems: "center" }}>{React.createElement(I[r.warn ? "x" : "file"], { size: 13 })}{r.ev}</span> },
            { h: "Submitted", w: "80px", r: (r) => <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.when}</span> },
          ]} rows={TR_QUEUE} />
        </PBody>
        <aside style={{ width: 400, flexShrink: 0, background: "var(--paper)", borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", gap: 12, alignItems: "center" }}>
            <Avatar name={q.a} hue={q.hue} size={40} verified />
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{q.a}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Sprints · submitted {q.when}</div></div>
            <StatusChip s="pending" />
          </div>
          <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--muted)" }}>Result · 100m</div>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>10.84<span style={{ fontSize: 15, color: "var(--muted)", marginLeft: 3 }}>s</span></div>
              <div style={{ fontSize: 12.5, color: "var(--verified)", fontWeight: 600 }}>New PB · −0.04s vs 10.88 (Aug 2026)</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "12px 0", borderTop: "1px solid var(--line-2)", borderBottom: "1px solid var(--line-2)" }}>
              {[["Meet", "Bay Area Showcase"], ["Date", "Sep 27, 2026"], ["Wind", "+1.2 m/s · legal"], ["Timing", "FAT"]].map(([l, v]) => <div key={l}><div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div></div>)}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Evidence</div>
              <Stripes height={120} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12, color: "var(--muted)" }}><I.file size={13} /><span style={{ flex: 1 }}>bay_area_showcase_100m_final.pdf</span><Btn sm variant="link" icon="eye">Open</Btn></div>
            </div>
            <Field label="Note to athlete (optional)"><Input placeholder="e.g. Confirmed against meet results" /></Field>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
            <Btn variant="danger" style={{ flex: 1 }}>Reject</Btn>
            <Btn style={{ flex: 1 }}>Ask for info</Btn>
            <Btn variant="primary" icon="check" style={{ flex: 1.3 }}>Verify</Btn>
          </div>
        </aside>
      </div>
    </PMain>
  );
};

// ─── T5 · Invitations ───────────────────────────────────────
const INV = [
  { name: "Grace Adeyemi", hue: 300, email: "grace.adeyemi@stanford.edu", role: "Athlete", grp: "Hurdles", s: "opened", sent: "Oct 26", exp: "in 5 days" },
  { name: "Liam Carter", hue: 120, email: "lcarter@stanford.edu", role: "Athlete", grp: "Distance", s: "sent", sent: "Oct 27", exp: "in 6 days" },
  { name: "Hannah Osei", hue: 330, email: "hannah.osei@usatf.org", role: "Trainer", grp: "Sprint specialist", s: "sent", sent: "Oct 27", exp: "in 6 days" },
  { name: "Maya Fischer", hue: 10, email: "mfischer@stanford.edu", role: "Athlete", grp: "Jumps", s: "sent", sent: "Oct 28", exp: "in 7 days" },
  { name: "Owen Park", hue: 220, email: "opark@stanford.edu", role: "Athlete", grp: "Sprints", s: "accepted", sent: "Oct 20", exp: "Joined Oct 21" },
  { name: "Ruby Chen", hue: 160, email: "ruby.c@gmail.com", role: "Athlete", grp: "Throws", s: "expired", sent: "Oct 02", exp: "Expired Oct 09" },
];
const TrainerInvitations = () => (
  <PMain>
    <PTopBar crumbs={["Stanford Cardinal T&F", "Invitations"]} search="Search invitations" />
    <PBody style={{ flexDirection: "row", gap: 18 }}>
      <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        <PageHead title="Invitations" sub="Invite athletes and staff to Stanford Cardinal T&F." />
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "var(--shadow-sm)", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>New invitation</div>
          <Field label="Invite as">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Athlete", "users", true], ["Trainer", "briefcase", false]].map(([l, ic, on]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: `1px solid ${on ? "var(--blue)" : "var(--line)"}`, background: on ? "var(--blue-tint)" : "var(--paper)", color: on ? "var(--blue)" : "var(--text)", fontSize: 13, fontWeight: 600 }}>{React.createElement(I[ic], { size: 15 })}{l}</div>
              ))}
            </div>
          </Field>
          <Field label="Emails" hint="Separate with commas or paste a list.">
            <div style={{ minHeight: 76, padding: 8, border: "1px solid var(--blue)", boxShadow: "0 0 0 3px var(--blue-glow)", borderRadius: 10, display: "flex", flexWrap: "wrap", gap: 6, alignContent: "flex-start" }}>
              {["jwest@stanford.edu", "a.ndiaye@stanford.edu"].map((e) => <span key={e} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 7, background: "var(--canvas)", fontSize: 12.5 }}>{e}<I.x size={11} color="var(--muted)" /></span>)}
              <span style={{ fontSize: 12.5, color: "var(--subtle)", padding: "4px 2px" }}>Add email…</span>
            </div>
          </Field>
          <Field label="Event group"><Select value="Sprints" /></Field>
          <Field label="Message (optional)"><Input value="Welcome to the fall block — see you Monday 7am." /></Field>
          <Btn variant="primary" icon="arrowUpRight" style={{ padding: "10px 13px" }}>Send 2 invitations</Btn>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, borderTop: "1px solid var(--line-2)" }}>
            <I.link size={15} color="var(--muted)" />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>Invite link</div><Mono>passport.app/j/sc-7XK2</Mono></div>
            <Btn sm>Copy</Btn>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14, paddingTop: 2 }}>
        <Toolbar left={<Segmented items={[{ l: "Open", n: 4 }, { l: "Accepted", n: 31 }, { l: "Expired", n: 2 }]} active="Open" />} right={<Btn icon="download">Export</Btn>} />
        <PTable cols={[
          { h: "Invitee", w: "minmax(0,1.6fr)", r: (r) => <NameCell lead={<Avatar name={r.name} hue={r.hue} size={32} />} title={r.name} sub={r.email} /> },
          { h: "Role", w: "minmax(0,1fr)", r: (r) => <NameCell title={r.role} sub={r.grp} /> },
          { h: "Status", w: "100px", r: (r) => <StatusChip s={r.s} /> },
          { h: "Sent", w: "60px", r: (r) => <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{r.sent}</span> },
          { h: "Expires", w: "100px", r: (r) => <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{r.exp}</span> },
          { h: "", w: "120px", align: "right", r: (r) => r.s === "accepted" ? <Btn sm variant="link">View profile</Btn> : <React.Fragment><Btn sm>{r.s === "expired" ? "Re-send" : "Resend"}</Btn><IconBtn icon="x" /></React.Fragment> },
        ]} rows={INV} />
      </div>
    </PBody>
  </PMain>
);

Object.assign(window, { TR_NAV, TrainerHome, TrainerAthletes, TrainerAthlete, TrainerAchievements, TrainerInvitations });
