// PayChecker Admin — Rules
// Temporal reference data with append-only versioning.
//  - Award rates (by award code + classification + effective-from date)
//  - National Minimum Wage (by effective-from date)
//  - Public holidays (by state + year)
// Editing creates a new version with an effective-from date; prior versions never overwritten.

const RulesScreen = () => {
  const [section, setSection] = React.useState('awards');
  const [drill, setDrill] = React.useState(null); // award code for rate history

  return (
    <div style={{ padding: 32, background: "#FAF7F2", minHeight: "100%" }}>
      {/* Append-only banner */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", background: "#EFECE3", borderRadius: 10, marginBottom: 16, font: "400 13px 'IBM Plex Sans'", color: "#4B5262" }}>
        <AIcon name="history" size={16} color="#6B7280"/>
        Every edit creates a new version with an effective-from date. Prior versions are never overwritten.
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #E5E1D8", marginBottom: 20 }}>
        {[['awards','Award rates'],['nmw','National Minimum Wage'],['holidays','Public holidays']].map(([id,label]) => (
          <button key={id} onClick={() => { setSection(id); setDrill(null); }}
            style={{
              padding: "12px 16px", background: "transparent", border: 0,
              borderBottom: section === id ? "2px solid #1F3A5F" : "2px solid transparent",
              color: section === id ? "#1F3A5F" : "#6B7280", cursor: "pointer",
              font: `${section === id ? 500 : 400} 14px 'IBM Plex Sans'`, marginBottom: -1,
            }}>{label}</button>
        ))}
      </div>

      {section === 'awards' && (drill ? <RateHistory code={drill} onBack={() => setDrill(null)}/> : <AwardRates onDrill={setDrill}/>)}
      {section === 'nmw' && <NMWTable/>}
      {section === 'holidays' && <HolidaysTable/>}
    </div>
  );
};

// ---------- Awards list ----------
const AwardRates = ({ onDrill }) => {
  const awards = [
    { code: "MA000009", name: "Hospitality Industry (General) Award 2020", levels: 6, current: "2025-07-01", next: "2026-07-01 (draft)", status: "sage" },
    { code: "MA000003", name: "General Retail Industry Award 2020", levels: 8, current: "2025-07-01", next: null, status: "sage" },
    { code: "MA000020", name: "Building and Construction General On-site Award", levels: 6, current: "2025-07-01", next: null, status: "sage" },
    { code: "MA000004", name: "Clerks — Private Sector Award", levels: 5, current: "2025-07-01", next: null, status: "sage" },
    { code: "MA000100", name: "Horticulture Award 2020", levels: 5, current: "2025-07-01", next: "2026-07-01 (review)", status: "amber" },
  ];
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280" }}>{awards.length} awards · versioned by effective date</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnSecondary}><AIcon name="download" size={14}/> Export</button>
          <button style={btnPrimary}><AIcon name="plus" size={14}/> New award</button>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "130px 2fr 80px 140px 180px 24px", padding: "12px 20px", font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", borderBottom: "1px solid #F0ECE2" }}>
          <div>Code</div><div>Name</div><div>Levels</div><div>Current from</div><div>Next version</div><div/>
        </div>
        {awards.map((a, i) => (
          <div key={a.code} onClick={() => onDrill(a.code)}
            style={{ display: "grid", gridTemplateColumns: "130px 2fr 80px 140px 180px 24px", padding: "14px 20px", borderBottom: i < awards.length - 1 ? "1px solid #F0ECE2" : 0, alignItems: "center", cursor: "pointer" }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: "#1A1D24" }}>{a.code}</div>
            <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{a.name}</div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", fontSize: 14, color: "#1A1D24" }}>{a.levels}</div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", fontSize: 13, color: "#6B7280" }}>{a.current}</div>
            <div>{a.next ? <APill tone={a.status}>{a.next}</APill> : <span style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280" }}>—</span>}</div>
            <AIcon name="chevron" size={14} color="#6B7280"/>
          </div>
        ))}
      </div>
    </>
  );
};

// ---------- Rate history for one award ----------
const RateHistory = ({ code, onBack }) => {
  const versions = [
    { from: "2026-07-01", to: null, status: "Draft", tone: "amber", author: "Theo Nguyen", published: "not yet", note: "Proposed Fair Work decision · pending confirmation" },
    { from: "2025-07-01", to: "2026-06-30", status: "Current", tone: "sage", author: "Theo Nguyen", published: "2025-06-24 14:02 UTC", note: "Annual Wage Review 2025" },
    { from: "2024-07-01", to: "2025-06-30", status: "Superseded", tone: "grey", author: "Marta Oyelaran", published: "2024-06-28 11:18 UTC", note: "Annual Wage Review 2024" },
    { from: "2023-07-01", to: "2024-06-30", status: "Superseded", tone: "grey", author: "Marta Oyelaran", published: "2023-06-27 09:44 UTC", note: "Annual Wage Review 2023" },
  ];
  const rates = [
    { level: "Introductory", hourly: 23.23, casual: 29.04, sat: 34.85, sun: 40.66 },
    { level: "Level 1",      hourly: 24.10, casual: 30.13, sat: 36.15, sun: 42.18 },
    { level: "Level 2",      hourly: 24.98, casual: 31.23, sat: 37.47, sun: 43.72 },
    { level: "Level 3",      hourly: 25.83, casual: 32.29, sat: 38.75, sun: 45.20 },
    { level: "Level 4",      hourly: 27.27, casual: 34.09, sat: 40.91, sun: 47.72 },
    { level: "Level 5",      hourly: 29.04, casual: 36.30, sat: 43.56, sun: 50.82 },
  ];
  return (
    <>
      <button onClick={onBack} style={{ background: "transparent", border: 0, color: "#6B7280", font: "400 13px 'IBM Plex Sans'", padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14 }}>
        <AIcon name="chevronL" size={14}/> Back to awards
      </button>

      {/* Award header */}
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: "#6B7280" }}>{code}</div>
            <div style={{ font: "600 20px 'IBM Plex Sans'", color: "#1A1D24", marginTop: 4 }}>Hospitality Industry (General) Award 2020</div>
            <div style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280", marginTop: 4 }}>Viewing current version · effective 2025-07-01</div>
          </div>
          <button style={btnPrimary}><AIcon name="plus" size={14}/> New version</button>
        </div>
      </div>

      {/* Rate history timeline */}
      <div style={{ font: "600 14px 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 10 }}>Rate history</div>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {versions.map((v, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 16, paddingBottom: 18, borderBottom: i < versions.length - 1 ? "1px solid #F0ECE2" : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: v.tone === 'sage' ? '#5C8F6B' : v.tone === 'amber' ? '#E8B04B' : '#CFC8B8', marginTop: 4 }}/>
                {i < versions.length - 1 && <div style={{ flex: 1, width: 1, background: "#E5E1D8", marginTop: 6 }}/>}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", fontSize: 14, fontWeight: 500, color: "#1A1D24" }}>
                    {v.from} → {v.to || "present"}
                  </div>
                  <APill tone={v.tone}>{v.status}</APill>
                </div>
                <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#6B7280", marginTop: 4 }}>{v.note}</div>
                <div style={{ font: "400 12px 'IBM Plex Mono'", color: "#6B7280", marginTop: 4 }}>
                  by {v.author} · published {v.published}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rate table (current version) */}
      <div style={{ font: "600 14px 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 10 }}>Rates · current version · effective 2025-07-01</div>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr 1fr", padding: "12px 20px", font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", borderBottom: "1px solid #F0ECE2" }}>
          <div>Classification</div><div>Hourly (PT/FT)</div><div>Casual</div><div>Saturday</div><div>Sunday</div>
        </div>
        {rates.map((r, i) => (
          <div key={r.level} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr 1fr", padding: "13px 20px", borderBottom: i < rates.length - 1 ? "1px solid #F0ECE2" : 0, alignItems: "center" }}>
            <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{r.level}</div>
            <AMoney amount={r.hourly} size={14}/>
            <AMoney amount={r.casual} size={14}/>
            <AMoney amount={r.sat} size={14}/>
            <AMoney amount={r.sun} size={14}/>
          </div>
        ))}
      </div>
    </>
  );
};

// ---------- National Minimum Wage ----------
const NMWTable = () => {
  const rows = [
    { from: "2026-07-01", to: null, hourly: 26.80, weekly: 1018.40, status: "Draft", tone: "amber", author: "Theo Nguyen", published: "not yet" },
    { from: "2025-07-01", to: "2026-06-30", hourly: 25.65, weekly: 974.70, status: "Current", tone: "sage", author: "Theo Nguyen", published: "2025-06-24 14:02 UTC" },
    { from: "2024-07-01", to: "2025-06-30", hourly: 24.10, weekly: 915.90, status: "Superseded", tone: "grey", author: "Marta Oyelaran", published: "2024-06-28 11:18 UTC" },
    { from: "2023-07-01", to: "2024-06-30", hourly: 23.23, weekly: 882.80, status: "Superseded", tone: "grey", author: "Marta Oyelaran", published: "2023-06-27 09:44 UTC" },
  ];
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280" }}>National Minimum Wage · versioned by effective date</div>
        <button style={btnPrimary}><AIcon name="plus" size={14}/> New version</button>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "170px 170px 130px 130px 130px 1fr", padding: "12px 20px", font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", borderBottom: "1px solid #F0ECE2" }}>
          <div>Effective from</div><div>Effective to</div><div>Hourly</div><div>Weekly</div><div>Status</div><div>Published</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "170px 170px 130px 130px 130px 1fr", padding: "14px 20px", borderBottom: i < rows.length - 1 ? "1px solid #F0ECE2" : 0, alignItems: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", fontSize: 13, color: "#1A1D24" }}>{r.from}</div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", fontSize: 13, color: r.to ? '#6B7280' : '#1A1D24' }}>{r.to || 'present'}</div>
            <AMoney amount={r.hourly} size={14}/>
            <AMoney amount={r.weekly} size={14}/>
            <div><APill tone={r.tone}>{r.status}</APill></div>
            <div style={{ font: "400 12px 'IBM Plex Mono'", color: "#6B7280" }}>by {r.author} · {r.published}</div>
          </div>
        ))}
      </div>
    </>
  );
};

// ---------- Public holidays ----------
const HolidaysTable = () => {
  const [state, setState] = React.useState('VIC');
  const [year, setYear] = React.useState('2026');
  const data = {
    VIC: {
      '2026': [
        { d: "2026-01-01", name: "New Year's Day", status: "Published" },
        { d: "2026-01-26", name: "Australia Day", status: "Published" },
        { d: "2026-03-09", name: "Labour Day", status: "Published" },
        { d: "2026-04-03", name: "Good Friday", status: "Published" },
        { d: "2026-04-04", name: "Saturday before Easter Sunday", status: "Published" },
        { d: "2026-04-05", name: "Easter Sunday", status: "Published" },
        { d: "2026-04-06", name: "Easter Monday", status: "Published" },
        { d: "2026-04-25", name: "ANZAC Day", status: "Published" },
        { d: "2026-06-08", name: "King's Birthday", status: "Draft" },
        { d: "2026-09-25", name: "AFL Grand Final Friday", status: "Pending FW confirmation" },
        { d: "2026-11-03", name: "Melbourne Cup Day (metro)", status: "Published" },
        { d: "2026-12-25", name: "Christmas Day", status: "Published" },
        { d: "2026-12-26", name: "Boxing Day", status: "Published" },
      ],
    },
  };
  const rows = data[state]?.[year] || [];
  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <SelectChip label="State" value={state} onChange={setState} options={[['VIC','Victoria'],['NSW','New South Wales'],['QLD','Queensland'],['SA','South Australia'],['WA','Western Australia'],['TAS','Tasmania'],['NT','Northern Territory'],['ACT','ACT']]}/>
          <SelectChip label="Year" value={year} onChange={setYear} options={[['2024','2024'],['2025','2025'],['2026','2026'],['2027','2027']]}/>
        </div>
        <button style={btnPrimary}><AIcon name="plus" size={14}/> Add holiday</button>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 180px 1fr", padding: "12px 20px", font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", borderBottom: "1px solid #F0ECE2" }}>
          <div>Date</div><div>Holiday</div><div>Status</div><div>Version</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr 180px 1fr", padding: "14px 20px", borderBottom: i < rows.length - 1 ? "1px solid #F0ECE2" : 0, alignItems: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums", fontSize: 13, color: "#1A1D24" }}>{r.d}</div>
            <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{r.name}</div>
            <div><APill tone={r.status === 'Published' ? 'sage' : r.status === 'Draft' ? 'amber' : 'grey'}>{r.status}</APill></div>
            <div style={{ font: "400 12px 'IBM Plex Mono'", color: "#6B7280" }}>v1 · 2025-12-18</div>
          </div>
        ))}
      </div>
    </>
  );
};

const btnPrimary = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "#1F3A5F", color: "#fff", border: 0, borderRadius: 10,
  padding: "9px 14px", font: "500 13px 'IBM Plex Sans'", cursor: "pointer",
};
const btnSecondary = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "#fff", color: "#1A1D24", border: "1px solid #E5E1D8", borderRadius: 10,
  padding: "9px 14px", font: "500 13px 'IBM Plex Sans'", cursor: "pointer",
};

Object.assign(window, { RulesScreen });
