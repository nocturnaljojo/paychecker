// PayChecker PWA — Bucket E: Bank deposit upload
//
// Clone of Bucket D (Super) row-selection pattern, adapted for bank statements.
//
// Differences from Super:
//  - Match heuristic: row description contains employer name (fuzzy text match)
//  - Pills: green "Employer deposit" (exact), blue "Likely employer" (fuzzy),
//    amber "Other transaction" (no match)
//  - Privacy copy is stronger — bank rows are far more sensitive than super
//    statement rows (rent, groceries, medical, savings, etc.)
//  - Saved screen unlocks comparison 5: Bank reconciliation

const SAMPLE_BANK_STATEMENT = {
  meta: {
    bankName: "ANZ",
    bsb: "012-345",
    accountNumber: "123 456 789",
    accountName: "Apete Tupou",
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    confirmedEmployerName: "Sunset Coast Hospitality Pty Ltd",
    rawFilename: "anz-statement-mar26.pdf",
  },
  rows: [
    // Wage deposits — DEFAULT CHECKED
    { key: "b1",  date: "02 Mar", description: "PAY SUNSET COAST HOSPITALITY",   amount: 1200.00, confidence: "high", match: "exact",  coords: [0.04, 0.16, 0.96, 0.20] },
    { key: "b2",  date: "16 Mar", description: "PAY SUNSET COAST HOSP",          amount: 1200.00, confidence: "med",  match: "fuzzy",  coords: [0.04, 0.20, 0.96, 0.24], note: "Description abbreviated — name partial match" },
    { key: "b3",  date: "30 Mar", description: "PAY SUNSET COAST HOSPITALITY",   amount: 1320.00, confidence: "high", match: "exact",  coords: [0.04, 0.24, 0.96, 0.28] },

    // Other transactions — DEFAULT UNCHECKED
    { key: "b4",  date: "01 Mar", description: "OPENING BALANCE",                 amount: 2010.42, confidence: "high", match: "none", kind: "balance",  coords: [0.04, 0.12, 0.96, 0.16] },
    { key: "b5",  date: "03 Mar", description: "RENT - 14 BAY ST",                amount: -450.00, confidence: "high", match: "none", kind: "outgoing", coords: [0.04, 0.28, 0.96, 0.32] },
    { key: "b6",  date: "05 Mar", description: "WOOLWORTHS METRO",                amount: -84.20,  confidence: "high", match: "none", kind: "outgoing", coords: [0.04, 0.32, 0.96, 0.36] },
    { key: "b7",  date: "08 Mar", description: "TRANSFER FROM SAVINGS",           amount: 200.00,  confidence: "high", match: "none", kind: "incoming", coords: [0.04, 0.36, 0.96, 0.40] },
    { key: "b8",  date: "11 Mar", description: "OPAL TRANSPORT",                  amount: -42.30,  confidence: "high", match: "none", kind: "outgoing", coords: [0.04, 0.40, 0.96, 0.44] },
    { key: "b9",  date: "12 Mar", description: "MEDICARE REFUND",                 amount: 38.50,   confidence: "high", match: "none", kind: "incoming", coords: [0.04, 0.44, 0.96, 0.48] },
    { key: "b10", date: "18 Mar", description: "COLES SUPERMARKETS",              amount: -127.40, confidence: "high", match: "none", kind: "outgoing", coords: [0.04, 0.48, 0.96, 0.52] },
    { key: "b11", date: "20 Mar", description: "MOBILE PMT - OPTUS",              amount: -45.00,  confidence: "high", match: "none", kind: "outgoing", coords: [0.04, 0.52, 0.96, 0.56] },
    { key: "b12", date: "22 Mar", description: "VENMO TUPOU L",                   amount: 80.00,   confidence: "high", match: "none", kind: "incoming", coords: [0.04, 0.56, 0.96, 0.60] },
    { key: "b13", date: "25 Mar", description: "ATM WITHDRAWAL",                  amount: -100.00, confidence: "high", match: "none", kind: "outgoing", coords: [0.04, 0.60, 0.96, 0.64] },
    { key: "b14", date: "31 Mar", description: "CLOSING BALANCE",                 amount: 3200.02, confidence: "high", match: "none", kind: "balance",  coords: [0.04, 0.64, 0.96, 0.68] },
  ],
};

// ---------- Screen 1: Upload choice ----------

const BankUploadChoice = ({ onPick, onBack }) => {
  const [showEmail, setShowEmail] = React.useState(false);
  const forwardAddress = "apete-bank-a7b2@in.paychecker.app";

  return (
    <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "8px 4px 4px" }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>Bank · Bucket E</div>
        <div style={{ font: "600 24px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em" }}>
          Add a bank statement
        </div>
        <div style={{ font: "400 14px/1.5 'IBM Plex Sans'", color: "#6B7280", marginTop: 6, textWrap: "pretty" }}>
          We only need your wage deposits. The rest of your transactions never leave your device.
        </div>
      </div>

      {/* Strong privacy callout up front */}
      <div style={{
        padding: "14px 14px", background: "#1F3A5F", borderRadius: 12, color: "#fff",
        display: "flex", gap: 10, alignItems: "flex-start",
      }}>
        <Icon name="lock" size={18} color="#fff" style={{ flexShrink: 0, marginTop: 1 }}/>
        <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", textWrap: "pretty" }}>
          <strong>We only save your wage deposits.</strong> Bills, transfers, groceries, savings — all stay on your device and are discarded when you save. We never see them.
        </div>
      </div>

      <UploadMethodCard
        icon="file" title="Pick from files"
        desc="PDF from your bank's online portal"
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
        desc="Type wage deposit dates and amounts"
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
          <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>Forward from your bank</div>
          <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>
            {showEmail ? forwardAddress : "Tap to see your address"}
          </div>
        </div>
        <Icon name="chevron" size={18} color="#9B9485"/>
      </button>
    </div>
  );
};

// ---------- Screen 2: Row selection ----------

const BankRowSelection = ({ statement = SAMPLE_BANK_STATEMENT, onSave, onCancel, onShowSource }) => {
  const [rows, setRows] = React.useState(() =>
    statement.rows.map(r => ({ ...r, checked: r.match === "exact" || r.match === "fuzzy" }))
  );

  const toggle = key => setRows(rs => rs.map(r => r.key === key ? { ...r, checked: !r.checked } : r));

  const checkedRows = rows.filter(r => r.checked);
  const totalChecked = checkedRows.reduce((s, r) => s + r.amount, 0);
  const discardedCount = rows.length - checkedRows.length;

  const wageGroup = rows.filter(r => r.match === "exact" || r.match === "fuzzy");
  const otherGroup = rows.filter(r => !(r.match === "exact" || r.match === "fuzzy"));

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
          We read your statement. <span style={{ color: "#6B7280" }}>Found {wageGroup.length} likely wage deposit{wageGroup.length === 1 ? "" : "s"}.</span>
        </div>
      </div>

      <div style={{ padding: "4px 4px 0" }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>
          {statement.meta.bankName} · BSB {statement.meta.bsb} · {statement.meta.rawFilename}
        </div>
        <div style={{ font: "600 22px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em", textWrap: "pretty" }}>
          Confirm wage deposits
        </div>
      </div>

      {/* Strong privacy callout */}
      <div style={{
        padding: "14px 14px", background: "#1F3A5F", borderRadius: 12, color: "#fff",
        display: "flex", gap: 10, alignItems: "flex-start",
      }}>
        <Icon name="lock" size={18} color="#fff" style={{ flexShrink: 0, marginTop: 1 }}/>
        <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", textWrap: "pretty" }}>
          <strong>We only save your wage deposits.</strong> All other transactions stay on your device and are discarded when you save — we never see them.
        </div>
      </div>

      {/* Wage group */}
      {wageGroup.length > 0 && (
        <>
          <SectionLabel>Deposits from {statement.meta.confirmedEmployerName}</SectionLabel>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E1D8", overflow: "hidden" }}>
            {wageGroup.map((r, i) => (
              <BankRow
                key={r.key} row={r}
                onToggle={() => toggle(r.key)}
                onShowSource={() => onShowSource && onShowSource(r)}
                isLast={i === wageGroup.length - 1}
              />
            ))}
          </div>
        </>
      )}

      {/* Other group */}
      {otherGroup.length > 0 && (
        <>
          <SectionLabel>Other transactions · not saved</SectionLabel>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E1D8", overflow: "hidden" }}>
            {otherGroup.map((r, i) => (
              <BankRow
                key={r.key} row={r}
                onToggle={() => toggle(r.key)}
                onShowSource={() => onShowSource && onShowSource(r)}
                isLast={i === otherGroup.length - 1}
              />
            ))}
          </div>
          <div style={{ font: "400 12px/1.45 'IBM Plex Sans'", color: "#6B7280", padding: "0 4px", textWrap: "pretty" }}>
            Spotted a wage we missed? Tick it. Anything you don't tick stays private.
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
            {checkedRows.length} deposit{checkedRows.length === 1 ? "" : "s"} to save
          </div>
          <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#385944", opacity: 0.8, marginTop: 2 }}>
            {discardedCount} discarded · never uploaded
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
          Save {checkedRows.length} deposit{checkedRows.length === 1 ? "" : "s"}
        </Button>
        <Button variant="tertiary" block onClick={onCancel}>Cancel</Button>
      </div>

      <div style={{ padding: "10px 4px 4px", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Icon name="lock" size={14} color="#9B9485" style={{ flexShrink: 0, marginTop: 2 }}/>
        <div style={{ font: "400 12px/1.5 'IBM Plex Sans'", color: "#6B7280", textWrap: "pretty" }}>
          Nothing has been saved. On save, the PDF is deleted and unchecked rows are discarded — they never leave your phone.
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

// ---------- Bank row ----------

const BankRow = ({ row, onToggle, onShowSource, isLast }) => {
  const isLow = row.confidence === "low";
  const negative = row.amount < 0;
  const isBalance = row.kind === "balance";
  const amountStr = `${negative ? "−" : (isBalance ? "" : "+")}$${Math.abs(row.amount).toFixed(2)}`;

  return (
    <div style={{
      padding: "14px 16px", borderBottom: isLast ? 0 : "1px solid #F0ECE2",
      background: isLow && row.checked ? "#FDF8EC" : "transparent",
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
          <div style={{
            font: "500 14px 'IBM Plex Sans'", color: "#1A1D24",
            minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {row.description}
          </div>
          <div style={{
            font: "500 15px 'IBM Plex Mono'",
            color: negative ? "#7A3B33" : (row.match !== "none" ? "#385944" : "#1A1D24"),
            fontVariantNumeric: "tabular-nums", flexShrink: 0,
          }}>
            {amountStr}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
          <div style={{ font: "400 12px 'IBM Plex Mono'", color: "#6B7280" }}>
            {row.date}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {row.match === "exact" && <BankPill tone="green" icon="check">Employer deposit</BankPill>}
          {row.match === "fuzzy" && <BankPill tone="blue"  icon="sparkle">Likely employer</BankPill>}
          {row.match === "none"  && !isBalance && <BankPill tone="amber" icon="lock">Other transaction</BankPill>}
          {isBalance && <BankPill tone="grey" icon="info">Balance line</BankPill>}
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

const BankPill = ({ tone, icon, children }) => {
  const cfg = {
    green: { bg: "#E4EDE6", fg: "#385944" },
    blue:  { bg: "#E8EDF4", fg: "#1F3A5F" },
    amber: { bg: "#FBF1DB", fg: "#7A5A1E" },
    grey:  { bg: "#EFECE3", fg: "#4B5262" },
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

// ---------- Screen 3: Saved ----------

const BankSavedScreen = ({
  onSeeComparison, onBack,
  savedRowCount = 3, discardedCount = 11,
  unlockedBefore = 4, unlockedAfter = 5,
}) => (
  <div style={{ padding: "40px 20px 24px", display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
    <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%", background: "#E4EDE6",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#385944",
      }}>
        <Icon name="check" size={36} strokeWidth={2}/>
      </div>
    </div>

    <div style={{ textAlign: "center" }}>
      <div style={{ font: "600 24px/1.25 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em", marginBottom: 8, textWrap: "pretty" }}>
        {savedRowCount} wage deposit{savedRowCount === 1 ? "" : "s"} saved
      </div>
      <div style={{ font: "400 15px/1.55 'IBM Plex Sans'", color: "#6B7280", maxWidth: 320, marginInline: "auto", textWrap: "pretty" }}>
        {discardedCount} other transaction{discardedCount === 1 ? "" : "s"} discarded — they never left your device.
      </div>
    </div>

    {/* Bank reconciliation unlock */}
    <div style={{ background: "#1F3A5F", borderRadius: 14, padding: 18, color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Icon name="sparkle" size={18} strokeWidth={2}/>
        <div style={{ font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.8 }}>
          Bank reconciliation now possible
        </div>
      </div>
      <div style={{ font: "600 17px/1.3 'IBM Plex Sans'", marginBottom: 12, textWrap: "pretty" }}>
        We can now check what landed in your account against what your payslip says you were paid.
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.15)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
        }}>
          <Icon name="check" size={13} strokeWidth={2.5}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: "500 14px 'IBM Plex Sans'" }}>Comparison 5 · Net pay vs deposits</div>
          <div style={{ font: "400 12px/1.4 'IBM Plex Sans'", opacity: 0.75, marginTop: 2, textWrap: "pretty" }}>
            Did the right amount actually land in your account, on time?
          </div>
        </div>
      </div>
    </div>

    <div style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ font: "500 13px 'IBM Plex Sans'", color: "#1A1D24" }}>Comparisons unlocked</div>
      <div style={{ font: "500 16px 'IBM Plex Mono'", color: "#385944", fontVariantNumeric: "tabular-nums" }}>
        {unlockedBefore} → {unlockedAfter} of 7
      </div>
    </div>

    <div style={{
      padding: "14px 16px", background: "#F5F1E7", borderRadius: 12,
      display: "flex", gap: 10, alignItems: "flex-start",
    }}>
      <Icon name="trash" size={18} color="#6B7280" style={{ flexShrink: 0, marginTop: 1 }}/>
      <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#4B5262", textWrap: "pretty" }}>
        The PDF and every unchecked transaction were removed from your phone. We kept only your wage deposits — nothing else was uploaded.
      </div>
    </div>

    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <Button variant="primary" block onClick={onSeeComparison}>See bank reconciliation</Button>
      <Button variant="tertiary" block onClick={onBack}>Back to Your data</Button>
    </div>
  </div>
);

// ---------- Source preview sheet ----------

const BankSourceSheet = ({ row, onClose }) => (
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
        {row ? `Where we saw "${row.description}"` : "Your bank statement"}
      </div>
      <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#6B7280", marginBottom: 14 }}>
        {row ? "Highlighted row below." : "This PDF will be deleted once you save."}
      </div>
      <FauxBankStatement highlightCoords={row && row.coords}/>
      <div style={{ marginTop: 16 }}>
        <Button variant="primary" block onClick={onClose}>Done</Button>
      </div>
    </div>
  </div>
);

const FauxBankStatement = ({ highlightCoords }) => {
  const rows = SAMPLE_BANK_STATEMENT.rows;
  return (
    <div style={{
      position: "relative", width: "100%", aspectRatio: "330/460",
      background: "#FAF7F2", borderRadius: 8, border: "1px solid #E5E1D8",
      overflow: "hidden", fontFamily: "'IBM Plex Mono', monospace",
      color: "#2A2A2A",
    }}>
      <div style={{ position: "absolute", inset: 0, padding: "5% 5%", fontSize: 8, lineHeight: 1.35 }}>
        <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 2 }}>ANZ</div>
        <div style={{ fontSize: 7, color: "#6B7280", marginBottom: 6 }}>Statement · 1–31 Mar 2026 · BSB 012-345 · Acct 123 456 789</div>
        <div style={{ fontSize: 7, marginBottom: 4 }}>Apete Tupou</div>
        <div style={{ borderBottom: "1px solid #D8D2C4", paddingBottom: 4, marginBottom: 4 }}/>

        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 60px", fontWeight: 700, fontSize: 7, marginBottom: 3, color: "#6B7280" }}>
          <span>DATE</span><span>DESCRIPTION</span><span style={{ textAlign: "right" }}>AMOUNT</span>
        </div>

        {rows.map(r => (
          <div key={r.key} style={{
            display: "grid", gridTemplateColumns: "32px 1fr 60px",
            padding: "1.5px 0", fontSize: 7,
            fontWeight: r.kind === "balance" ? 700 : 400,
          }}>
            <span>{r.date}</span>
            <span style={{ paddingRight: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</span>
            <span style={{ textAlign: "right" }}>
              {r.amount < 0 ? "-" : (r.kind === "balance" ? "" : "+")}${Math.abs(r.amount).toFixed(2)}
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
  BankUploadChoice,
  BankRowSelection,
  BankSavedScreen,
  BankSourceSheet,
  BankRow,
  SAMPLE_BANK_STATEMENT,
});
