/* global React, I, ApMark, Avatar, Chip, Btn */
// Shared shell for Admin + Trainer portals: sidebar, top bar, table, KPI strip, form fields, modal

const PSidebar = ({ role, roleTone = "blue", sections, active, user, switcher }) => (
  <aside style={{ width: 252, flexShrink: 0, background: "linear-gradient(180deg, var(--ink) 0%, var(--ink-2) 60%, #0A0F1B 100%)", color: "#fff", display: "flex", flexDirection: "column", borderRight: "1px solid #050912" }}>
    <div style={{ padding: "18px 18px 16px", display: "flex", alignItems: "center", gap: 11, borderBottom: "1px solid var(--ink-line)" }}>
      <ApMark size={28} onDark />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, flex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: -0.2 }}>Athlete Passport</span>
        <span style={{ fontSize: 10, color: roleTone === "amber" ? "#F5C07A" : "#7FB0FF", letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 700, marginTop: 3 }}>{role}</span>
      </div>
    </div>
    {switcher && (
      <div style={{ margin: "14px 12px 0", padding: "9px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid var(--ink-line-2)", display: "flex", alignItems: "center", gap: 10 }}>
        <ClubMark short={switcher.short} hue={switcher.hue} size={30} />
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
          <div style={{ fontSize: 10, color: "var(--on-ink-3)", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>Club</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{switcher.name}</div>
        </div>
        <I.chevronDown size={14} color="var(--on-ink-2)" />
      </div>
    )}
    {sections.map((s, si) => (
      <nav key={s.title} style={{ padding: si ? "12px 12px 0" : "14px 12px 0", margin: si ? "6px 0 0" : 0, borderTop: si ? "1px solid var(--ink-line)" : "none", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ padding: "6px 12px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--on-ink-3)" }}>{s.title}</div>
        {s.items.map((it) => <PNavItem key={it.key} item={it} active={active === it.key} />)}
      </nav>
    ))}
    <div style={{ marginTop: "auto", padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid var(--ink-line)" }}>
        <Avatar name={user.name} hue={user.hue} size={34} verified={user.verified} />
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "var(--on-ink-2)", marginTop: 1 }}>{user.sub}</div>
        </div>
        <I.more size={16} color="var(--on-ink-2)" />
      </div>
    </div>
  </aside>
);

const PNavItem = ({ item, active }) => {
  const color = active ? "#fff" : "rgba(255,255,255,0.78)";
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "9px 12px 9px 14px", borderRadius: 10, background: active ? "rgba(26,107,255,0.16)" : "transparent", border: `1px solid ${active ? "rgba(26,107,255,0.32)" : "transparent"}`, color, fontSize: 13.5, fontWeight: active ? 600 : 500, cursor: "pointer" }}>
      {active && <span style={{ position: "absolute", left: -12, top: "50%", transform: "translateY(-50%)", width: 3, height: 22, background: "var(--blue)", borderRadius: "0 3px 3px 0", boxShadow: "0 0 12px rgba(26,107,255,0.5)" }}></span>}
      {React.createElement(I[item.icon], { size: 17, color, strokeWidth: active ? 2 : 1.75 })}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge ? <span style={{ minWidth: 20, height: 18, padding: "0 6px", borderRadius: 999, background: item.badgeTone === "amber" ? "#B5651D" : "var(--blue)", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{item.badge}</span> : null}
    </div>
  );
};

const PTopBar = ({ crumbs, action, actionIcon = "plus", search = "Search" }) => (
  <header style={{ height: 60, flexShrink: 0, background: "var(--paper)", borderBottom: "1px solid var(--line)", padding: "0 28px", display: "flex", alignItems: "center", gap: 16 }}>
    <nav style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <I.chevronRight size={12} color="var(--subtle)" />}
          <span style={{ color: i === crumbs.length - 1 ? "var(--text)" : "var(--muted)", fontWeight: i === crumbs.length - 1 ? 600 : 500 }}>{c}</span>
        </React.Fragment>
      ))}
    </nav>
    <div style={{ flex: 1 }}></div>
    <div style={{ width: 280, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--paper-2)", color: "var(--subtle)", fontSize: 12.5 }}>
      <I.search size={14} /><span style={{ flex: 1 }}>{search}</span>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, border: "1px solid var(--line)", borderRadius: 5, padding: "1px 5px", color: "var(--muted)" }}>⌘K</span>
    </div>
    <div style={{ position: "relative" }}>
      <button aria-label="Notifications" style={{ width: 36, height: 36, borderRadius: 10, background: "var(--paper)", border: "1px solid var(--line)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--text)" }}><I.bell size={16} /></button>
      <span style={{ position: "absolute", top: 5, right: 5, width: 8, height: 8, borderRadius: 999, background: "var(--blue)", boxShadow: "0 0 0 2px var(--paper)" }}></span>
    </div>
    {action && <Btn variant="primary" icon={actionIcon}>{action}</Btn>}
  </header>
);

const PMain = ({ children }) => <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>{children}</main>;
const PBody = ({ children, style }) => <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "22px 28px 24px", display: "flex", flexDirection: "column", gap: 18, ...style }}>{children}</div>;

const ClubMark = ({ short, hue = 220, size = 32 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, flexShrink: 0, background: `oklch(0.94 0.04 ${hue})`, color: `oklch(0.42 0.14 ${hue})`, border: `1px solid oklch(0.86 0.06 ${hue})`, display: "grid", placeItems: "center", fontSize: size * 0.34, fontWeight: 800, letterSpacing: -0.3 }}>{short}</div>
);

const STATUS = {
  active:    { tone: "verified", l: "Active" },
  verified:  { tone: "verified", l: "Verified" },
  accepted:  { tone: "verified", l: "Accepted" },
  pending:   { tone: "pending",  l: "Pending" },
  review:    { tone: "pending",  l: "In review" },
  invited:   { tone: "blue",     l: "Invited" },
  sent:      { tone: "blue",     l: "Sent" },
  opened:    { tone: "blue",     l: "Opened" },
  suspended: { tone: "rejected", l: "Suspended" },
  rejected:  { tone: "rejected", l: "Rejected" },
  expired:   { tone: "neutral",  l: "Expired" },
};
const StatusChip = ({ s }) => <Chip tone={STATUS[s].tone}>{STATUS[s].l}</Chip>;

const KpiStrip = ({ items }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "var(--shadow-sm)" }}>
    {items.map((k, i) => (
      <div key={k.l} style={{ padding: "14px 18px", borderLeft: i ? "1px solid var(--line)" : "none" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--muted)" }}>{k.l}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, fontVariantNumeric: "tabular-nums", color: k.c || "var(--text)" }}>{k.v}</span>
          {k.d && <span style={{ fontSize: 12, color: k.dTone === "warn" ? "var(--pending)" : "var(--verified)", fontWeight: 600 }}>{k.d}</span>}
        </div>
      </div>
    ))}
  </div>
);

// cols: [{ h, w, align, r: (row) => node }]
const PTable = ({ cols, rows, selected, dense = false }) => {
  const tpl = cols.map((c) => c.w || "minmax(0,1fr)").join(" ");
  const py = dense ? 9 : 12;
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: tpl, gap: 16, padding: "10px 18px", background: "var(--paper-2)", borderBottom: "1px solid var(--line)" }}>
        {cols.map((c) => <div key={c.h} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--muted)", textAlign: c.align || "left" }}>{c.h}</div>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: tpl, gap: 16, padding: `${py}px 18px`, alignItems: "center", borderTop: i ? "1px solid var(--line-2)" : "none", background: selected === i ? "var(--blue-tint)" : "transparent", boxShadow: selected === i ? "inset 3px 0 0 var(--blue)" : "none" }}>
          {cols.map((c) => <div key={c.h} style={{ minWidth: 0, fontSize: 13, textAlign: c.align || "left", display: "flex", justifyContent: c.align === "right" ? "flex-end" : "flex-start", alignItems: "center", gap: 10 }}>{c.r(r)}</div>)}
        </div>
      ))}
    </div>
  );
};

const NameCell = ({ title, sub, lead }) => (
  <React.Fragment>
    {lead}
    <div style={{ minWidth: 0, lineHeight: 1.25 }}>
      <div style={{ fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
    </div>
  </React.Fragment>
);

const Num = ({ children, muted }) => <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: muted ? "var(--muted)" : "var(--text)" }}>{children}</span>;
const Mono = ({ children }) => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)" }}>{children}</span>;
const IconBtn = ({ icon = "more" }) => <button style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>{React.createElement(I[icon], { size: 14 })}</button>;

const Toolbar = ({ left, right }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    {left}<div style={{ flex: 1 }}></div>{right}
  </div>
);

const Field = ({ label, hint, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{label}</span>
    {children}
    {hint && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{hint}</span>}
  </label>
);
const Input = ({ value, placeholder, icon, suffix, mono }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 38, padding: "0 12px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--paper)", fontSize: 13, color: value ? "var(--text)" : "var(--subtle)", fontFamily: mono ? "var(--mono)" : "inherit" }}>
    {icon && React.createElement(I[icon], { size: 14, color: "var(--subtle)" })}
    <span style={{ flex: 1 }}>{value || placeholder}</span>
    {suffix && <span style={{ fontSize: 12, color: "var(--muted)" }}>{suffix}</span>}
  </div>
);
const Select = ({ value, lead }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--paper)", fontSize: 13 }}>
    {lead}<span style={{ flex: 1 }}>{value}</span><I.chevronDown size={14} color="var(--muted)" />
  </div>
);
const Check = ({ on, label, sub }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
    <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1, background: on ? "var(--blue)" : "var(--paper)", border: `1px solid ${on ? "var(--blue)" : "var(--line)"}`, display: "grid", placeItems: "center" }}>{on && <I.check size={12} color="#fff" strokeWidth={3} />}</span>
    <div style={{ lineHeight: 1.3 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

const Modal = ({ title, sub, width = 560, children, footer }) => (
  <div style={{ position: "absolute", inset: 0, background: "rgba(11,18,32,0.42)", display: "grid", placeItems: "center", zIndex: 5 }}>
    <div style={{ width, background: "var(--paper)", borderRadius: 16, boxShadow: "0 24px 60px -12px rgba(11,18,32,0.35)", overflow: "hidden" }}>
      <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>{title}</div>
          {sub && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{sub}</div>}
        </div>
        <IconBtn icon="x" />
      </div>
      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
      <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line)", background: "var(--paper-2)", display: "flex", justifyContent: "flex-end", gap: 8 }}>{footer}</div>
    </div>
  </div>
);

const PermPills = ({ perms }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {["View", "Log", "Verify"].map((p) => {
      const on = perms.includes(p);
      return <span key={p} style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: on ? "var(--blue-tint)" : "transparent", color: on ? "var(--blue)" : "var(--subtle)", border: `1px solid ${on ? "var(--blue-line)" : "var(--line)"}`, textDecoration: on ? "none" : "line-through" }}>{p}</span>;
    })}
  </div>
);

const Panel = ({ title, right, children, pad = 0, style }) => (
  <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", minHeight: 0, ...style }}>
    <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{title}</div>{right}
    </div>
    <div style={{ padding: pad, flex: 1, minHeight: 0 }}>{children}</div>
  </div>
);

Object.assign(window, { PSidebar, PTopBar, PMain, PBody, ClubMark, StatusChip, KpiStrip, PTable, NameCell, Num, Mono, IconBtn, Toolbar, Field, Input, Select, Check, Modal, PermPills, Panel });
