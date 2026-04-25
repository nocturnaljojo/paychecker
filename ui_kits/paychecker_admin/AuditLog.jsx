// PayChecker Admin — Audit Log
// Append-only visual treatment: monospace timestamps, no edit affordances,
// every row has a subtle "locked" indicator. Searchable, filterable, exportable.

const AuditLog = () => {
  const [q, setQ] = React.useState('');
  const [kind, setKind] = React.useState('all');
  const [range, setRange] = React.useState('7d');

  const allEvents = [
    { ts: "2026-03-18 14:22:04", admin: "Rani Kaur", kind: "worker.impersonate.start", worker: "W-10421", detail: "Viewed worker pane as Mia Tavita · read-only" },
    { ts: "2026-03-18 14:21:58", admin: "Rani Kaur", kind: "worker.view", worker: "W-10421", detail: "Opened worker detail · Overview tab" },
    { ts: "2026-03-18 13:08:11", admin: "Rani Kaur", kind: "finding.status.change", worker: "W-10298", detail: "Finding F-2991 moved from New → Reviewing" },
    { ts: "2026-03-18 11:44:52", admin: "Theo Nguyen", kind: "rule.publish", worker: null, detail: "Hospitality Award MA000009 · Level 2 · new rate effective 1 Jul 2026" },
    { ts: "2026-03-18 09:51:20", admin: "Theo Nguyen", kind: "rule.draft", worker: null, detail: "National Minimum Wage draft v2026-07 created" },
    { ts: "2026-03-17 18:02:47", admin: "Rani Kaur", kind: "support.message.send", worker: "W-10054", detail: "Sent template 'classification check needed' to Danny P." },
    { ts: "2026-03-17 16:40:03", admin: "System", kind: "export.generated", worker: null, detail: "Flags export · 184 rows · CSV · requested by Rani Kaur" },
    { ts: "2026-03-17 15:18:29", admin: "Rani Kaur", kind: "worker.data.export", worker: "W-10112", detail: "Exported worker data at worker request (DSAR)" },
    { ts: "2026-03-17 11:02:09", admin: "Theo Nguyen", kind: "rule.publish", worker: null, detail: "Public Holiday · VIC · Queen's Birthday 2026 added" },
    { ts: "2026-03-16 17:55:44", admin: "System", kind: "admin.login", worker: null, detail: "Rani Kaur signed in · SSO · 203.0.113.42" },
    { ts: "2026-03-16 10:14:01", admin: "Rani Kaur", kind: "worker.note.add", worker: "W-10421", detail: "Added support note: 'confirmed Level 2 classification via POS record'" },
    { ts: "2026-03-15 19:30:52", admin: "System", kind: "upload.parse.fail", worker: "W-10078", detail: "OCR confidence below threshold · queued for manual review" },
  ];

  const events = allEvents.filter(e => {
    if (kind !== 'all' && !e.kind.startsWith(kind)) return false;
    if (q && !(`${e.admin} ${e.worker || ''} ${e.detail} ${e.kind}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div style={{ padding: 32, background: "#FAF7F2", minHeight: "100%" }}>
      {/* Append-only banner */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", background: "#EFECE3", borderRadius: 10, marginBottom: 16, font: "400 13px 'IBM Plex Sans'", color: "#4B5262" }}>
        <AIcon name="lock" size={16} color="#6B7280"/>
        Append-only. Entries cannot be edited or deleted. Retained for 7 years.
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E5E1D8", borderRadius: 10, padding: "8px 12px", flex: 1, minWidth: 260 }}>
          <AIcon name="search" size={16} color="#6B7280"/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search admin, worker ID, action type, or details"
            style={{ border: 0, outline: "none", background: "transparent", flex: 1, font: "400 14px 'IBM Plex Sans'", color: "#1A1D24" }}/>
        </div>
        <SelectChip label="Action" value={kind} onChange={setKind} options={[
          ['all', 'All actions'], ['worker', 'Worker'], ['rule', 'Rule'],
          ['support', 'Support'], ['export', 'Export'], ['admin', 'Admin'], ['upload', 'Upload'],
        ]}/>
        <SelectChip label="Range" value={range} onChange={setRange} options={[
          ['24h', 'Last 24h'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['all', 'All time'],
        ]}/>
        <button style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 10, padding: "8px 14px", font: "500 13px 'IBM Plex Sans'", color: "#1A1D24", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <AIcon name="download" size={14}/> Export CSV
        </button>
      </div>

      {/* Log table */}
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 1.2fr 110px 2fr 24px", padding: "12px 20px", font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", borderBottom: "1px solid #F0ECE2" }}>
          <div>Timestamp (UTC)</div><div>Admin</div><div>Action</div><div>Worker</div><div>Details</div><div/>
        </div>
        {events.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "220px 1fr 1.2fr 110px 2fr 24px", padding: "14px 20px", borderBottom: i < events.length - 1 ? "1px solid #F0ECE2" : 0, alignItems: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", fontSize: 13, color: "#6B7280" }}>{e.ts}</div>
            <div style={{ font: "400 14px 'IBM Plex Sans'", color: e.admin === 'System' ? '#6B7280' : '#1A1D24' }}>{e.admin}</div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: "#1A1D24" }}>{e.kind}</div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: e.worker ? '#1A1D24' : '#6B7280' }}>{e.worker || '—'}</div>
            <div style={{ font: "400 13px/1.4 'IBM Plex Sans'", color: "#1A1D24" }}>{e.detail}</div>
            <AIcon name="lock" size={13} color="#CFC8B8"/>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", font: "400 14px 'IBM Plex Sans'", color: "#6B7280" }}>
            No log entries match those filters.
          </div>
        )}
      </div>
    </div>
  );
};

const SelectChip = ({ label, value, onChange, options }) => (
  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E5E1D8", borderRadius: 10, padding: "8px 12px" }}>
    <span style={{ font: "500 12px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>{label}</span>
    <select value={value} onChange={e => onChange(e.target.value)} style={{ border: 0, background: "transparent", font: "400 14px 'IBM Plex Sans'", color: "#1A1D24", outline: "none", cursor: "pointer" }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </label>
);

Object.assign(window, { AuditLog, SelectChip });
