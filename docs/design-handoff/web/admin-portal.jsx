/* global React, I, Avatar, Chip, Btn, PageHead, Segmented, Sparkline, PSidebar, PTopBar, PMain, PBody, ClubMark, StatusChip, KpiStrip, PTable, NameCell, Num, Mono, IconBtn, Toolbar, Field, Input, Select, Check, Modal, PermPills, Panel */

const AD_NAV = (active) => ({
  role: "Admin portal",
  active,
  user: { name: "Laura Benítez", hue: 160, sub: "Platform admin" },
  sections: [
    { title: "Manage", items: [
      { key: "overview", label: "Overview", icon: "grid" },
      { key: "clubs", label: "Clubs", icon: "flag", badge: 2, badgeTone: "amber" },
      { key: "trainers", label: "Trainers", icon: "users", badge: 3, badgeTone: "amber" },
    ] },
    { title: "System", items: [
      { key: "audit", label: "Audit log", icon: "activity" },
      { key: "settings", label: "Settings", icon: "settings" },
    ] },
  ],
});

const AD_CLUBS = [
  { name: "Stanford Cardinal Track & Field", short: "SC", hue: 20, type: "NCAA D1", place: "Stanford, CA", trainers: 8, athletes: 64, s: "verified", owner: "Miguel Garza", since: "Mar 2024" },
  { name: "Oregon Ducks Athletics", short: "OD", hue: 140, type: "NCAA D1", place: "Eugene, OR", trainers: 11, athletes: 82, s: "verified", owner: "Tom Becker", since: "Jan 2024" },
  { name: "UCLA Track Club", short: "UC", hue: 240, type: "Club", place: "Los Angeles, CA", trainers: 5, athletes: 41, s: "review", owner: "Rachel Kim", since: "Oct 2026" },
  { name: "Bay Area Sprint Academy", short: "BA", hue: 230, type: "Academy", place: "San José, CA", trainers: 4, athletes: 37, s: "verified", owner: "Ramón Alvarez", since: "Jun 2024" },
  { name: "Leinster Academy", short: "LA", hue: 200, type: "Academy", place: "Dublin, IE", trainers: 6, athletes: 52, s: "verified", owner: "Aoife Byrne", since: "Feb 2025" },
  { name: "Apex S&C Lab", short: "AX", hue: 290, type: "Performance center", place: "Palo Alto, CA", trainers: 3, athletes: 18, s: "review", owner: "Daniel Ruiz", since: "Oct 2026" },
  { name: "Duke Basketball S&C", short: "DB", hue: 255, type: "NCAA D1", place: "Durham, NC", trainers: 7, athletes: 29, s: "verified", owner: "Chris Holt", since: "Aug 2025" },
  { name: "Sacramento Striders", short: "SS", hue: 50, type: "Youth club", place: "Sacramento, CA", trainers: 2, athletes: 23, s: "suspended", owner: "Kevin Lyons", since: "May 2025" },
];

const AD_TRAINERS = [
  { name: "Miguel Garza", hue: 30, email: "m.garza@stanford.edu", role: "Head coach", cred: "USATF Level 3", clubs: ["SC"], athletes: 64, perms: ["View", "Log", "Verify"], s: "active", last: "12 min ago" },
  { name: "Daniel Ruiz", hue: 200, email: "daniel@apexsc.com", role: "S&C coach", cred: "NSCA-CSCS", clubs: ["AX"], athletes: 18, perms: ["View", "Log"], s: "review", last: "2h ago" },
  { name: "Hannah Osei", hue: 330, email: "hannah.osei@usatf.org", role: "Sprint specialist", cred: "USATF Level 3", clubs: ["SC"], athletes: 0, perms: ["View", "Log"], s: "invited", last: "—" },
  { name: "Ramón Alvarez", hue: 230, email: "ramon@basprint.org", role: "Head coach", cred: "USATF Level 2", clubs: ["BA", "SC"], athletes: 37, perms: ["View", "Log", "Verify"], s: "active", last: "Yesterday" },
  { name: "Dr. Priya Rao", hue: 280, email: "prao@stanfordmed.org", role: "Physiotherapist", cred: "DPT · Licensed", clubs: ["SC"], athletes: 22, perms: ["View"], s: "active", last: "3 days ago" },
  { name: "Tom Becker", hue: 140, email: "tbecker@uoregon.edu", role: "Director of T&F", cred: "USATF Level 3", clubs: ["OD"], athletes: 82, perms: ["View", "Log", "Verify"], s: "active", last: "1h ago" },
  { name: "Aoife Byrne", hue: 200, email: "aoife@leinster.ie", role: "Academy coach", cred: "UKA Level 4", clubs: ["LA"], athletes: 52, perms: ["View", "Log", "Verify"], s: "active", last: "5h ago" },
  { name: "Kevin Lyons", hue: 50, email: "kevin@striders.org", role: "Youth coach", cred: "Expired · USATF L1", clubs: ["SS"], athletes: 23, perms: ["View"], s: "suspended", last: "Sep 12" },
];
const clubByShort = (s) => AD_CLUBS.find((c) => c.short === s);

// ─── A1 · Overview ──────────────────────────────────────────
const AdminOverview = () => {
  const approvals = [
    { kind: "Club application", title: "UCLA Track Club", sub: "Club · Los Angeles, CA · 41 athletes", lead: <ClubMark short="UC" hue={240} size={36} />, docs: "Charter, insurance cert.", when: "2h ago" },
    { kind: "Trainer credential", title: "Daniel Ruiz", sub: "NSCA-CSCS · Apex S&C Lab", lead: <Avatar name="Daniel Ruiz" hue={200} size={36} />, docs: "Certificate PDF", when: "2h ago" },
    { kind: "Club application", title: "Apex S&C Lab", sub: "Performance center · Palo Alto, CA", lead: <ClubMark short="AX" hue={290} size={36} />, docs: "Business license", when: "Yesterday" },
    { kind: "Credential renewal", title: "Kevin Lyons", sub: "USATF Level 1 expired Sep 12", lead: <Avatar name="Kevin Lyons" hue={50} size={36} />, docs: "Awaiting upload", when: "Sep 12", warn: true },
  ];
  const activity = [
    ["Tom Becker", "added 3 athletes to", "Oregon Ducks Athletics", "1h"],
    ["Laura Benítez", "approved trainer", "Aoife Byrne", "3h"],
    ["Miguel Garza", "invited trainer", "Hannah Osei", "5h"],
    ["System", "suspended", "Sacramento Striders", "Sep 12"],
    ["Ramón Alvarez", "verified 12 results at", "Bay Area Sprint Academy", "Sep 11"],
  ];
  return (
    <PMain>
      <PTopBar crumbs={["Admin", "Overview"]} search="Search clubs, trainers, athletes" />
      <PBody>
        <PageHead eyebrow="Wed, Oct 28" title="Platform overview" sub="Clubs and trainers across Athlete Passport." right={<React.Fragment><Btn icon="plus">Invite trainer</Btn><Btn variant="primary" icon="plus">Add club</Btn></React.Fragment>} />
        <KpiStrip items={[
          { l: "Active clubs", v: "128", d: "+6 this month" },
          { l: "Trainers", v: "342", d: "+21 this month" },
          { l: "Athletes", v: "4,816", d: "+3.2%" },
          { l: "Awaiting approval", v: "5", c: "var(--pending)", d: "2 clubs · 3 trainers", dTone: "warn" },
        ]} />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)", gap: 18, flex: 1, minHeight: 0 }}>
          <Panel title="Needs approval" right={<Btn variant="link" sm>View all</Btn>}>
            {approvals.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: i ? "1px solid var(--line-2)" : "none" }}>
                {a.lead}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: a.warn ? "var(--rejected)" : "var(--muted)" }}>{a.kind}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{a.sub}</div>
                </div>
                <div style={{ width: 150, fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}><I.file size={13} />{a.docs}</div>
                <div style={{ width: 70, fontSize: 12, color: "var(--subtle)", textAlign: "right" }}>{a.when}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {a.warn ? <Btn sm>Send reminder</Btn> : <React.Fragment><Btn sm variant="danger">Decline</Btn><Btn sm variant="primary">Approve</Btn></React.Fragment>}
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="Recent activity" right={<Btn variant="link" sm>Audit log</Btn>}>
            {activity.map(([who, verb, obj, t], i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "13px 18px", borderTop: i ? "1px solid var(--line-2)" : "none", alignItems: "flex-start" }}>
                {who === "System" ? <div style={{ width: 28, height: 28, borderRadius: 999, background: "var(--rejected-tint)", display: "grid", placeItems: "center", flexShrink: 0 }}><I.shield size={14} color="var(--rejected)" /></div> : <Avatar name={who} hue={(who.length * 37) % 360} size={28} />}
                <div style={{ flex: 1, fontSize: 13, lineHeight: 1.45, color: "var(--muted)" }}><b style={{ color: "var(--text)", fontWeight: 600 }}>{who}</b> {verb} <b style={{ color: "var(--text)", fontWeight: 600 }}>{obj}</b></div>
                <span style={{ fontSize: 11.5, color: "var(--subtle)" }}>{t}</span>
              </div>
            ))}
          </Panel>
        </div>
      </PBody>
    </PMain>
  );
};

// ─── A2 · Clubs (list + detail drawer) ──────────────────────
const AdminClubs = () => {
  const c = AD_CLUBS[2];
  return (
    <PMain>
      <PTopBar crumbs={["Admin", "Clubs"]} search="Search clubs" action="Add club" />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <PBody>
          <PageHead title="Clubs" sub="128 clubs · 2 awaiting approval · 1 suspended" />
          <Toolbar
            left={<Segmented items={[{ l: "All", n: 128 }, { l: "Verified", n: 125 }, { l: "In review", n: 2 }, { l: "Suspended", n: 1 }]} active="All" />}
            right={<React.Fragment><Btn icon="filter">Type: All</Btn><Btn icon="mapPin">Region: All</Btn><Btn icon="download">Export</Btn></React.Fragment>}
          />
          <PTable selected={2} cols={[
            { h: "Club", w: "minmax(0,2.2fr)", r: (r) => <NameCell lead={<ClubMark short={r.short} hue={r.hue} />} title={r.name} sub={`${r.type} · ${r.place}`} /> },
            { h: "Owner", w: "minmax(0,1.1fr)", r: (r) => <span style={{ color: "var(--muted)" }}>{r.owner}</span> },
            { h: "Trainers", w: "80px", align: "right", r: (r) => <Num>{r.trainers}</Num> },
            { h: "Athletes", w: "80px", align: "right", r: (r) => <Num>{r.athletes}</Num> },
            { h: "Status", w: "110px", r: (r) => <StatusChip s={r.s} /> },
            { h: "", w: "30px", r: () => <IconBtn /> },
          ]} rows={AD_CLUBS} dense />
        </PBody>
        <aside style={{ width: 380, flexShrink: 0, background: "var(--paper)", borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <ClubMark short={c.short} hue={c.hue} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{c.type} · {c.place}</div>
                <div style={{ marginTop: 8 }}><StatusChip s={c.s} /></div>
              </div>
              <IconBtn icon="x" />
            </div>
          </div>
          <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 18, flex: 1, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Owner", c.owner], ["Applied", "Oct 26, 2026"], ["Trainers", "5 pending link"], ["Athletes", "41 to import"]].map(([l, v]) => (
                <div key={l}><div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div></div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Verification checklist</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Check on label="Club charter" sub="ucla_tc_charter_2026.pdf" />
                <Check on label="Liability insurance" sub="Valid until Aug 2027" />
                <Check label="Owner identity" sub="Rachel Kim · ID not uploaded" />
                <Check label="Governing body ID" sub="USATF club # required" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Proposed trainers</div>
              {[["Rachel Kim", "Head coach · USATF L3"], ["Jordan Miles", "Sprints · USATF L2"], ["Ana Torres", "Throws · USATF L2"]].map(([n, s], i) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i ? "1px solid var(--line-2)" : "none" }}>
                  <Avatar name={n} hue={(n.length * 41) % 360} size={28} />
                  <div style={{ flex: 1, fontSize: 13 }}><div style={{ fontWeight: 600 }}>{n}</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s}</div></div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "var(--muted)", paddingTop: 4 }}>+2 more</div>
            </div>
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
            <Btn variant="danger" style={{ flex: 1 }}>Decline</Btn>
            <Btn style={{ flex: 1 }}>Request info</Btn>
            <Btn variant="primary" icon="check" style={{ flex: 1.3 }}>Approve club</Btn>
          </div>
        </aside>
      </div>
    </PMain>
  );
};

// ─── A3 · Trainers ──────────────────────────────────────────
const AdminTrainersTable = () => (
  <PTable cols={[
    { h: "Trainer", w: "minmax(0,1.8fr)", r: (r) => <NameCell lead={<Avatar name={r.name} hue={r.hue} size={34} verified={r.s === "active"} />} title={r.name} sub={r.email} /> },
    { h: "Role · credential", w: "minmax(0,1.3fr)", r: (r) => <NameCell title={r.role} sub={r.cred} /> },
    { h: "Clubs", w: "90px", r: (r) => <div style={{ display: "flex", gap: 4 }}>{r.clubs.map((s) => { const c = clubByShort(s); return <ClubMark key={s} short={s} hue={c.hue} size={26} />; })}</div> },
    { h: "Athletes", w: "70px", align: "right", r: (r) => <Num muted={!r.athletes}>{r.athletes}</Num> },
    { h: "Permissions", w: "170px", r: (r) => <PermPills perms={r.perms} /> },
    { h: "Status", w: "100px", r: (r) => <StatusChip s={r.s} /> },
    { h: "Last active", w: "90px", r: (r) => <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.last}</span> },
    { h: "", w: "30px", r: () => <IconBtn /> },
  ]} rows={AD_TRAINERS} dense />
);
const AdminTrainers = ({ modal = false }) => (
  <PMain>
    <PTopBar crumbs={["Admin", "Trainers"]} search="Search trainers" action="Invite trainer" />
    <PBody>
      <PageHead title="Trainers" sub="342 trainers across 128 clubs · 1 credential in review · 1 suspended" />
      <Toolbar
        left={<Segmented items={[{ l: "All", n: 342 }, { l: "Active", n: 336 }, { l: "Invited", n: 4 }, { l: "In review", n: 1 }, { l: "Suspended", n: 1 }]} active="All" />}
        right={<React.Fragment><Btn icon="flag">Club: All</Btn><Btn icon="shieldCheck">Can verify</Btn><Btn icon="download">Export</Btn></React.Fragment>}
      />
      <AdminTrainersTable />
    </PBody>
    {modal && (
      <Modal title="Invite trainer" sub="They'll get an email to create their trainer account." width={580}
        footer={<React.Fragment><Btn>Cancel</Btn><Btn variant="primary" icon="arrowUpRight">Send invite</Btn></React.Fragment>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Full name"><Input value="Jordan Miles" /></Field>
          <Field label="Email"><Input value="jmiles@uclatc.org" /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Club"><Select value="UCLA Track Club" lead={<ClubMark short="UC" hue={240} size={22} />} /></Field>
          <Field label="Role"><Select value="Sprints coach" /></Field>
        </div>
        <Field label="Permissions" hint="Verify lets the trainer confirm athlete results and achievements on behalf of the club.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: 12, border: "1px solid var(--line)", borderRadius: 10 }}>
            <Check on label="View" sub="Roster & metrics" />
            <Check on label="Log" sub="Sessions & tests" />
            <Check label="Verify" sub="Results & awards" />
          </div>
        </Field>
        <Check on label="Require credential upload" sub="Account stays in review until an admin approves the certificate." />
      </Modal>
    )}
  </PMain>
);

Object.assign(window, { AD_NAV, AdminOverview, AdminClubs, AdminTrainers });
