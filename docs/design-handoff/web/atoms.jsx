/* global React */
// Reusable atoms: Avatar, Tag, Chip, Card, SectionHeader, StatusDot, ProgressRing, Stripes

// --- Avatar: oklch hued circle with monogram + faint diagonal jersey stripe ---
const Avatar = ({ name = "AB", hue = 220, size = 36, verified = false, ring = false, style }) => {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const bg = `linear-gradient(135deg, oklch(0.72 0.10 ${hue}), oklch(0.52 0.14 ${hue + 22}))`;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: bg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.36,
        letterSpacing: -0.3,
        position: "relative",
        flexShrink: 0,
        boxShadow: ring
          ? "0 0 0 2px #fff, 0 0 0 3.5px #1A6BFF"
          : "inset 0 0 0 1px rgba(255,255,255,0.18)",
        ...style,
      }}
    >
      {/* jersey stripe */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          background: `repeating-linear-gradient(115deg, transparent 0 ${size * 0.18}px, rgba(255,255,255,0.10) ${size * 0.18}px ${size * 0.22}px)`,
          pointerEvents: "none",
        }}
      />
      <span style={{ position: "relative" }}>{initials}</span>
      {verified && (
        <span
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: size * 0.36,
            height: size * 0.36,
            borderRadius: 999,
            background: "#1A6BFF",
            border: "2px solid #fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.check size={size * 0.2} color="#fff" strokeWidth={3.5} />
        </span>
      )}
    </div>
  );
};

// --- Chip (status, generic) ---
const Chip = ({ tone = "neutral", icon, children, style }) => {
  const tones = {
    verified: { bg: "var(--verified-tint)", color: "var(--verified)", bd: "rgba(22,163,74,0.18)" },
    pending:  { bg: "var(--pending-tint)",  color: "var(--pending)",  bd: "rgba(181,101,29,0.18)" },
    rejected: { bg: "var(--rejected-tint)", color: "var(--rejected)", bd: "rgba(220,38,38,0.18)" },
    blue:     { bg: "var(--blue-tint)",     color: "var(--blue)",     bd: "var(--blue-line)" },
    neutral:  { bg: "#F1F4F9",              color: "var(--text)",     bd: "var(--line)" },
    ink:      { bg: "rgba(255,255,255,0.08)", color: "#fff",          bd: "rgba(255,255,255,0.14)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px 3px 8px",
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.bd}`,
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        lineHeight: 1,
        height: 20,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  );
};

// --- Tag (square pill, lower-emphasis, can be tonal) ---
const Tag = ({ tone = "neutral", children, style }) => {
  const tones = {
    neutral: { bg: "#F1F4F9", color: "var(--text)" },
    blue:    { bg: "var(--blue-tint)", color: "var(--blue)" },
    ink:     { bg: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.85)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        background: t.bg,
        color: t.color,
        borderRadius: 6,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.2,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

// --- Card ---
const Card = ({ pad = 16, style, children, hoverable = false, ...rest }) => (
  <div
    style={{
      background: "var(--paper)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-sm)",
      padding: pad,
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
);

// --- Section header: eyebrow + title + optional right slot ---
const SectionHeader = ({ eyebrow, title, right, style }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12, ...style }}>
    <div>
      {eyebrow && (
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: 1.6,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {eyebrow}
        </div>
      )}
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2, color: "var(--text)" }}>
        {title}
      </div>
    </div>
    {right}
  </div>
);

// --- StatusDot small dot ---
const Dot = ({ color = "var(--blue)", size = 8, style }) => (
  <span
    style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: 999,
      background: color,
      ...style,
    }}
  />
);

// --- Circular progress ring (SVG) ---
const ProgressRing = ({ size = 96, stroke = 9, value = 65, color = "var(--blue)", track = "#EEF1F5", center }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {center}
      </div>
    </div>
  );
};

// --- Inline sparkline polyline ---
const Sparkline = ({ data = [], width = 92, height = 28, color = "var(--blue)" }) => {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = Math.max(max - min, 1);
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  // build a closed area path for tint
  const area = `0,${height} ${points.join(" ")} ${width},${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={area} fill={color} fillOpacity="0.08" stroke="none" />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// --- Logo mark: blue shield with white "AP" wordmark accent ---
const ApMark = ({ size = 24, onDark = false }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="apg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3B85FF" />
        <stop offset="1" stopColor="#1A6BFF" />
      </linearGradient>
    </defs>
    <path
      d="M16 2 L28 6 V14 C28 22 22.5 27 16 30 C9.5 27 4 22 4 14 V6 Z"
      fill="url(#apg)"
      stroke={onDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.04)"}
      strokeWidth="1"
    />
    {/* inner mark: stylized A + P */}
    <path
      d="M11.5 21 L14.5 11 L17.5 21 M12.5 18 H16.5"
      stroke="#fff"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M19 11 V21 M19 11 H21.5 A2 2 0 0 1 21.5 15 H19"
      stroke="#fff"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// --- Diagonal stripe placeholder (for missing imagery) ---
const Stripes = ({ width = "100%", height = 80, style }) => (
  <div
    style={{
      width,
      height,
      background:
        "repeating-linear-gradient(135deg, #EEF1F6 0 6px, #F6F8FB 6px 12px)",
      border: "1px solid var(--line)",
      borderRadius: "var(--radius-md)",
      ...style,
    }}
  />
);

// --- Button ---
const Btn = ({ variant = "ghost", icon, children, style, sm = false }) => {
  const v = {
    primary: { background: "var(--blue)", color: "#fff", border: "1px solid var(--blue)", boxShadow: "var(--shadow-cta)" },
    ghost:   { background: "var(--paper)", color: "var(--text)", border: "1px solid var(--line)" },
    danger:  { background: "var(--paper)", color: "var(--rejected)", border: "1px solid var(--line)" },
    link:    { background: "transparent", color: "var(--blue)", border: "1px solid transparent" },
  }[variant];
  return (
    <button style={{ ...v, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: sm ? "5px 11px" : "7px 13px", borderRadius: sm ? 8 : 10, fontSize: sm ? 11.5 : 12.5, fontWeight: 600, whiteSpace: "nowrap", ...style }}>
      {icon && React.createElement(I[icon], { size: sm ? 12 : 13, strokeWidth: 2 })}
      {children}
    </button>
  );
};

// --- Page header (eyebrow + h1 + sub + right slot) ---
const PageHead = ({ eyebrow, title, sub, right }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
    <div>
      {eyebrow && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", color: "var(--muted)" }}>{eyebrow}</div>}
      <h1 style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 700, letterSpacing: -0.6, color: "var(--text)" }}>{title}</h1>
      {sub && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    </div>
    {right && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</div>}
  </div>
);

// --- Segmented control ---
const Segmented = ({ items, active }) => (
  <div style={{ display: "inline-flex", border: "1px solid var(--line)", background: "var(--paper)", borderRadius: 10, padding: 2, gap: 2 }}>
    {items.map((it) => {
      const label = typeof it === "string" ? it : it.l;
      const on = label === active;
      return (
        <button key={label} style={{ border: "none", borderRadius: 8, padding: "5px 11px", fontSize: 12, fontWeight: 600, background: on ? "var(--text)" : "transparent", color: on ? "#fff" : "var(--text)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {label}
          {it.n != null && <span style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 999, background: on ? "rgba(255,255,255,0.18)" : "var(--canvas)", color: on ? "#fff" : "var(--muted)" }}>{it.n}</span>}
        </button>
      );
    })}
  </div>
);

Object.assign(window, { Avatar, Chip, Tag, Card, SectionHeader, Dot, ProgressRing, Sparkline, ApMark, Stripes, Btn, PageHead, Segmented });
