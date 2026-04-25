// PayChecker Admin — Worker detail page
// Single pane of glass for supporting a worker. Tabs: Overview, Employment,
// Shifts, Payslips, Findings, Events, Support. "Impersonate view" opens a
// read-only mirror of what the worker sees.

const WorkerDetail = ({ onClose, onImpersonate }) => {
  const [tab, setTab] = React.useState('overview');
  const worker = {
    name: "Mia Tavita", id: "W-10421",
    email: "mia.t@example.com", phone: "+61 4•• ••• 421",
    cohort: "Hospitality · paid", joined: "14 Nov 2025",
    tier: "Paid · $4.99/mo", state: "VIC",
    flagsOpen: 2, weeksChecked: 18, lastActive: "2 hours ago",
  };
  const tabs = [
    ["overview", "Overview"], ["employment", "Employment"],
    ["shifts", "Shifts"], ["payslips", "Payslips"],
    ["findings", "Findings"], ["events", "Events"], ["support", "Support"],
  ];

  return (
    <div style={{ padding: "24px 32px 48px", background: "#FAF7F2", minHeight: "100%" }}>
      <button onClick={onClose} style={{ background: "transparent", border: 0, color: "#6B7280", font: "400 13px 'IBM Plex Sans'", padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
        <AIcon name="chevronL" size={14}/> Back to workers
      </button>

      {/* Header card */}
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: 24, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1F3A5F", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: "600 20px 'IBM Plex Sans'" }}>MT</div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ font: "600 20px 'IBM Plex Sans'", color: "#1A1D24" }}>{worker.name}</div>
            <span style={{ font: "400 13px 'IBM Plex Mono'", color: "#6B7280" }}>{worker.id}</span>
            <APill tone="amber">{worker.flagsOpen} open flags</APill>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 8, font: "400 13px 'IBM Plex Sans'", color: "#6B7280" }}>
            <span>{worker.cohort}</span><span>·</span>
            <span>{worker.tier}</span><span>·</span>
            <span>{worker.state}</span><span>·</span>
            <span>Joined {worker.joined}</span><span>·</span>
            <span>Active {worker.lastActive}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 10, padding: "10px 14px", font: "500 13px 'IBM Plex Sans'", color: "#1A1D24", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AIcon name="mail" size={16}/> Message
          </button>
          <button onClick={onImpersonate} style={{ background: "#1F3A5F", border: 0, borderRadius: 10, padding: "10px 14px", font: "500 13px 'IBM Plex Sans'", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AIcon name="eye" size={16}/> Impersonate view
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #E5E1D8", marginTop: 20 }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              padding: "12px 16px", background: "transparent", border: 0,
              borderBottom: tab === id ? "2px solid #1F3A5F" : "2px solid transparent",
              color: tab === id ? "#1F3A5F" : "#6B7280", cursor: "pointer",
              font: `${tab === id ? 500 : 400} 14px 'IBM Plex Sans'`, marginBottom: -1,
            }}>{label}</button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {tab === 'overview' && <OverviewTab worker={worker}/>}
        {tab === 'employment' && <EmploymentTab/>}
        {tab === 'shifts' && <ShiftsTab/>}
        {tab === 'payslips' && <PayslipsTab/>}
        {tab === 'findings' && <FindingsTab/>}
        {tab === 'events' && <EventsTab/>}
        {tab === 'support' && <SupportTab worker={worker}/>}
      </div>
    </div>
  );
};

const DCard = ({ title, action, children, padded = true }) => (
  <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
    {title && (
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #F0ECE2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ font: "600 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{title}</div>
        {action}
      </div>
    )}
    <div style={{ padding: padded ? 20 : 0 }}>{children}</div>
  </div>
);

const KV = ({ k, v }) => (
  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, padding: "10px 0", borderBottom: "1px solid #F0ECE2" }}>
    <div style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280" }}>{k}</div>
    <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{v}</div>
  </div>
);

const OverviewTab = ({ worker }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
    <DCard title="At a glance">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Stat label="Weeks checked" value="18"/>
        <Stat label="Flags · open" value="2" tone="amber"/>
        <Stat label="Flags · closed" value="6"/>
        <Stat label="Difference surfaced" value={<AMoney amount={428.60} size={20}/>}/>
      </div>
    </DCard>
    <DCard title="Latest finding">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>Sunday penalty rate · Week of 14 Mar</div>
          <div style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>Hospitality Award MA000009 · Level 2</div>
        </div>
        <AMoney amount={43.55} size={20} tone="amber"/>
      </div>
      <div style={{ marginTop: 16, padding: 14, background: "#FAF7F2", borderRadius: 10, font: "400 13px/1.5 'IBM Plex Sans'", color: "#1A1D24" }}>
        Sunday shifts pay 175% of the base rate under this award. Based on the rate and hours the worker entered.
      </div>
    </DCard>
    <DCard title="Upcoming checks">
      <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280" }}>
        Next payslip expected <span style={{ color: "#1A1D24" }}>Fri 21 Mar</span>. We'll compare it to 4 shifts on record.
      </div>
    </DCard>
    <DCard title="Support notes">
      <div style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280" }}>No open support threads.</div>
    </DCard>
  </div>
);

const Stat = ({ label, value, tone = "text" }) => (
  <div>
    <div style={{ font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>{label}</div>
    <div style={{ marginTop: 4, fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", fontSize: 22, fontWeight: 500, color: tone === 'amber' ? '#7A5A1E' : '#1A1D24' }}>{value}</div>
  </div>
);

const EmploymentTab = () => (
  <DCard title="Employment · employer 1 of 2">
    <KV k="Employer" v="The Daily Grind (trading name)"/>
    <KV k="ABN" v={<span className="num" style={{fontFamily:"'IBM Plex Mono'"}}>94 123 456 789</span>}/>
    <KV k="Award" v="Hospitality Industry (General) Award 2020 · MA000009"/>
    <KV k="Classification" v="Level 2 · Food & beverage attendant"/>
    <KV k="Employment type" v="Casual"/>
    <KV k="Base rate (worker-entered)" v={<AMoney amount={28.26} size={14}/>}/>
    <KV k="Classification confidence" v={<APill tone="amber">Medium — review</APill>}/>
  </DCard>
);

const ShiftsTab = () => {
  const shifts = [
    { d: "Sun 17 Mar", t: "17:30 – 23:45", h: 6.25, src: "Worker entry", conf: "high" },
    { d: "Fri 15 Mar", t: "18:00 – 23:00", h: 5.0,  src: "Payslip (parsed)", conf: "high" },
    { d: "Wed 13 Mar", t: "11:00 – 15:00", h: 4.0,  src: "Worker entry", conf: "high" },
    { d: "Sun 10 Mar", t: "17:30 – 00:00", h: 6.5,  src: "Worker entry", conf: "medium" },
    { d: "Fri 8 Mar",  t: "18:00 – 23:00", h: 5.0,  src: "Payslip (parsed)", conf: "high" },
  ];
  return (
    <DCard title="Shifts · last 14 days" padded={false}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 1fr 140px", padding: "12px 20px", font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", borderBottom: "1px solid #F0ECE2" }}>
        <div>Date</div><div>Time</div><div>Hours</div><div>Source</div><div>Confidence</div>
      </div>
      {shifts.map((s, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 1fr 140px", padding: "14px 20px", borderBottom: i < shifts.length - 1 ? "1px solid #F0ECE2" : 0, alignItems: "center", font: "400 14px 'IBM Plex Sans'", color: "#1A1D24" }}>
          <div>{s.d}</div>
          <div style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums" }}>{s.t}</div>
          <div style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums" }}>{s.h.toFixed(2)}</div>
          <div style={{ color: "#6B7280" }}>{s.src}</div>
          <div><APill tone={s.conf === 'high' ? 'sage' : 'amber'}>{s.conf === 'high' ? 'High' : 'Medium'}</APill></div>
        </div>
      ))}
    </DCard>
  );
};

const PayslipsTab = () => {
  const slips = [
    { d: "Fri 15 Mar", fn: "payslip_2026-03-15.pdf", net: 612.40, gross: 762.40, parsed: "OK" },
    { d: "Fri 8 Mar",  fn: "Screenshot_20260308.png", net: 478.00, gross: 595.00, parsed: "OK" },
    { d: "Fri 1 Mar",  fn: "payslip_march1.pdf",      net: 534.20, gross: 665.40, parsed: "Partial" },
  ];
  return (
    <DCard title="Payslips" action={<button style={btnGhost}>Download all</button>} padded={false}>
      {slips.map((s, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr 130px 130px 120px 40px", padding: "14px 20px", borderBottom: i < slips.length - 1 ? "1px solid #F0ECE2" : 0, alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#FAF7F2", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}><AIcon name="file" size={18}/></div>
          <div>
            <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{s.fn}</div>
            <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>Uploaded {s.d}</div>
          </div>
          <div><div style={labelM}>Gross</div><AMoney amount={s.gross} size={14}/></div>
          <div><div style={labelM}>Net</div><AMoney amount={s.net} size={14}/></div>
          <APill tone={s.parsed === 'OK' ? 'sage' : 'amber'}>{s.parsed === 'OK' ? 'Parsed' : 'Partial parse'}</APill>
          <button aria-label="Download" style={{ background: "transparent", border: 0, color: "#1A1D24", cursor: "pointer" }}><AIcon name="download" size={18}/></button>
        </div>
      ))}
    </DCard>
  );
};

const FindingsTab = () => {
  const rows = [
    { w: "Week of 14 Mar", k: "Sunday penalty rate", diff: 43.55, st: "Open", tone: "amber" },
    { w: "Week of 14 Mar", k: "Public holiday loading", diff: 128.40, st: "Open", tone: "amber" },
    { w: "Week of 29 Feb", k: "Overtime threshold", diff: 87.20, st: "Closed", tone: "grey" },
    { w: "Week of 22 Feb", k: "Classification check", diff: null, st: "Closed", tone: "grey" },
  ];
  return (
    <DCard title="Findings" padded={false}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 140px 120px", padding: "12px 20px", font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", borderBottom: "1px solid #F0ECE2" }}>
        <div>Week</div><div>Calculation</div><div>Difference</div><div>Status</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 140px 120px", padding: "14px 20px", borderBottom: i < rows.length - 1 ? "1px solid #F0ECE2" : 0, alignItems: "center", font: "400 14px 'IBM Plex Sans'", color: "#1A1D24" }}>
          <div>{r.w}</div>
          <div>{r.k}</div>
          <div>{r.diff != null ? <AMoney amount={r.diff} size={14} tone={r.tone === 'amber' ? 'amber' : 'muted'}/> : <span style={{ fontFamily: "'IBM Plex Mono'", color: "#6B7280" }}>—</span>}</div>
          <div><APill tone={r.tone}>{r.st}</APill></div>
        </div>
      ))}
    </DCard>
  );
};

const EventsTab = () => {
  const events = [
    { t: "2 hours ago", k: "Opened app" },
    { t: "2 hours ago", k: "Viewed week of 14 Mar" },
    { t: "Yesterday 18:04", k: "Uploaded payslip_2026-03-15.pdf" },
    { t: "Yesterday 18:04", k: "Parse succeeded · 12 line items" },
    { t: "3 days ago", k: "Added Sunday 10 Mar shift manually" },
    { t: "14 Nov 2025", k: "Created account · hospitality cohort" },
  ];
  return (
    <DCard title="Events · worker timeline">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {events.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 16, paddingBottom: 14, borderBottom: i < events.length - 1 ? "1px solid #F0ECE2" : 0 }}>
            <div style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280" }}>{e.t}</div>
            <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{e.k}</div>
          </div>
        ))}
      </div>
    </DCard>
  );
};

const SupportTab = ({ worker }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
    <DCard title="Contact">
      <KV k="Email" v={worker.email}/>
      <KV k="Phone" v={worker.phone}/>
      <KV k="Preferred language" v="English"/>
      <KV k="Timezone" v="Australia/Melbourne"/>
    </DCard>
    <DCard title="Support actions">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={btnRow}><AIcon name="mail" size={18}/> Send a message</button>
        <button style={btnRow}><AIcon name="phone" size={18}/> Request a callback</button>
        <button style={btnRow}><AIcon name="file" size={18}/> Export worker data</button>
        <button style={btnRow}><AIcon name="lock" size={18}/> Delete data on request</button>
      </div>
    </DCard>
  </div>
);

// ---------- Impersonate overlay ----------
const ImpersonateOverlay = ({ onClose }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,36,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{ width: 420, maxHeight: "90vh", background: "#FAF7F2", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#1F3A5F", color: "#fff", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", font: "500 13px 'IBM Plex Sans'" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AIcon name="eye" size={16}/> Viewing as Mia Tavita · read-only
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: 0, color: "#fff", cursor: "pointer" }}><AIcon name="x" size={18}/></button>
      </div>
      <div style={{ padding: 20, overflow: "auto" }}>
        <div style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280" }}>Kia ora, Mia</div>
        <div style={{ font: "600 22px 'IBM Plex Sans'", color: "#1A1D24", marginTop: 2 }}>Your pay</div>
        <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: 20, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>This week</span>
            <APill tone="amber">Needs attention</APill>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280" }}>Expected</span><AMoney amount={1247.60} size={16}/></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280" }}>Received</span><AMoney amount={1200.00} size={16}/></div>
            <div style={{ height: 1, background: "#F0ECE2", margin: "4px 0" }}/>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280" }}>Difference</span><AMoney amount={47.60} size={20} tone="amber" weight={600}/></div>
          </div>
        </div>
        <div style={{ marginTop: 14, padding: 12, background: "#FBF1DB", borderRadius: 10, font: "400 12px/1.5 'IBM Plex Sans'", color: "#7A5A1E", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <AIcon name="lock" size={14}/> Read-only mirror. Taps and edits are disabled while impersonating.
        </div>
      </div>
    </div>
  </div>
);

const btnGhost = {
  background: "transparent", border: "1px solid #E5E1D8", borderRadius: 10,
  padding: "6px 12px", font: "500 12px 'IBM Plex Sans'", color: "#1A1D24", cursor: "pointer",
};
const btnRow = {
  display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
  background: "#FAF7F2", border: "1px solid #E5E1D8", borderRadius: 10,
  font: "500 14px 'IBM Plex Sans'", color: "#1A1D24", cursor: "pointer", textAlign: "left",
};
const labelM = { font: "500 10px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", marginBottom: 2 };

Object.assign(window, { WorkerDetail, ImpersonateOverlay });
