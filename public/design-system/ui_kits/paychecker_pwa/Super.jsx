// PayChecker PWA — Bucket D: Super statement upload
//
// Reuses Workflow C (Payslip) components wholesale. Deltas only:
//   - SuperUploadChoice       — same 4 paths, copy tuned for super statements
//   - SuperRowSelection       — extraction preview with row-level checkboxes
//                                (default-check rows matching confirmed employer)
//   - SuperSavedScreen        — highlights newly unlocked comparisons (6 and/or 7)
//
// Key behavioural differences from payslip flow:
//   - A statement can contain rows from multiple employers (and rollovers, rollins,
//     fees, insurance, interest). Only CONTRIBUTION rows from the confirmed
//     employer save to the data model. Everything else is discarded at save time.
//   - Each saveable row re-uses ConfidencePill + "Where we saw this" pattern.
//   - Raw PDF/photo is deleted at save, same as payslip.

// ---------- Fake extracted super statement ----------
// Spans a full year, so includes non-employer noise: rollover from old fund,
// a rollin from spouse split, admin fees, insurance premium, investment earnings.

const SAMPLE_SUPER_STATEMENT = {
  meta: {
    fundName: "AustralianSuper",
    memberName: "Apete Tupou",
    memberNumber: "1234 5678",
    periodStart: "2025-07-01",
    periodEnd: "2026-03-31",
    confirmedEmployerName: "Sunset Coast Hospitality Pty Ltd",
    confirmedEmployerABN: "12 345 678 901",
    rawFilename: "austsuper-statement-mar26.pdf",
  },
  rows: [
    // Employer contributions — DEFAULT CHECKED
    { key: "r1", date: "16 Jul 2025",  type: "Employer contribution", source: "Sunset Coast Hospitality Pty Ltd", sourceRef: "ABN 12 345 678 901", amount: 142.10, confidence: "high",  employerMatch: "exact",   coords: [0.06, 0.18, 0.96, 0.23] },
    { key: "r2", date: "13 Aug 2025",  type: "Employer contribution", source: "Sunset Coast Hospitality Pty Ltd", sourceRef: "ABN 12 345 678 901", amount: 156.44, confidence: "high",  employerMatch: "exact",   coords: [0.06, 0.23, 0.96, 0.28] },
    { key: "r3", date: "15 Oct 2025",  type: "Employer contribution", source: "SUNSET COAST HOSP PL",             sourceRef: "ABN 12 345 678 901", amount: 163.20, confidence: "med",   employerMatch: "fuzzy",   coords: [0.06, 0.28, 0.96, 0.33], note: "Payer name abbreviated — ABN matches" },
    { key: "r4", date: "12 Nov 2025",  type: "Employer contribution", source: "Sunset Coast Hospitality Pty Ltd", sourceRef: "ABN 12 345 678 901", amount: 150.73, confidence: "high",  employerMatch: "exact",   coords: [0.06, 0.33, 0.96, 0.38] },
    { key: "r5", date: "17 Dec 2025",  type: "Employer contribution", source: "Sunset Coast Hospitality Pty Ltd", sourceRef: "ABN 12 345 678 901", amount: 150.73, confidence: "high",  employerMatch: "exact",   coords: [0.06, 0.38, 0.96, 0.43] },
    { key: "r6", date: "14 Jan 2026",  type: "Employer contribution", source: "Sunset Coast Hospitality Pty Ltd", sourceRef: "ABN 12 345 678 901", amount: 140.06, confidence: "high",  employerMatch: "exact",   coords: [0.06, 0.43, 0.96, 0.48] },
    { key: "r7", date: "18 Feb 2026",  type: "Employer contribution", source: "Sunset Coast Hospitality Pty Ltd", sourceRef: "ABN 12 345 678 901", amount: 150.73, confidence: "high",  employerMatch: "exact",   coords: [0.06, 0.48, 0.96, 0.53] },
    { key: "r8", date: "16 Mar 2026",  type: "Employer contribution", source: "Sunset Coast Hospitality Pty Ltd", sourceRef: "ABN 12 345 678 901", amount: 150.73, confidence: "low",  employerMatch: "exact",    coords: [0.06, 0.53, 0.96, 0.58], note: "Faint line in scan" },

    // Ambiguous — another hospitality employer. ABN does not match — DEFAULT UNCHECKED.
    { key: "r9", date: "04 Sep 2025",  type: "Employer contribution", source: "Coastal Dining Group Pty Ltd",     sourceRef: "ABN 98 765 432 100", amount: 88.40,  confidence: "high",  employerMatch: "none",    coords: [0.06, 0.58, 0.96, 0.63] },

    // Non-contribution rows — DEFAULT UNCHECKED.
    { key: "r10", date: "01 Jul 2025", type: "Rollover in",           source: "HostPlus Super",                   sourceRef: "Prior fund",         amount: 4320.18, confidence: "high", employerMatch: "none",    coords: [0.06, 0.63, 0.96, 0.68] },
    { key: "r11", date: "31 Jul 2025", type: "Admin fee",             source: "AustralianSuper",                  sourceRef: "Monthly charge",     amount: -7.50,   confidence: "high", employerMatch: "none",    coords: [0.06, 0.68, 0.96, 0.73] },
    { key: "r12", date: "31 Dec 2025", type: "Insurance premium",     source: "TAL Life",                         sourceRef: "Default cover",      amount: -18.40,  confidence: "high", employerMatch: "none",    coords: [0.06, 0.73, 0.96, 0.78] },
    { key: "r13", date: "30 Jun 2026", type: "Investment earnings",   source: "AustralianSuper",                  sourceRef: "FY allocation",      amount: 214.66,  confidence: "high", employerMatch: "none",    coords: [0.06, 0.78, 0.96, 0.83] },
  ],
};

// ---------- Screen 1: Upload choice (thin wrapper over UploadChoiceScreen) ----------

const SuperUploadChoice = ({ onPick, onBack }) => {
  const [showEmail, setShowEmail] = React.useState(false);
  const forwardAddress = "apete-super-a7b2@in.paychecker.app";

  return (
    <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "8px 4px 4px" }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>Super · Bucket D</div>
        <div style={{ font: "600 24px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em" }}>
          Add a super statement
        </div>
        <div style={{ font: "400 14px/1.5 'IBM Plex Sans'", color: "#6B7280", marginTop: 6, textWrap: "pretty" }}>
          Annual or quarterly statements work best. We'll pull out your employer contributions — the rest stays private.
        </div>
      </div>

      <UploadMethodCard
        icon="file" title="Pick from files"
        desc="PDF from your super fund's member portal"
        onClick={() => onPick("file")}
        primary
      />
      <UploadMethodCard
        icon="camera" title="Take a photo"
        desc="Paper statement or screenshot"
        onClick={() => onPick("photo")}
      />
      <UploadMethodCard
        icon="keyboard" title="Enter manually"
        desc="Type contribution amounts and dates"
        onClick={() => onPick("manual")}
      />

      <button onClick={() => setShowEmail(v => !v)} style={{
        marginTop: 4, padding: "14px 16px", background: "transparent",
        border: "1px solid #E5E1D8", borderRadius: 12, cursor: "pointer", textAlign: "left",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: "#F5F1E7",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280", flexShrink: 0,
        }}>
          <Icon name="mail" size={18} strokeWidth={1.75}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>Forward from your fund</div>
          <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>
            {showEmail ? forwardAddress : "Tap to see your address"}
          </div>
        </div>
        <Icon name="chevron" size={18} color="#9B9485"/>
      </button>

      {/* Privacy affordance */}
      <div style={{
        padding: "12px 14px", background: "#F5F1E7", borderRadius: 12,
        display: "flex", gap: 10, alignItems: "flex-start", marginTop: 4,
      }}>
        <Icon name="lock" size={16} color="#6B7280" style={{ flexShrink: 0, marginTop: 2 }}/>
        <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#4B5262", textWrap: "pretty" }}>
          Only <strong>employer contributions</strong> will be saved. Rollovers, fees, insurance and investment earnings stay on your device and are never uploaded.
        </div>
      </div>
    </div>
  );
};

// ---------- Screen 2: Row selection ----------

const SuperRowSelection = ({ statement = SAMPLE_SUPER_STATEMENT, onSave, onCancel, onShowSource }) => {
  // Default-check: rows where employerMatch is "exact" or "fuzzy" (confirmed employer).
  const [rows, setRows] = React.useState(() =>
    statement.rows.map(r => ({ ...r, checked: r.employerMatch === "exact" || r.employerMatch === "fuzzy" }))
  );

  const toggle = key => setRows(rs => rs.map(r => r.key === key ? { ...r, checked: !r.checked } : r));

  const checkedRows = rows.filter(r => r.checked);
  const totalChecked = checkedRows.reduce((s, r) => s + r.amount, 0);
  const discardedCount = rows.length - checkedRows.length;

  // Group rows: confirmed-employer contributions first, then everything else.
  const employerGroup = rows.filter(r => r.type === "Employer contribution" && (r.employerMatch === "exact" || r.employerMatch === "fuzzy"));
  const otherGroup = rows.filter(r => !(r.type === "Employer contribution" && (r.employerMatch === "exact" || r.employerMatch === "fuzzy")));

  return (
    <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Sparkline header */}
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
          We read your statement and found <strong>{rows.length} rows</strong>. <span style={{ color: "#6B7280" }}>Check which to save.</span>
        </div>
      </div>

      <div style={{ padding: "4px 4px 0" }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>
          {statement.meta.fundName} · {statement.meta.rawFilename}
        </div>
        <div style={{ font: "600 22px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em", textWrap: "pretty" }}>
          Confirm what to save
        </div>
      </div>

      {/* Only-contributions affordance */}
      <div style={{
        padding: "12px 14px", background: "#FAF7F2", border: "1px solid #E5E1D8",
        borderRadius: 12, display: "flex", gap: 10, alignItems: "flex-start",
      }}>
        <Icon name="lock" size={16} color="#4B5262" style={{ flexShrink: 0, marginTop: 2 }}/>
        <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#4B5262", textWrap: "pretty" }}>
          <strong>Only employer contributions save.</strong> Other rows (rollovers, fees, insurance, earnings) are discarded at save time and never leave your device.
        </div>
      </div>

      {/* Confirmed employer group */}
      {employerGroup.length > 0 && (
        <>
          <SectionLabel>Contributions from {statement.meta.confirmedEmployerName}</SectionLabel>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E1D8", overflow: "hidden" }}>
            {employerGroup.map((r, i) => (
              <SuperRow
                key={r.key} row={r}
                onToggle={() => toggle(r.key)}
                onShowSource={() => onShowSource && onShowSource(r)}
                isLast={i === employerGroup.length - 1}
                isEmployerMatch
              />
            ))}
          </div>
        </>
      )}

      {/* Everything else */}
      {otherGroup.length > 0 && (
        <>
          <SectionLabel>Other rows · not saved by default</SectionLabel>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E1D8", overflow: "hidden" }}>
            {otherGroup.map((r, i) => (
              <SuperRow
                key={r.key} row={r}
                onToggle={() => toggle(r.key)}
                onShowSource={() => onShowSource && onShowSource(r)}
                isLast={i === otherGroup.length - 1}
                isEmployerMatch={false}
              />
            ))}
          </div>
          <div style={{ font: "400 12px/1.45 'IBM Plex Sans'", color: "#6B7280", padding: "0 4px", textWrap: "pretty" }}>
            Got another employer or side contributions? Check the rows you want to save.
          </div>
        </>
      )}

      <button onClick={() => onShowSource && onShowSource(null)} style={{
        padding: "12px 14px", background: "transparent", border: "1px solid #E5E1D8", borderRadius: 12,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "#1F3A5F",
        font: "500 14px 'IBM Plex Sans'",
      }}>
        <Icon name="eye" size={18}/> See the original statement
      </button>

      {/* Selection summary */}
      <div style={{
        padding: "14px 16px", background: "#E4EDE6", borderRadius: 12,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ font: "500 13px 'IBM Plex Sans'", color: "#385944" }}>
            {checkedRows.length} row{checkedRows.length === 1 ? "" : "s"} to save
          </div>
          <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#385944", opacity: 0.8, marginTop: 2 }}>
            {discardedCount} discarded
          </div>
        </div>
        <div style={{
          font: "500 18px 'IBM Plex Mono'", color: "#385944",
          fontVariantNumeric: "tabular-nums",
        }}>
          ${totalChecked.toFixed(2)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        <Button variant="primary" block icon="check" onClick={() => onSave && onSave(checkedRows)}>
          Save {checkedRows.length} contribution{checkedRows.length === 1 ? "" : "s"}
        </Button>
        <Button variant="tertiary" block onClick={onCancel}>Cancel</Button>
      </div>

      <div style={{ padding: "10px 4px 4px", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Icon name="lock" size={14} color="#9B9485" style={{ flexShrink: 0, marginTop: 2 }}/>
        <div style={{ font: "400 12px/1.5 'IBM Plex Sans'", color: "#6B7280", textWrap: "pretty" }}>
          Nothing has been saved yet. On save, the PDF is deleted and unchecked rows are discarded.
        </div>
      </div>
    </div>
  );
};

// Reused from Payslip.jsx — small inline version.
const SectionLabel = ({ children }) => (
  <div style={{
    paddingLeft: 4, marginTop: 4,
    font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B7280",
  }}>
    {children}
  </div>
);

// ---------- Super row ----------

const SuperRow = ({ row, onToggle, onShowSource, isLast, isEmployerMatch }) => {
  const isLow = row.confidence === "low";
  const negative = row.amount < 0;
  const amountStr = `${negative ? "−" : ""}$${Math.abs(row.amount).toFixed(2)}`;

  return (
    <div style={{
      padding: "14px 16px", borderBottom: isLast ? 0 : "1px solid #F0ECE2",
      background: isLow && row.checked ? "#FDF8EC" : "transparent",
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        aria-label={row.checked ? "Uncheck row" : "Check row"}
        style={{
          marginTop: 2,
          width: 22, height: 22, borderRadius: 6,
          background: row.checked ? "#1F3A5F" : "#fff",
          border: row.checked ? "1px solid #1F3A5F" : "1px solid #C7C1B2",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0, padding: 0,
        }}
      >
        {row.checked && <Icon name="check" size={14} color="#fff" strokeWidth={3}/>}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1 — type + amount */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
          <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>
            {row.type}
          </div>
          <div style={{
            font: "500 15px 'IBM Plex Mono'", color: negative ? "#7A3B33" : "#1A1D24",
            fontVariantNumeric: "tabular-nums",
          }}>
            {amountStr}
          </div>
        </div>

        {/* Row 2 — source + date */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
          <div style={{ font: "400 13px/1.4 'IBM Plex Sans'", color: "#6B7280", minWidth: 0, textWrap: "pretty" }}>
            {row.source}
            <span style={{ color: "#9B9485" }}> · {row.sourceRef}</span>
          </div>
          <div style={{ font: "400 12px 'IBM Plex Mono'", color: "#6B7280", flexShrink: 0 }}>
            {row.date}
          </div>
        </div>

        {/* Row 3 — pills */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <ConfidencePill level={row.confidence}/>
          {row.employerMatch === "exact" && (
            <MatchPill tone="green" icon="check">Employer match</MatchPill>
          )}
          {row.employerMatch === "fuzzy" && (
            <MatchPill tone="blue" icon="sparkle">Likely match</MatchPill>
          )}
          {row.employerMatch === "none" && isEmployerMatch === false && row.type === "Employer contribution" && (
            <MatchPill tone="amber" icon="alert">Different employer</MatchPill>
          )}
          <button onClick={onShowSource} style={{
            marginLeft: "auto",
            background: "transparent", border: 0, padding: 0, cursor: "pointer",
            font: "500 12px 'IBM Plex Sans'", color: "#1F3A5F",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <Icon name="eye" size={13}/> Where we saw this
          </button>
        </div>

        {row.note && (
          <div style={{ font: "400 12px/1.4 'IBM Plex Sans'", color: "#7A5A1E", marginTop: 6 }}>
            {row.note}
          </div>
        )}
      </div>
    </div>
  );
};

const MatchPill = ({ tone, icon, children }) => {
  const cfg = {
    green: { bg: "#E4EDE6", fg: "#385944" },
    blue:  { bg: "#E8EDF4", fg: "#1F3A5F" },
    amber: { bg: "#FBF1DB", fg: "#7A5A1E" },
  }[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 9999,
      background: cfg.bg, color: cfg.fg,
      font: "500 11px 'IBM Plex Sans'", whiteSpace: "nowrap",
    }}>
      <Icon name={icon} size={11} strokeWidth={2.5}/>
      {children}
    </span>
  );
};

// ---------- Screen 3: Saved confirmation ----------
// Super-specific: highlights comparisons 6 (Super owed vs paid) and 7 (Super
// paid on time) becoming possible once statement data lands.

const SuperSavedScreen = ({
  onSeeComparison, onBack,
  savedRowCount = 8, discardedCount = 5,
  unlockedBefore = 3, unlockedAfter = 5,
  newUnlocks = [
    { label: "Super owed vs paid",    sub: "Compare statement contributions against payslip super line" },
    { label: "Super paid on time",    sub: "Check each payment landed within 28 days of quarter-end" },
  ],
}) => (
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
        {savedRowCount} contribution{savedRowCount === 1 ? "" : "s"} saved
      </div>
      <div style={{ font: "400 15px/1.55 'IBM Plex Sans'", color: "#6B7280", maxWidth: 320, marginInline: "auto", textWrap: "pretty" }}>
        {discardedCount} non-employer row{discardedCount === 1 ? "" : "s"} discarded. PDF deleted.
      </div>
    </div>

    {/* Super verification unlock — the big headline */}
    <div style={{ background: "#1F3A5F", borderRadius: 14, padding: 18, color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon name="sparkle" size={18} strokeWidth={2}/>
        <div style={{ font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.8 }}>
          Super verification now possible
        </div>
      </div>
      <div style={{ font: "600 17px/1.3 'IBM Plex Sans'", marginBottom: 12, textWrap: "pretty" }}>
        Your fund's record is now the ground truth we check employer-reported super against.
      </div>
      {newUnlocks.map(u => (
        <div key={u.label} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.15)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
          }}>
            <Icon name="check" size={13} strokeWidth={2.5}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: "500 14px 'IBM Plex Sans'" }}>{u.label}</div>
            <div style={{ font: "400 12px/1.4 'IBM Plex Sans'", opacity: 0.75, marginTop: 2, textWrap: "pretty" }}>{u.sub}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Counter card */}
    <div style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ font: "500 13px 'IBM Plex Sans'", color: "#1A1D24" }}>Comparisons unlocked</div>
      <div style={{ font: "500 16px 'IBM Plex Mono'", color: "#385944", fontVariantNumeric: "tabular-nums" }}>
        {unlockedBefore} → {unlockedAfter} of 7
      </div>
    </div>

    {/* Deletion + privacy note */}
    <div style={{
      padding: "14px 16px", background: "#F5F1E7", borderRadius: 12,
      display: "flex", gap: 10, alignItems: "flex-start",
    }}>
      <Icon name="trash" size={18} color="#6B7280" style={{ flexShrink: 0, marginTop: 1 }}/>
      <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#4B5262", textWrap: "pretty" }}>
        The statement PDF and every unchecked row were removed. We kept only your employer contributions — nothing else.
      </div>
    </div>

    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <Button variant="primary" block onClick={onSeeComparison}>See super comparison</Button>
      <Button variant="tertiary" block onClick={onBack}>Back to Your data</Button>
    </div>
  </div>
);

// ---------- Source preview sheet for super statement ----------
// Faux super statement document, highlights the selected row.

const SuperSourceSheet = ({ row, onClose }) => (
  <div style={{
    position: "absolute", inset: 0, background: "rgba(26,29,36,0.55)",
    display: "flex", alignItems: "flex-end", zIndex: 30,
  }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{
      background: "#fff", width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: "10px 20px 24px", maxHeight: "88%", overflow: "auto",
    }}>
      <div style={{ height: 4, width: 36, borderRadius: 2, background: "#E5E1D8", margin: "6px auto 14px" }}/>
      <div style={{ font: "600 18px 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 6 }}>
        {row ? `Where we saw "${row.type}"` : "Your super statement"}
      </div>
      <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#6B7280", marginBottom: 14 }}>
        {row ? "Highlighted row below." : "This PDF will be deleted once you save."}
      </div>
      <FauxSuperStatement highlightCoords={row && row.coords}/>
      <div style={{ marginTop: 16 }}>
        <Button variant="primary" block onClick={onClose}>Done</Button>
      </div>
    </div>
  </div>
);

const FauxSuperStatement = ({ highlightCoords }) => {
  const rows = SAMPLE_SUPER_STATEMENT.rows;
  return (
    <div style={{
      position: "relative", width: "100%", aspectRatio: "330/460",
      background: "#FAF7F2", borderRadius: 8, border: "1px solid #E5E1D8",
      overflow: "hidden", fontFamily: "'IBM Plex Mono', monospace",
      color: "#2A2A2A",
    }}>
      <div style={{ position: "absolute", inset: 0, padding: "5% 5%", fontSize: 8, lineHeight: 1.35 }}>
        <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 2 }}>AustralianSuper</div>
        <div style={{ fontSize: 7, color: "#6B7280", marginBottom: 6 }}>Member statement · 1 Jul 2025 – 31 Mar 2026</div>
        <div style={{ fontSize: 7, color: "#2A2A2A", marginBottom: 2 }}>Apete Tupou · Member 1234 5678</div>
        <div style={{ borderBottom: "1px solid #D8D2C4", paddingBottom: 4, marginBottom: 4 }}/>

        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 60px", fontWeight: 700, fontSize: 7, marginBottom: 3, color: "#6B7280" }}>
          <span>DATE</span><span>DETAIL</span><span style={{ textAlign: "right" }}>AMOUNT</span>
        </div>

        {rows.map(r => (
          <div key={r.key} style={{ display: "grid", gridTemplateColumns: "50px 1fr 60px", padding: "1.5px 0", fontSize: 7 }}>
            <span>{r.date}</span>
            <span style={{ paddingRight: 4 }}>{r.type} · {r.source}</span>
            <span style={{ textAlign: "right", fontWeight: r.type === "Employer contribution" ? 600 : 400 }}>
              {r.amount < 0 ? "-" : ""}${Math.abs(r.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

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

Object.assign(window, {
  SuperUploadChoice,
  SuperRowSelection,
  SuperSavedScreen,
  SuperSourceSheet,
  SuperRow,
  SAMPLE_SUPER_STATEMENT,
});
