// PayChecker PWA — shared primitives. Exports to window so other JSX files can use them.

const { useState, useEffect, useMemo, useRef } = React;

// ---------- Icons (Lucide, inlined) ----------
const Icon = ({ name, size = 24, strokeWidth = 1.5, color = "currentColor", ...rest }) => {
  const paths = {
    home:       <><path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/></>,
    upload:     <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8 12 3 7 8"/><path d="M12 3v12"/></>,
    check:      <path d="m20 6-11 11-5-5"/>,
    alert:      <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
    info:       <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>,
    chevron:    <path d="m9 18 6-6-6-6"/>,
    chevronL:   <path d="m15 18-6-6 6-6"/>,
    x:          <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
    calendar:   <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></>,
    user:       <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    wallet:     <><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></>,
    help:       <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></>,
    lock:       <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    plus:       <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    file:       <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>,
    camera:     <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/></>,
    download:   <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></>,
    keyboard:   <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01"/><path d="M10 10h.01"/><path d="M14 10h.01"/><path d="M18 10h.01"/><path d="M6 14h.01"/><path d="M18 14h.01"/><path d="M9 14h6"/></>,
    mail:       <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></>,
    pencil:     <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/></>,
    trash:      <><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></>,
    eye:        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></>,
    sparkle:    <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" {...rest}>{paths[name]}</svg>
  );
};

// ---------- Pill ----------
const Pill = ({ tone = "grey", children }) => {
  const tones = {
    amber: { bg: "#FBF1DB", fg: "#7A5A1E", dot: "#E8B04B" },
    sage:  { bg: "#E4EDE6", fg: "#385944", dot: "#5C8F6B" },
    coral: { bg: "#F5E1DE", fg: "#7A3B33", dot: "#C97064" },
    grey:  { bg: "#EFECE3", fg: "#4B5262", dot: "#6B7280" },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 11px", borderRadius: 9999,
      background: t.bg, color: t.fg,
      font: "500 13px 'IBM Plex Sans'",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.dot }} aria-hidden="true"/>
      {children}
    </span>
  );
};

// ---------- Button ----------
const Button = ({ variant = "primary", children, icon, block, onClick, disabled, ariaLabel }) => {
  const styles = {
    primary:   { bg: "#1F3A5F", fg: "#fff", border: "none" },
    secondary: { bg: "#fff",    fg: "#1F3A5F", border: "1px solid #1F3A5F" },
    tertiary:  { bg: "transparent", fg: "#1F3A5F", border: "none" },
  }[variant];
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)}
      style={{
        height: 48, padding: "0 20px", borderRadius: 12,
        background: pressed && variant === "primary" ? "#182E4B" : styles.bg,
        color: styles.fg, border: styles.border,
        font: "500 16px 'IBM Plex Sans'", cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: block ? "100%" : "auto",
        opacity: disabled ? 0.4 : 1,
        transition: "background 150ms cubic-bezier(0.2,0.6,0.2,1)",
      }}>
      {icon && <Icon name={icon} size={20}/>}
      {children}
    </button>
  );
};

// ---------- Money (always Plex Mono + tabular) ----------
const Money = ({ amount, size = 16, tone = "text", weight = 500 }) => {
  const colors = { text: "#1A1D24", amber: "#7A5A1E", sage: "#385944", muted: "#6B7280" };
  const formatted = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono'",
      fontVariantNumeric: "tabular-nums",
      fontSize: size, fontWeight: weight,
      color: colors[tone], letterSpacing: "-0.005em",
    }}>{formatted}</span>
  );
};

// ---------- Card ----------
const Card = ({ children, style, ...rest }) => (
  <div {...rest} style={{
    background: "#FFFFFF", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    padding: 20, ...style
  }}>{children}</div>
);

// ---------- Top bar (PWA) ----------
const TopBar = ({ title, left, right }) => (
  <div style={{
    height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 8px", background: "#FAF7F2",
    borderBottom: "1px solid #EEEAE0",
    position: "sticky", top: 0, zIndex: 5,
  }}>
    <div style={{ width: 48, display: "flex", justifyContent: "center" }}>
      {left || <span/>}
    </div>
    <div style={{ font: "600 17px 'IBM Plex Sans'", color: "#1A1D24" }}>{title}</div>
    <div style={{ width: 48, display: "flex", justifyContent: "center" }}>
      {right || <span/>}
    </div>
  </div>
);

// ---------- Icon button (48x48, a11y) ----------
const IconButton = ({ icon, onClick, ariaLabel }) => (
  <button onClick={onClick} aria-label={ariaLabel}
    style={{
      width: 48, height: 48, display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "transparent", border: 0, cursor: "pointer", color: "#1A1D24", borderRadius: 12,
    }}>
    <Icon name={icon} size={24}/>
  </button>
);

// ---------- Tab bar (bottom nav) ----------
const TabBar = ({ active, onChange }) => {
  const tabs = [
    { id: "home",     icon: "home",     label: "Home" },
    { id: "shifts",   icon: "calendar", label: "Shifts" },
    { id: "payslips", icon: "wallet",   label: "Payslips" },
    { id: "yourdata", icon: "file",     label: "Your data" },
  ];
  return (
    <nav style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      borderTop: "1px solid #EEEAE0", background: "#FAF7F2",
      position: "sticky", bottom: 0,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          aria-current={active === t.id ? "page" : undefined}
          style={{
            background: "transparent", border: 0, padding: "10px 0 14px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            color: active === t.id ? "#1F3A5F" : "#6B7280",
            cursor: "pointer", minHeight: 56,
          }}>
          <Icon name={t.icon} size={24} strokeWidth={active === t.id ? 2 : 1.5}/>
          <span style={{ font: "500 12px 'IBM Plex Sans'" }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
};

Object.assign(window, { Icon, Pill, Button, Money, Card, TopBar, IconButton, TabBar });
