// PayChecker PWA — Workflow C: Payslip processing flow
//
// Four screens + one bottom sheet:
//   1. UploadChoice       — Photo / File / Manual / Email-forward
//   2. ExtractionPreview  — editable fields + confidence + provenance
//   3. ExtractionSaved    — confirmation + unlocked comparisons
//   4. FieldProvenance    — bottom sheet with source/edit/delete/wrong
//
// Extract-and-confirm principles:
//  - raw image is retained only until worker confirms, then deleted
//  - every extracted value is editable
//  - low confidence = amber (NEVER red); nothing enters calc until confirmed
//  - confidence pills distinguish Low (<70%) / Med (70-89%) / High (≥90%)

// ---------- Fake extracted payslip (realistic for hospitality PALM worker) ----------
// Mix of confidence levels so all three pills appear at once.

const SAMPLE_EXTRACTION = {
  meta: {
    employer: "Sunset Coast Hospitality Pty Ltd",
    periodStart: "2026-03-08",
    periodEnd: "2026-03-14",
    payDate: "2026-03-16",
    rawFilename: "payslip-2026-03-16.jpg",
  },
  fields: [
    { key: "periodStart",  label: "Pay period start",    value: "8 Mar 2026",   confidence: "high", coords: [0.55, 0.08, 0.92, 0.13] },
    { key: "periodEnd",    label: "Pay period end",      value: "14 Mar 2026",  confidence: "high", coords: [0.55, 0.14, 0.92, 0.19] },
    { key: "grossPay",     label: "Gross pay",           value: "1,370.24",     kind: "money", confidence: "high", coords: [0.55, 0.32, 0.92, 0.38] },
    { key: "netPay",       label: "Net pay",             value: "1,200.00",     kind: "money", confidence: "high", coords: [0.55, 0.70, 0.92, 0.76] },
    { key: "taxWithheld",  label: "Tax withheld",        value: "219.24",       kind: "money", confidence: "high", coords: [0.55, 0.40, 0.92, 0.45] },
    { key: "super",        label: "Superannuation",      value: "150.73",       kind: "money", confidence: "med",  coords: [0.55, 0.47, 0.92, 0.52] },
    { key: "hours",        label: "Hours worked",        value: "59.0",         confidence: "med",  coords: [0.08, 0.32, 0.48, 0.38], note: "Figures on two lines — added" },
    { key: "hourlyRate",   label: "Hourly rate",         value: "20.96",        kind: "money", confidence: "low",  coords: [0.08, 0.40, 0.48, 0.45], note: "Faint in scan" },
  ],
  deductions: [
    { key: "d_accom",      label: "Accommodation",       value: "185.00",       kind: "money", confidence: "high", coords: [0.08, 0.58, 0.92, 0.63] },
    { key: "d_transport",  label: "Transport to work",   value: "45.00",        kind: "money", confidence: "high", coords: [0.08, 0.63, 0.92, 0.68] },
    { key: "d_airfare",    label: "Airfare repayment",   value: "60.00",        kind: "money", confidence: "med",  coords: [0.08, 0.68, 0.92, 0.73] },
    { key: "d_uniform",    label: "Uniform",             value: "12.00",        kind: "money", confidence: "low",  coords: [0.08, 0.73, 0.92, 0.78], note: "Printed small" },
  ],
};

// ---------- Confidence pill ----------

const ConfidencePill = ({ level }) => {
  const cfg = {
    high: { bg: "#E4EDE6", fg: "#385944", label: "High" },
    med:  { bg: "#EFECE3", fg: "#4B5262", label: "Medium" },
    low:  { bg: "#FBF1DB", fg: "#7A5A1E", label: "Low" },
  }[level];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 9999,
      background: cfg.bg, color: cfg.fg,
      font: "500 11px 'IBM Plex Sans'", whiteSpace: "nowrap",
    }}>{cfg.label}</span>
  );
};

// ---------- Screen 1: Upload choice ----------

const UploadChoiceScreen = ({ onPick, onBack }) => {
  const [showEmail, setShowEmail] = React.useState(false);
  const forwardAddress = "apete-a7b2@in.paychecker.app";

  return (
    <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "8px 4px 4px" }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>Payslips · Bucket B</div>
        <div style={{ font: "600 24px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em" }}>
          Add a payslip
        </div>
        <div style={{ font: "400 14px/1.5 'IBM Plex Sans'", color: "#6B7280", marginTop: 6, textWrap: "pretty" }}>
          We'll read it for you — then you check everything is right before it's saved.
        </div>
      </div>

      <UploadMethodCard
        icon="camera" title="Take a photo"
        desc="Works with paper payslips and screens"
        onClick={() => onPick("photo")}
        primary
      />
      <UploadMethodCard
        icon="file" title="Pick from files"
        desc="PDF, PNG, or JPG"
        onClick={() => onPick("file")}
      />
      <UploadMethodCard
        icon="keyboard" title="Enter manually"
        desc="Type in the numbers yourself"
        onClick={() => onPick("manual")}
      />

      {/* Email forward — subtle, expandable */}
      <button onClick={() => setShowEmail(v => !v)} style={{
        marginTop: 4, padding: "14px 16px", background: "transparent",
        border: "1px solid #E5E1D8", borderRadius: 12, cursor: "pointer", textAlign: "left",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Icon name="mail" size={20} color="#6B7280"/>
        <div style={{ flex: 1 }}>
          <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>Forward from email</div>
          <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280", marginTop: 1 }}>Send payslip emails to a private address</div>
        </div>
        <Icon name="chevron" size={16} color="#9B9485" style={{ transform: showEmail ? "rotate(90deg)" : "", transition: "transform 150ms" }}/>
      </button>

      {showEmail && (
        <div style={{ padding: "14px 16px", background: "#F5F1E7", borderRadius: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#1A1D24" }}>
            Your private forward address:
          </div>
          <div style={{
            padding: "10px 12px", background: "#fff", borderRadius: 8,
            font: "500 13px 'IBM Plex Mono'", color: "#1A1D24",
            wordBreak: "break-all",
          }}>
            {forwardAddress}
          </div>
          <div style={{ font: "400 12px/1.5 'IBM Plex Sans'", color: "#6B7280" }}>
            Forward payslip emails here. We'll extract automatically and notify you to review.
          </div>
        </div>
      )}

      <div style={{ padding: "14px 4px 4px", display: "flex", alignItems: "flex-start", gap: 8 }}>
        <Icon name="lock" size={16} color="#6B7280" style={{ flexShrink: 0, marginTop: 2 }}/>
        <div style={{ font: "400 12px/1.5 'IBM Plex Sans'", color: "#6B7280", textWrap: "pretty" }}>
          The image is deleted once you confirm the details. We keep the numbers, not the photo.
        </div>
      </div>

      {onBack && (
        <div style={{ marginTop: 4 }}>
          <Button variant="tertiary" block onClick={onBack}>Cancel</Button>
        </div>
      )}
    </div>
  );
};

const UploadMethodCard = ({ icon, title, desc, onClick, primary }) => (
  <button onClick={onClick} style={{
    padding: "18px 18px", background: primary ? "#1F3A5F" : "#fff",
    border: primary ? "none" : "1px solid #E5E1D8",
    borderRadius: 14, cursor: "pointer", textAlign: "left",
    display: "flex", alignItems: "center", gap: 14,
    color: primary ? "#fff" : "#1A1D24",
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 12,
      background: primary ? "rgba(255,255,255,0.12)" : "#E8EDF4",
      color: primary ? "#fff" : "#1F3A5F",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <Icon name={icon} size={22} strokeWidth={1.75}/>
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ font: "600 16px 'IBM Plex Sans'" }}>{title}</div>
      <div style={{ font: "400 13px/1.4 'IBM Plex Sans'", opacity: primary ? 0.85 : 0.7, marginTop: 2, color: primary ? "#E8EDF4" : "#6B7280" }}>{desc}</div>
    </div>
    <Icon name="chevron" size={20} color={primary ? "#E8EDF4" : "#9B9485"}/>
  </button>
);

// ---------- Screen 2: Extraction preview ----------

const ExtractionPreviewScreen = ({ extraction = SAMPLE_EXTRACTION, onSave, onCancel, onShowSource }) => {
  const [data, setData] = React.useState(extraction);
  const [aggressive, setAggressive] = React.useState(false);

  const updateField = (section, key, patch) => {
    setData(d => ({
      ...d,
      [section]: d[section].map(f => f.key === key ? { ...f, ...patch } : f),
    }));
  };

  const allFields = [...data.fields, ...data.deductions];
  const lowCount = allFields.filter(f => f.confidence === "low").length;

  return (
    <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Sparkline header — AI did work */}
      <div style={{
        padding: "12px 14px", background: "#F0F4F8", borderRadius: 12,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#1F3A5F", flexShrink: 0,
        }}>
          <Icon name="sparkle" size={16} strokeWidth={2}/>
        </div>
        <div style={{ flex: 1, font: "400 13px/1.45 'IBM Plex Sans'", color: "#1A1D24" }}>
          We read your payslip. <span style={{ color: "#6B7280" }}>Check each value before saving.</span>
        </div>
      </div>

      <div style={{ padding: "4px 4px 0" }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>Extracted from {data.meta.rawFilename}</div>
        <div style={{ font: "600 22px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em", textWrap: "pretty" }}>
          Check these details
        </div>
      </div>

      {lowCount > 0 && (
        <div style={{
          padding: "10px 12px", background: "#FBF1DB", borderRadius: 10,
          font: "400 13px/1.45 'IBM Plex Sans'", color: "#7A5A1E", display: "flex", gap: 8,
        }}>
          <Icon name="alert" size={16} color="#7A5A1E" style={{ flexShrink: 0, marginTop: 1 }}/>
          <div>
            {lowCount} value{lowCount > 1 ? "s" : ""} we weren't sure about — highlighted below.
          </div>
        </div>
      )}

      {/* Pay details */}
      <SectionLabel>Pay details</SectionLabel>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E1D8", overflow: "hidden" }}>
        {data.fields.map((f, i) => (
          <FieldRow
            key={f.key} field={f}
            onChange={v => updateField("fields", f.key, { value: v })}
            onShowSource={() => onShowSource && onShowSource(f)}
            aggressive={aggressive}
            isLast={i === data.fields.length - 1}
          />
        ))}
      </div>

      {/* Deductions */}
      <SectionLabel>Deductions</SectionLabel>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E1D8", overflow: "hidden" }}>
        {data.deductions.map((f, i) => (
          <FieldRow
            key={f.key} field={f}
            onChange={v => updateField("deductions", f.key, { value: v })}
            onShowSource={() => onShowSource && onShowSource(f)}
            aggressive={aggressive}
            isLast={i === data.deductions.length - 1}
          />
        ))}
      </div>

      <button onClick={() => onShowSource && onShowSource(null)} style={{
        padding: "12px 14px", background: "transparent", border: "1px solid #E5E1D8", borderRadius: 12,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "#1F3A5F",
        font: "500 14px 'IBM Plex Sans'",
      }}>
        <Icon name="eye" size={18}/> See the original payslip
      </button>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <Button variant="primary" block icon="check" onClick={() => onSave && onSave(data)}>
          Looks right — save
        </Button>
        {!aggressive ? (
          <button onClick={() => setAggressive(true)} style={{
            background: "transparent", border: 0, padding: "10px 12px", cursor: "pointer",
            font: "500 14px 'IBM Plex Sans'", color: "#1F3A5F",
          }}>
            Some of this is wrong — let me fix it
          </button>
        ) : (
          <button onClick={onCancel} style={{
            background: "transparent", border: 0, padding: "10px 12px", cursor: "pointer",
            font: "500 14px 'IBM Plex Sans'", color: "#7A3B33",
          }}>
            This is completely wrong — enter manually instead
          </button>
        )}
      </div>

      <div style={{ padding: "10px 4px 4px", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Icon name="lock" size={14} color="#9B9485" style={{ flexShrink: 0, marginTop: 2 }}/>
        <div style={{ font: "400 12px/1.5 'IBM Plex Sans'", color: "#6B7280", textWrap: "pretty" }}>
          Nothing is saved or compared yet. Confirm above and we'll save the numbers and delete the photo.
        </div>
      </div>
    </div>
  );
};

const SectionLabel = ({ children }) => (
  <div style={{
    paddingLeft: 4, marginTop: 4,
    font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B7280",
  }}>
    {children}
  </div>
);

const FieldRow = ({ field, onChange, onShowSource, isLast, aggressive }) => {
  const isLow = field.confidence === "low";
  const isMoney = field.kind === "money";
  return (
    <div style={{
      padding: "14px 16px", borderBottom: isLast ? 0 : "1px solid #F0ECE2",
      background: isLow ? "#FDF8EC" : "transparent",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>
          {field.label}
        </div>
        <ConfidencePill level={field.confidence}/>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isMoney && <span style={{ font: "500 15px 'IBM Plex Mono'", color: "#6B7280" }}>$</span>}
        <input
          type="text"
          value={field.value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, padding: "10px 12px",
            border: isLow ? "1px solid #E8B04B" : "1px solid #E5E1D8",
            borderRadius: 8, background: "#fff",
            font: isMoney
              ? "500 16px 'IBM Plex Mono', monospace"
              : "500 15px 'IBM Plex Sans'",
            color: "#1A1D24", outline: "none",
            fontVariantNumeric: "tabular-nums",
          }}
        />
      </div>
      {field.note && (
        <div style={{ font: "400 12px/1.4 'IBM Plex Sans'", color: "#7A5A1E", marginTop: 6 }}>
          {field.note}
        </div>
      )}
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        <button onClick={onShowSource} style={{
          background: "transparent", border: 0, padding: 0, cursor: "pointer",
          font: "500 12px 'IBM Plex Sans'", color: "#1F3A5F",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          <Icon name="eye" size={13}/> Where we saw this
        </button>
      </div>
    </div>
  );
};

// ---------- Screen 3: Saved confirmation ----------

const ExtractionSavedScreen = ({ onSeeComparison, onBack, unlockedBefore = 2, unlockedAfter = 3, newUnlocks = ["Full pay comparison"] }) => (
  <div style={{ padding: "40px 20px 24px", display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
    <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%", background: "#E4EDE6",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#385944",
      }}>
        <Icon name="check" size={36} strokeWidth={2}/>
      </div>
    </div>

    <div style={{ textAlign: "center" }}>
      <div style={{ font: "600 24px/1.25 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em", marginBottom: 8, textWrap: "pretty" }}>
        Saved
      </div>
      <div style={{ font: "400 15px/1.55 'IBM Plex Sans'", color: "#6B7280", maxWidth: 320, marginInline: "auto", textWrap: "pretty" }}>
        We'll compare this against your contract, shifts, and what you're owed.
      </div>
    </div>

    {/* Unlocks card */}
    <div style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B7280" }}>
          Your data
        </div>
        <div style={{ font: "500 13px 'IBM Plex Mono'", color: "#385944" }}>
          {unlockedBefore} → {unlockedAfter} of 5
        </div>
      </div>
      <div style={{ font: "500 16px 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 10 }}>
        What's possible now
      </div>
      {newUnlocks.map(u => (
        <div key={u} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%", background: "#E4EDE6", color: "#385944",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon name="check" size={14} strokeWidth={2.5}/>
          </div>
          <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{u}</div>
          <div style={{ marginLeft: "auto", font: "500 11px 'IBM Plex Sans'", color: "#385944", textTransform: "uppercase", letterSpacing: "0.06em" }}>Unlocked</div>
        </div>
      ))}
    </div>

    {/* Deletion note */}
    <div style={{
      padding: "14px 16px", background: "#F5F1E7", borderRadius: 12,
      display: "flex", gap: 10, alignItems: "flex-start",
    }}>
      <Icon name="trash" size={18} color="#6B7280" style={{ flexShrink: 0, marginTop: 1 }}/>
      <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#4B5262", textWrap: "pretty" }}>
        The photo has been deleted. We kept the extracted numbers — you can edit them any time from Your data.
      </div>
    </div>

    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <Button variant="primary" block onClick={onSeeComparison}>See comparison</Button>
      <Button variant="tertiary" block onClick={onBack}>Back to Your data</Button>
    </div>
  </div>
);

// ---------- Bottom sheet: Source preview ----------
// Shows the "original" payslip with a highlighted region.

const SourcePreviewSheet = ({ field, onClose }) => (
  <div style={{
    position: "absolute", inset: 0, background: "rgba(26,29,36,0.55)",
    display: "flex", alignItems: "flex-end", zIndex: 30,
  }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{
      background: "#fff", width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: "10px 20px 24px", maxHeight: "88%", overflow: "auto",
    }}>
      <div style={{ height: 4, width: 36, borderRadius: 2, background: "#E5E1D8", margin: "6px auto 14px" }}/>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div style={{ font: "600 18px 'IBM Plex Sans'", color: "#1A1D24" }}>
          {field ? `Where we saw "${field.label}"` : "Your payslip"}
        </div>
      </div>
      <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#6B7280", marginBottom: 14 }}>
        {field ? `Highlighted below. Tap the value to edit.` : `This image will be deleted once you save.`}
      </div>

      <FauxPayslip highlightCoords={field && field.coords}/>

      <div style={{ marginTop: 16 }}>
        <Button variant="primary" block onClick={onClose}>Done</Button>
      </div>
    </div>
  </div>
);

// A drawn approximation of a payslip — good enough to show provenance UX
// without needing a real image asset.
const FauxPayslip = ({ highlightCoords }) => {
  const W = 330, H = 430;
  return (
    <div style={{
      position: "relative", width: "100%", aspectRatio: `${W}/${H}`,
      background: "#FAF7F2", borderRadius: 8, border: "1px solid #E5E1D8",
      overflow: "hidden", fontFamily: "'IBM Plex Mono', monospace",
      color: "#2A2A2A",
    }}>
      <div style={{ position: "absolute", inset: 0, padding: "6% 6%", fontSize: 9, lineHeight: 1.4 }}>
        {/* Header */}
        <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>SUNSET COAST HOSPITALITY</div>
        <div style={{ borderBottom: "1px solid #D8D2C4", paddingBottom: 6, marginBottom: 8, fontSize: 8, color: "#6B7280" }}>
          Pay advice · ABN 12 345 678 901
        </div>

        <Row l="Employee" r="Apete Tupou"/>
        <Row l="Pay date" r="16 Mar 2026"/>
        <Row l="Period start" r="8 Mar 2026"/>
        <Row l="Period end" r="14 Mar 2026"/>

        <Divider/>
        <Row l="Hours: 35.0 + 24.0 =" r="Rate $20.96"/>
        <Row l="Gross" r="$1,370.24" bold/>
        <Row l="Tax withheld" r="$219.24"/>
        <Row l="Superannuation 11%" r="$150.73"/>

        <Divider label="DEDUCTIONS"/>
        <Row l="Accommodation" r="$185.00"/>
        <Row l="Transport" r="$45.00"/>
        <Row l="Airfare repayment" r="$60.00"/>
        <Row l="Uniform" r="$12.00"/>

        <Divider/>
        <Row l="NET PAY" r="$1,200.00" bold/>
      </div>

      {/* Highlight overlay */}
      {highlightCoords && (
        <div style={{
          position: "absolute",
          left: `${highlightCoords[0] * 100}%`,
          top: `${highlightCoords[1] * 100}%`,
          width: `${(highlightCoords[2] - highlightCoords[0]) * 100}%`,
          height: `${(highlightCoords[3] - highlightCoords[1]) * 100}%`,
          background: "rgba(232,176,75,0.25)",
          border: "2px solid #E8B04B",
          borderRadius: 3,
          boxShadow: "0 0 0 9999px rgba(26,29,36,0.25)",
          pointerEvents: "none",
        }}/>
      )}
    </div>
  );
};

const Row = ({ l, r, bold }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: bold ? 700 : 400 }}>
    <span>{l}</span><span>{r}</span>
  </div>
);

const Divider = ({ label }) => (
  <div style={{ borderTop: "1px solid #D8D2C4", margin: "6px 0 4px", paddingTop: label ? 4 : 0, fontSize: 8, color: "#6B7280", letterSpacing: "0.08em" }}>
    {label}
  </div>
);

// ---------- Upgraded WhySheet — full provenance with edit/delete/wrong ----------

const FieldProvenanceSheet = ({ field, onClose, onEdit, onDelete, onReport }) => (
  <div style={{
    position: "absolute", inset: 0, background: "rgba(26,29,36,0.45)",
    display: "flex", alignItems: "flex-end", zIndex: 30,
  }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{
      background: "#fff", width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: "10px 20px 24px", maxHeight: "88%", overflow: "auto",
    }}>
      <div style={{ height: 4, width: 36, borderRadius: 2, background: "#E5E1D8", margin: "6px auto 14px" }}/>

      <div style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>{field.label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
        <Money amount={parseFloat(String(field.value).replace(/,/g, ""))} size={28} weight={600}/>
        <ConfidencePill level={field.confidence}/>
      </div>

      <div style={{ padding: "14px 16px", background: "#FAF7F2", borderRadius: 12, marginBottom: 14 }}>
        <div style={{ font: "500 12px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B7280", marginBottom: 8 }}>
          Where this came from
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ProvLine k="Source" v="Payslip upload"/>
          <ProvLine k="Uploaded" v="16 Mar 2026"/>
          <ProvLine k="Extracted by" v="Automatic read"/>
          <ProvLine k="Confidence" v={<ConfidencePill level={field.confidence}/>}/>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Button variant="secondary" block icon="eye" onClick={() => { onClose(); /* parent opens source */ }}>
          See on original payslip
        </Button>
        <Button variant="secondary" block icon="pencil" onClick={onEdit}>
          Edit this value
        </Button>
        <button onClick={onReport} style={{
          padding: "12px 14px", background: "transparent", border: 0, cursor: "pointer",
          font: "500 14px 'IBM Plex Sans'", color: "#7A3B33",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Icon name="alert" size={16}/> This value is wrong
        </button>
        <button onClick={onDelete} style={{
          padding: "12px 14px", background: "transparent", border: 0, cursor: "pointer",
          font: "400 13px 'IBM Plex Sans'", color: "#6B7280",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Icon name="trash" size={14}/> Delete this field
        </button>
      </div>
    </div>
  </div>
);

const ProvLine = ({ k, v }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
    <span style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280" }}>{k}</span>
    <span style={{ font: "500 13px 'IBM Plex Sans'", color: "#1A1D24" }}>{v}</span>
  </div>
);

Object.assign(window, {
  UploadChoiceScreen,
  ExtractionPreviewScreen,
  ExtractionSavedScreen,
  SourcePreviewSheet,
  FieldProvenanceSheet,
  ConfidencePill,
  SAMPLE_EXTRACTION,
});
