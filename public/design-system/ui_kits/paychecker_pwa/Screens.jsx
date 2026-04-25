// PayChecker PWA — Screens

const { useState: useStateS } = React;

// ---------- Onboarding ----------
const OnboardingScreen = ({ onStart }) => (
  <div style={{ padding: "40px 24px 24px", display: "flex", flexDirection: "column", height: "100%", gap: 24 }}>
    <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
      <img src="../../assets/paychecker-appicon.svg" alt="PayChecker" width="56" height="56"/>
    </div>
    <div style={{ textAlign: "center", marginTop: 8 }}>
      <h1 style={{ font: "600 28px/1.2 'IBM Plex Sans'", color: "#1A1D24", margin: "0 0 12px", letterSpacing: "-0.01em" }}>
        Check your pay
      </h1>
      <p style={{ font: "400 16px/1.5 'IBM Plex Sans'", color: "#6B7280", margin: 0, maxWidth: 320, marginInline: "auto" }}>
        Upload a payslip. We compare it to your shifts and the award. You decide what to do next.
      </p>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: "auto" }}>
      <Button variant="primary" block onClick={onStart}>Get started</Button>
      <Button variant="tertiary" block>I already have an account</Button>
    </div>
    <p style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#6B7280", textAlign: "center", margin: 0 }}>
      PayChecker is a calculator. It isn't legal advice. For questions, Fair Work Ombudsman: 13 13 94.
    </p>
  </div>
);

// ---------- Home ----------
const HomeScreen = ({ onOpenWeek, onUpload }) => (
  <div style={{ padding: "8px 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ padding: "12px 4px 4px" }}>
      <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>Kia ora, Apete</div>
      <div style={{ font: "600 24px 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em" }}>Your pay</div>
    </div>

    <Card style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ font: "500 13px 'IBM Plex Sans'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>This week</span>
        <Pill tone="amber">Needs attention</Pill>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Row label="Expected" value={<Money amount={1247.60} size={18}/>}/>
        <Row label="Received" value={<Money amount={1200.00} size={18}/>}/>
        <div style={{ height: 1, background: "#F0ECE2", margin: "4px 0" }}/>
        <Row label="Difference" value={<Money amount={47.60} size={22} tone="amber" weight={600}/>}/>
      </div>
      <button onClick={onOpenWeek} style={{
        marginTop: 18, width: "100%", height: 48, borderRadius: 12,
        background: "transparent", border: "1px solid #1F3A5F", color: "#1F3A5F",
        font: "500 15px 'IBM Plex Sans'", cursor: "pointer",
      }}>See the working</button>
    </Card>

    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: "#E8EDF4",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#1F3A5F", flexShrink: 0,
        }}>
          <Icon name="upload" size={20}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: "600 15px 'IBM Plex Sans'", color: "#1A1D24" }}>Add a payslip</div>
          <div style={{ font: "400 14px/1.4 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>
            Photo, PDF, or screenshot
          </div>
        </div>
        <Button variant="secondary" onClick={onUpload}>Upload</Button>
      </div>
    </Card>

    <div style={{ marginTop: 8 }}>
      <div style={{ font: "500 13px 'IBM Plex Sans'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280", padding: "0 4px 10px" }}>Recent weeks</div>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <WeekRow date="Week of 7 Mar" meta="5 shifts" amount={1182.40} status="sage"/>
        <WeekRow date="Week of 29 Feb" meta="4 shifts" amount={982.00} status="sage"/>
        <WeekRow date="Week of 22 Feb" meta="6 shifts" amount={1340.00} status="sage"/>
      </div>
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
    <span style={{ font: "400 15px 'IBM Plex Sans'", color: "#6B7280" }}>{label}</span>
    {value}
  </div>
);

const WeekRow = ({ date, meta, amount, status }) => (
  <div style={{
    display: "grid", gridTemplateColumns: "1fr auto 18px",
    alignItems: "center", gap: 14, padding: "16px 20px",
    borderBottom: "1px solid #F0ECE2", cursor: "pointer",
  }}>
    <div>
      <div style={{ font: "500 15px 'IBM Plex Sans'", color: "#1A1D24" }}>{date}</div>
      <div style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>{meta}</div>
    </div>
    <Money amount={amount} size={15}/>
    <Icon name="chevron" size={18} color="#6B7280"/>
  </div>
);

// ---------- Week detail ----------
const WeekDetailScreen = ({ onBack, onWhy }) => (
  <div style={{ padding: "8px 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ padding: "8px 4px 0" }}>
      <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280" }}>Week of 14 Mar 2026</div>
      <div style={{ font: "600 24px 'IBM Plex Sans'", color: "#1A1D24", marginTop: 2 }}>Shift breakdown</div>
    </div>

    <Card>
      <ShiftRow date="Sun 10 Mar" meta="Dinner · 6.5 hrs" expected={238.55} received={195.00} tone="amber" onWhy={onWhy}/>
      <div style={{ height: 1, background: "#F0ECE2", margin: "14px 0" }}/>
      <ShiftRow date="Fri 8 Mar" meta="Dinner · 5 hrs" expected={153.00} received={153.00} tone="sage"/>
      <div style={{ height: 1, background: "#F0ECE2", margin: "14px 0" }}/>
      <ShiftRow date="Wed 6 Mar" meta="Lunch · 4 hrs" expected={122.40} received={122.40} tone="sage"/>
    </Card>

    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Icon name="info" size={20} color="#1F3A5F"/>
        <span style={{ font: "600 15px 'IBM Plex Sans'", color: "#1A1D24" }}>About this comparison</span>
      </div>
      <p style={{ font: "400 14px/1.5 'IBM Plex Sans'", color: "#6B7280", margin: 0 }}>
        We compared your hours against the Hospitality Industry Award (MA000009), Level 2. Tap any shift to see the calculation.
      </p>
    </Card>
  </div>
);

const ShiftRow = ({ date, meta, expected, received, tone, onWhy }) => {
  const diff = expected - received;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div>
          <div style={{ font: "500 15px 'IBM Plex Sans'", color: "#1A1D24" }}>{date}</div>
          <div style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>{meta}</div>
        </div>
        {tone === "amber"
          ? <Pill tone="amber">{`+$${diff.toFixed(2)}`}</Pill>
          : <Pill tone="sage">Matches</Pill>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "10px 0 0" }}>
        <Cell label="Expected" value={<Money amount={expected} size={16}/>}/>
        <Cell label="Received" value={<Money amount={received} size={16}/>}/>
        <Cell label="Difference" value={<Money amount={diff} size={16} tone={tone === "amber" ? "amber" : "muted"}/>}/>
      </div>
      {tone === "amber" && (
        <button onClick={onWhy} style={{
          marginTop: 10, background: "transparent", border: 0, color: "#1F3A5F",
          font: "500 14px 'IBM Plex Sans'", padding: 0, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>Why this number?<Icon name="chevron" size={16}/></button>
      )}
    </div>
  );
};

const Cell = ({ label, value }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <span style={{ font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6B7280" }}>{label}</span>
    {value}
  </div>
);

// ---------- Upload ----------
const UploadScreen = ({ onCancel, onDone }) => (
  <div style={{ padding: "8px 16px 24px", display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
    <div style={{ padding: "8px 4px 0" }}>
      <div style={{ font: "600 24px 'IBM Plex Sans'", color: "#1A1D24" }}>Add a payslip</div>
      <div style={{ font: "400 15px/1.5 'IBM Plex Sans'", color: "#6B7280", marginTop: 4 }}>
        We'll read it and line it up with your shifts. Nothing is shared.
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <UploadOption icon="camera" label="Take a photo"/>
      <UploadOption icon="file" label="Choose a file"/>
    </div>
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Icon name="lock" size={20} color="#1F3A5F"/>
        <div>
          <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>Your payslip stays on your phone</div>
          <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>
            We process it locally. You can delete it any time.
          </div>
        </div>
      </div>
    </Card>
    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <Button variant="primary" block onClick={onDone}>Use sample payslip</Button>
      <Button variant="tertiary" block onClick={onCancel}>Cancel</Button>
    </div>
  </div>
);

const UploadOption = ({ icon, label }) => (
  <button style={{
    background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: 0, padding: "24px 16px", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    font: "500 15px 'IBM Plex Sans'", color: "#1A1D24",
  }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#E8EDF4",
      display: "flex", alignItems: "center", justifyContent: "center", color: "#1F3A5F" }}>
      <Icon name={icon} size={22}/>
    </div>
    {label}
  </button>
);

// ---------- Why this number (sheet) ----------
const WhySheet = ({ onClose }) => (
  <div style={{
    position: "absolute", inset: 0, background: "rgba(26,29,36,0.35)",
    display: "flex", alignItems: "flex-end", zIndex: 20,
  }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{
      background: "#fff", width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: "10px 20px 28px", maxHeight: "80%", overflow: "auto",
    }}>
      <div style={{ height: 4, width: 36, borderRadius: 2, background: "#E5E1D8", margin: "6px auto 16px" }}/>
      <div style={{ font: "600 20px 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 12 }}>Why $43.55?</div>
      <div style={{ font: "400 15px/1.55 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 16 }}>
        Sunday shifts pay 175% of the base rate under this award. Based on the rate you entered.
      </div>
      <div style={{ background: "#FAF7F2", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <CalcRow k="Base rate" v={<Money amount={20.96} size={14}/>}/>
        <CalcRow k="Sunday loading (175%)" v={<Money amount={36.68} size={14}/>}/>
        <CalcRow k="Hours worked" v={<span style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums" }}>6.5</span>}/>
        <div style={{ height: 1, background: "#E5E1D8" }}/>
        <CalcRow k="Expected" v={<Money amount={238.55} size={15} weight={600}/>}/>
        <CalcRow k="Received" v={<Money amount={195.00} size={15} weight={600}/>}/>
        <CalcRow k="Difference" v={<Money amount={43.55} size={15} weight={600} tone="amber"/>}/>
      </div>
      <div style={{ font: "400 13px/1.55 'IBM Plex Sans'", color: "#6B7280", marginTop: 14 }}>
        Source: Hospitality Industry (General) Award 2020 · MA000009. This is a calculation, not legal advice.
      </div>
      <div style={{ marginTop: 18 }}>
        <Button variant="primary" block onClick={onClose}>Close</Button>
      </div>
    </div>
  </div>
);

const CalcRow = ({ k, v }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
    <span style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280" }}>{k}</span>
    {v}
  </div>
);

Object.assign(window, { OnboardingScreen, HomeScreen, WeekDetailScreen, UploadScreen, WhySheet });
