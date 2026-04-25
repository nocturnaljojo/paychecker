// PayChecker Admin — primitives + screens

const { useState: useSt } = React;

// ---------- Icons (reuse Lucide subset) ----------
const AIcon = ({ name, size = 20, strokeWidth = 1.5, color = "currentColor", ...rest }) => {
  const p = {
    dashboard: <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8 12 3 7 8"/><path d="M12 3v12"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></>,
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    alert: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    chevronL: <path d="m15 18-6-6 6-6"/>,
    chevronD: <path d="m6 9 6 6 6-6"/>,
    help: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></>,
    history: <><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></>,
    filter: <path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></>,
    clipboard: <><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></>,
    list: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>,
    x: <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{p[name]}</svg>;
};

// ---------- Pill (reuse pattern) ----------
const APill = ({ tone = "grey", children }) => {
  const t = {
    amber: { bg: "#FBF1DB", fg: "#7A5A1E", dot: "#E8B04B" },
    sage:  { bg: "#E4EDE6", fg: "#385944", dot: "#5C8F6B" },
    coral: { bg: "#F5E1DE", fg: "#7A3B33", dot: "#C97064" },
    grey:  { bg: "#EFECE3", fg: "#4B5262", dot: "#6B7280" },
  }[tone];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: t.bg, color: t.fg, font: "500 12px 'IBM Plex Sans'" }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot }} aria-hidden="true"/>{children}</span>;
};

// ---------- Money ----------
const AMoney = ({ amount, size = 14, tone = "text", weight = 500 }) => {
  const c = { text: "#1A1D24", amber: "#7A5A1E", sage: "#385944", muted: "#6B7280" }[tone];
  const f = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
  return <span style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", fontSize: size, fontWeight: weight, color: c }}>{f}</span>;
};

// ---------- Sidebar ----------
const Sidebar = ({ active, onChange }) => {
  const items = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "workers",   icon: "users",     label: "Workers" },
    { id: "flags",     icon: "flag",      label: "Flags" },
    { id: "uploads",   icon: "upload",    label: "Uploads" },
    { id: "rules",     icon: "book",      label: "Rules" },
    { id: "audit",     icon: "shield",    label: "Audit log" },
    { id: "settings",  icon: "settings",  label: "Settings" },
  ];
  return (
    <aside style={{ width: 240, background: "#FAF7F2", borderRight: "1px solid #EEEAE0", display: "flex", flexDirection: "column", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 24px" }}>
        <img src="../../assets/paychecker-appicon.svg" alt="" width="28" height="28"/>
        <div>
          <div style={{ font: "600 15px 'IBM Plex Sans'", color: "#1A1D24" }}>PayChecker</div>
          <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280" }}>Operator console</div>
        </div>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map(it => (
          <button key={it.id} onClick={() => onChange(it.id)}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
              background: active === it.id ? "#EFECE3" : "transparent",
              color: active === it.id ? "#1F3A5F" : "#1A1D24",
              border: 0, borderRadius: 10, cursor: "pointer",
              font: `${active === it.id ? 500 : 400} 14px 'IBM Plex Sans'`, textAlign: "left",
            }}>
            <AIcon name={it.icon} size={20}/>{it.label}
          </button>
        ))}
      </nav>
      <div style={{ marginTop: "auto", padding: "12px 8px", borderTop: "1px solid #EEEAE0", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1F3A5F", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: "500 13px 'IBM Plex Sans'" }}>RK</div>
        <div>
          <div style={{ font: "500 13px 'IBM Plex Sans'", color: "#1A1D24" }}>Rani Kaur</div>
          <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280" }}>Support · NSW</div>
        </div>
      </div>
    </aside>
  );
};

// ---------- Topbar ----------
const ATopBar = ({ title, subtitle }) => (
  <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid #EEEAE0", background: "#FAF7F2" }}>
    <div>
      <h1 style={{ font: "600 20px 'IBM Plex Sans'", color: "#1A1D24", margin: 0 }}>{title}</h1>
      {subtitle && <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>{subtitle}</div>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E5E1D8", borderRadius: 10, padding: "8px 12px", width: 280 }}>
        <AIcon name="search" size={18} color="#6B7280"/>
        <input placeholder="Search workers, flags, uploads" style={{ border: 0, outline: "none", background: "transparent", flex: 1, font: "400 14px 'IBM Plex Sans'", color: "#1A1D24" }}/>
      </div>
      <button aria-label="Notifications" style={{ width: 40, height: 40, borderRadius: 10, background: "#fff", border: "1px solid #E5E1D8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AIcon name="bell" size={18} color="#1A1D24"/>
      </button>
    </div>
  </header>
);

// ---------- KPI card ----------
const KPI = ({ label, value, delta, tone }) => (
  <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ font: "500 12px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>{label}</div>
    <div style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", fontSize: 28, fontWeight: 500, color: "#1A1D24", letterSpacing: "-0.01em" }}>{value}</div>
    {delta && <APill tone={tone}>{delta}</APill>}
  </div>
);

// ---------- Flags table ----------
const FlagsTable = () => {
  const rows = [
    { w: "Mia T.", id: "W-10421", kind: "Sunday penalty rate", diff: 43.55, tone: "amber", status: "Reviewing" },
    { w: "Apete V.", id: "W-10298", kind: "Public holiday loading", diff: 128.40, tone: "amber", status: "New" },
    { w: "Josh L.", id: "W-10112", kind: "Ordinary hours", diff: 12.00, tone: "grey", status: "Low priority" },
    { w: "Sunita R.", id: "W-10078", kind: "Overtime threshold", diff: 87.20, tone: "amber", status: "Reviewing" },
    { w: "Danny P.", id: "W-10054", kind: "Classification check", diff: null, tone: "grey", status: "Needs input" },
  ];
  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 140px 140px", padding: "14px 24px", borderBottom: "1px solid #F0ECE2", font: "500 12px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>
        <div>Worker</div><div>ID</div><div>Flag type</div><div>Difference</div><div>Status</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 140px 140px", padding: "16px 24px", borderBottom: i < rows.length - 1 ? "1px solid #F0ECE2" : 0, alignItems: "center" }}>
          <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{r.w}</div>
          <div style={{ font: "400 14px 'IBM Plex Mono'", color: "#6B7280" }}>{r.id}</div>
          <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{r.kind}</div>
          <div>{r.diff != null ? <AMoney amount={r.diff} size={14} tone={r.tone === "amber" ? "amber" : "muted"}/> : <span style={{ font: "400 14px 'IBM Plex Mono'", color: "#6B7280" }}>—</span>}</div>
          <div><APill tone={r.tone}>{r.status}</APill></div>
        </div>
      ))}
    </div>
  );
};

// ---------- Dashboard ----------
const DashboardScreen = () => (
  <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24, background: "#FAF7F2", minHeight: "100%" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      <KPI label="Active workers" value="2,847" delta="+42 this week" tone="sage"/>
      <KPI label="Open flags" value="134" delta="18 high priority" tone="amber"/>
      <KPI label="Checked this week" value="8,921" delta="+6.2%" tone="sage"/>
      <KPI label="Total difference surfaced" value="$24,318" delta="across 184 weeks" tone="grey"/>
    </div>

    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h2 style={{ font: "600 18px 'IBM Plex Sans'", color: "#1A1D24", margin: 0 }}>Recent flags</h2>
          <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>Calculated differences, surfaced to the worker. Operator-visible only.</div>
        </div>
        <button style={{ background: "transparent", border: "1px solid #1F3A5F", color: "#1F3A5F", borderRadius: 10, padding: "8px 16px", font: "500 13px 'IBM Plex Sans'", cursor: "pointer" }}>Export CSV</button>
      </div>
      <FlagsTable/>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: 24 }}>
        <div style={{ font: "600 15px 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 14 }}>Data health</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <HealthRow label="Payslip OCR success" pct={94} tone="sage"/>
          <HealthRow label="Shift match rate" pct={88} tone="sage"/>
          <HealthRow label="Classification confidence" pct={72} tone="amber"/>
          <HealthRow label="Award mapping coverage" pct={61} tone="amber"/>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: 24 }}>
        <div style={{ font: "600 15px 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 14 }}>Cohort breakdown</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CohortRow label="PALM scheme · free tier" n={1842} share={0.65}/>
          <CohortRow label="Hospitality · paid" n={823} share={0.29}/>
          <CohortRow label="Other casual · paid" n={182} share={0.06}/>
        </div>
      </div>
    </div>
  </div>
);

const HealthRow = ({ label, pct, tone }) => {
  const col = { sage: "#5C8F6B", amber: "#E8B04B", coral: "#C97064" }[tone];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ font: "400 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{label}</span>
        <span style={{ font: "500 14px 'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", color: "#1A1D24" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "#F0ECE2", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: col }}/>
      </div>
    </div>
  );
};

const CohortRow = ({ label, n, share }) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ font: "400 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{label}</span>
      <span style={{ font: "500 14px 'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", color: "#1A1D24" }}>{n.toLocaleString()}</span>
    </div>
    <div style={{ height: 6, background: "#F0ECE2", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${share * 100}%`, background: "#1F3A5F" }}/>
    </div>
  </div>
);

// ---------- Workers (list) ----------
const WorkersScreen = ({ onOpenWorker }) => {
  const workers = [
    { id: "W-10421", name: "Mia Tavita", cohort: "Hospitality", state: "VIC", flags: 2, last: "2h ago", tone: "amber" },
    { id: "W-10298", name: "Danny Paterson", cohort: "Retail", state: "NSW", flags: 1, last: "Yesterday", tone: "amber" },
    { id: "W-10112", name: "Sana Malouf", cohort: "Hospitality", state: "VIC", flags: 0, last: "3d ago", tone: "sage" },
    { id: "W-10078", name: "Elias Bremer", cohort: "Horticulture", state: "QLD", flags: 3, last: "5m ago", tone: "coral" },
    { id: "W-10054", name: "Priya Ranasinghe", cohort: "Clerks", state: "VIC", flags: 0, last: "1w ago", tone: "sage" },
    { id: "W-10031", name: "Marco Keogh", cohort: "Construction", state: "NSW", flags: 1, last: "Yesterday", tone: "amber" },
  ];
  return (
    <div style={{ padding: 32, background: "#FAF7F2", minHeight: "100%" }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "110px 1.4fr 1fr 100px 100px 120px 24px", padding: "12px 20px", font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", borderBottom: "1px solid #F0ECE2" }}>
          <div>ID</div><div>Name</div><div>Cohort</div><div>State</div><div>Flags</div><div>Last active</div><div/>
        </div>
        {workers.map((w, i) => (
          <div key={w.id} onClick={() => onOpenWorker && onOpenWorker(w.id)}
            style={{ display: "grid", gridTemplateColumns: "110px 1.4fr 1fr 100px 100px 120px 24px", padding: "14px 20px", borderBottom: i < workers.length - 1 ? "1px solid #F0ECE2" : 0, alignItems: "center", cursor: "pointer" }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: "#1A1D24" }}>{w.id}</div>
            <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{w.name}</div>
            <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280" }}>{w.cohort}</div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: "#1A1D24" }}>{w.state}</div>
            <div>{w.flags > 0 ? <APill tone={w.tone}>{w.flags} open</APill> : <span style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280" }}>—</span>}</div>
            <div style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280" }}>{w.last}</div>
            <AIcon name="chevron" size={14} color="#6B7280"/>
          </div>
        ))}
      </div>
    </div>
  );
};

Object.assign(window, { AIcon, APill, AMoney, Sidebar, ATopBar, KPI, FlagsTable, DashboardScreen, WorkersScreen });
