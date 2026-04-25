// PayChecker PWA — "Your data" bucket status screen
// Five worker-controlled buckets with calm, non-nagging status indicators.
// Summary card shows which comparisons are unlocked right now.
//
// Status taxonomy (per bucket):
//   empty        — never uploaded, grey dashed tile
//   partial      — some data in, amber dot
//   complete     — full coverage, sage check
//   acknowledged — worker confirmed "uploaded everything I have", sage check
//   gap          — detected missing period, amber with message

const BUCKETS = [
  {
    id: "A", key: "contract", name: "Employment contract",
    desc: "What your employer promised — hours, rate, classification.",
    icon: "file",
    primary: "Upload contract",
    captureOptions: "Photo · PDF · manual entry",
  },
  {
    id: "B", key: "payslips", name: "Payslips",
    desc: "What your employer says happened each pay cycle.",
    icon: "download",
    primary: "Add payslip",
    captureOptions: "Photo · PDF · forward email",
  },
  {
    id: "F", key: "shifts", name: "Shifts",
    desc: "What you say actually happened — logged as you work.",
    icon: "calendar",
    primary: "Log a shift",
    captureOptions: "Logged in-app",
  },
  {
    id: "D", key: "super", name: "Super fund statements",
    desc: "Ground truth — what your super fund actually received.",
    icon: "wallet",
    primary: "Add statement",
    captureOptions: "Screenshot · PDF · forward email",
  },
  {
    id: "E", key: "bank", name: "Bank deposit records",
    desc: "Ground truth — what your bank actually received. We only look at employer deposits; the rest is discarded.",
    icon: "lock",
    primary: "Add bank record",
    captureOptions: "Screenshot · PDF · forward email",
  },
];

// Comparisons unlocked based on bucket state
const COMPARISONS = [
  { id: "rate",  name: "Rate vs award",        needs: ["contract"], needsLabel: "needs contract (A)" },
  { id: "hours", name: "Hours vs payslip",     needs: ["payslips", "shifts"], needsLabel: "needs payslip (B) & shifts (F)" },
  { id: "pay",   name: "Full pay comparison",  needs: ["contract", "payslips", "shifts"], needsLabel: "needs contract, payslip & shifts" },
  { id: "bank",  name: "Bank reconciliation",  needs: ["payslips", "bank"], needsLabel: "needs bank statement (E)" },
  { id: "super", name: "Super verification",   needs: ["payslips", "super"], needsLabel: "needs super statement (D)" },
];

// ---------- Status pill ----------

const StatusPill = ({ status, text }) => {
  const cfg = {
    empty:        { bg: "transparent", fg: "#6B7280", icon: null,       border: "1px dashed #CFC8B8" },
    partial:      { bg: "#FBF1DB",     fg: "#7A5A1E", icon: "alert",    border: "none" },
    gap:          { bg: "#FBF1DB",     fg: "#7A5A1E", icon: "alert",    border: "none" },
    complete:     { bg: "#E4EDE6",     fg: "#385944", icon: "check",    border: "none" },
    acknowledged: { bg: "#E4EDE6",     fg: "#385944", icon: "check",    border: "none" },
  }[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 11px", borderRadius: 9999,
      background: cfg.bg, color: cfg.fg, border: cfg.border,
      font: "500 12px 'IBM Plex Sans'", whiteSpace: "nowrap",
    }}>
      {cfg.icon && <Icon name={cfg.icon} size={13} strokeWidth={2.5}/>}
      {text}
    </span>
  );
};

// ---------- Summary card ----------

const UnlockedSummary = ({ bucketState }) => {
  const hasAny = key => {
    const s = bucketState[key]?.status;
    return s === "complete" || s === "acknowledged" || s === "partial";
  };
  const unlocked = COMPARISONS.map(c => ({
    ...c, on: c.needs.every(hasAny),
  }));
  const onCount = unlocked.filter(c => c.on).length;

  return (
    <div style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 16, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ font: "600 16px 'IBM Plex Sans'", color: "#1A1D24" }}>What's possible right now</div>
        <div style={{ font: "500 12px 'IBM Plex Mono'", color: "#6B7280" }}>{onCount} of {COMPARISONS.length}</div>
      </div>
      <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#6B7280", marginBottom: 12 }}>
        We can still do useful work with what you've given us.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {unlocked.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            {c.on
              ? <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#E4EDE6", color: "#385944", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <Icon name="check" size={14} strokeWidth={2.5}/>
                </div>
              : <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#F0ECE2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9B9485" }}/>
                </div>
            }
            <div style={{ flex: 1, paddingTop: 2 }}>
              <div style={{ font: c.on ? "500 14px 'IBM Plex Sans'" : "400 14px 'IBM Plex Sans'", color: c.on ? "#1A1D24" : "#6B7280" }}>
                {c.name}
              </div>
              {!c.on && (
                <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#9B9485", marginTop: 1 }}>{c.needsLabel}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Bucket card ----------

const BucketCard = ({ bucket, state, onPrimary, onAcknowledge, onAddLater }) => {
  const { status, count, lastUpload, gapMessage } = state;
  const statusText = (() => {
    switch (status) {
      case "empty":        return "Not yet uploaded";
      case "partial":      return count ? `${count} uploaded` : "In progress";
      case "complete":     return "Up to date";
      case "acknowledged": return "Uploaded everything I have";
      case "gap":          return "Gap detected";
      default:             return "";
    }
  })();

  const iconTone = status === "complete" || status === "acknowledged" ? "sage"
    : status === "partial" || status === "gap" ? "amber"
    : "muted";
  const iconBg = { sage: "#E4EDE6", amber: "#FBF1DB", muted: "#EFECE3" }[iconTone];
  const iconFg = { sage: "#385944", amber: "#7A5A1E", muted: "#6B7280" }[iconTone];

  return (
    <div style={{ background: "#fff", border: status === "empty" ? "1px dashed #CFC8B8" : "1px solid #E5E1D8", borderRadius: 16, padding: 18 }}>
      {/* header */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, color: iconFg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={bucket.icon} size={22} strokeWidth={1.75}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ font: "600 16px 'IBM Plex Sans'", color: "#1A1D24" }}>{bucket.name}</div>
            <span style={{ font: "500 11px 'IBM Plex Mono'", color: "#9B9485" }}>{bucket.id}</span>
          </div>
          <div style={{ font: "400 13px/1.45 'IBM Plex Sans'", color: "#6B7280", textWrap: "pretty" }}>{bucket.desc}</div>
        </div>
      </div>

      {/* status line */}
      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <StatusPill status={status} text={statusText}/>
        {lastUpload && status !== "empty" && (
          <span style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280" }}>Latest: {lastUpload}</span>
        )}
      </div>

      {gapMessage && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#FBF1DB", borderRadius: 10, font: "400 13px/1.45 'IBM Plex Sans'", color: "#7A5A1E" }}>
          {gapMessage}
        </div>
      )}

      {/* actions */}
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <Button variant={status === "empty" ? "primary" : "secondary"} block onClick={onPrimary} icon="upload">
          {bucket.primary}
        </Button>
        {status !== "acknowledged" && status !== "complete" && (
          <button onClick={onAcknowledge} style={{
            background: "transparent", border: 0, padding: "10px 12px", cursor: "pointer",
            font: "500 14px 'IBM Plex Sans'", color: "#1F3A5F",
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <Icon name="check" size={16}/> I've uploaded everything I have
          </button>
        )}
        {status === "empty" && (
          <button onClick={onAddLater} style={{
            background: "transparent", border: 0, padding: "6px 12px", cursor: "pointer",
            font: "400 13px 'IBM Plex Sans'", color: "#6B7280",
          }}>
            Add later
          </button>
        )}
      </div>

      {/* capture options hint */}
      <div style={{ marginTop: 10, font: "400 11px 'IBM Plex Mono'", color: "#9B9485", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {bucket.captureOptions}
      </div>
    </div>
  );
};

// ---------- YourData screen ----------

const YourDataScreen = ({ onOpenBucket }) => {
  // Demo state — in real app this would come from app state / server.
  const [bucketState, setBucketState] = React.useState({
    contract: { status: "empty" },
    payslips: { status: "partial", count: 2, lastUpload: "Fri 15 Mar" },
    shifts:   { status: "partial", count: 3, lastUpload: "Today" },
    super:    { status: "empty" },
    bank:     { status: "empty" },
  });

  const update = (key, patch) =>
    setBucketState(s => ({ ...s, [key]: { ...s[key], ...patch } }));

  return (
    <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ padding: "8px 4px 4px" }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>Your data</div>
        <div style={{ font: "600 24px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em", textWrap: "pretty" }}>
          What's in, what's missing.
        </div>
      </div>

      {/* Summary card */}
      <UnlockedSummary bucketState={bucketState}/>

      {/* Section label */}
      <div style={{ paddingLeft: 4, marginTop: 4 }}>
        <div style={{ font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B7280" }}>
          Your data buckets
        </div>
      </div>

      {/* Bucket cards */}
      {BUCKETS.map(b => (
        <BucketCard
          key={b.key}
          bucket={b}
          state={bucketState[b.key]}
          onPrimary={() => onOpenBucket && onOpenBucket(b.key)}
          onAcknowledge={() => update(b.key, { status: "acknowledged", lastUpload: bucketState[b.key].lastUpload || "Just now" })}
          onAddLater={() => update(b.key, { status: "empty" })}
        />
      ))}

      {/* Footer reassurance */}
      <div style={{ padding: "16px 4px 4px", font: "400 13px/1.5 'IBM Plex Sans'", color: "#6B7280", textAlign: "center" }}>
        Add what you have. We'll ask for the rest when it becomes useful.
      </div>
    </div>
  );
};

Object.assign(window, { YourDataScreen, BucketCard, UnlockedSummary, BUCKETS, COMPARISONS });
