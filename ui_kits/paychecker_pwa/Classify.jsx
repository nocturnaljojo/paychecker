// PayChecker PWA — Document classification safety net
//
// Workers will sometimes upload the wrong doc to the wrong bucket, or not be
// sure what they have. This module adds four safety nets:
//
//   1. UniversalUploadChoice    — "Add a document" entry, any file type
//   2. ClassifyResult           — "This looks like a [payslip]" confirm/override
//   3. WrongBucketBanner        — amber banner when extraction doesn't match
//                                  the bucket the worker chose
//   4. MoveBucketSheet          — from any saved doc: re-classify into another
//                                  bucket, preserving original upload timestamp
//   5. WhatDoYouHaveSheet       — "Not sure what you have?" reference card
//
// Classification never blocks save. Confidence is always visible. The worker
// always has final say.
//
// Classification patterns the AI looks for (in-order, more specific wins):
//   super     : "Superannuation guarantee contribution", fund name, member number
//   payslip   : "Gross pay", "ordinary hours", "YTD", employer letterhead
//   bank      : transaction list + BSB/account number
//   contract  : "Offer of employment", terms, signature block

// ---------- Bucket catalog (shared) ----------
// Matches YourData.BUCKETS ids. Kept here to avoid hard dep on YourData.jsx
// during standalone rendering (e.g. classification.html preview).

const DOC_BUCKETS = [
  { key: "contract",  id: "A", name: "Contract",           shortName: "Contract",        icon: "file",   color: "#1F3A5F" },
  { key: "payslips",  id: "B", name: "Payslips",           shortName: "Payslip",         icon: "file",   color: "#385944" },
  { key: "shifts",    id: "C", name: "Shifts",             shortName: "Shift log",       icon: "calendar", color: "#7A5A1E" },
  { key: "super",     id: "D", name: "Super statements",   shortName: "Super statement", icon: "wallet", color: "#4B5262" },
  { key: "bank",      id: "E", name: "Bank deposits",      shortName: "Bank statement",  icon: "wallet", color: "#7A3B33" },
];

// Non-shift buckets — shifts isn't a doc you upload, it's a log.
const UPLOADABLE_BUCKETS = DOC_BUCKETS.filter(b => b.key !== "shifts");

const getBucket = key => DOC_BUCKETS.find(b => b.key === key);

// ---------- Sample classification result ----------
// What the AI returned after looking at the extracted text.
// Shown in the classify screen and in the wrong-bucket banner.

const SAMPLE_CLASSIFICATIONS = {
  // Clear payslip
  payslip_high: {
    topGuess: "payslips", confidence: "high", confidencePct: 96,
    signals: [
      `Found "Gross pay" and "Net pay"`,
      `Pay period 8–14 Mar 2026`,
      `"Ordinary hours 35.0" matches payslip pattern`,
    ],
    alts: [
      { key: "super", pct: 3 }, { key: "contract", pct: 1 },
    ],
  },
  // Clear super statement
  super_high: {
    topGuess: "super", confidence: "high", confidencePct: 94,
    signals: [
      `Fund name: AustralianSuper`,
      `"Superannuation guarantee contribution" on 8 rows`,
      `Member number format detected`,
    ],
    alts: [
      { key: "payslips", pct: 4 }, { key: "bank", pct: 2 },
    ],
  },
  // Bank statement uploaded to payslip bucket — mismatch
  bank_as_payslip: {
    topGuess: "bank", confidence: "high", confidencePct: 91,
    signals: [
      `Transaction list with 47 rows`,
      `BSB 062-001 and account number detected`,
      `"Opening balance" / "Closing balance" pattern`,
    ],
    alts: [
      { key: "payslips", pct: 6 }, { key: "super", pct: 3 },
    ],
  },
  // Medium confidence — payslip, but faint scan
  payslip_med: {
    topGuess: "payslips", confidence: "med", confidencePct: 74,
    signals: [
      `Found "Gross" and "Tax withheld"`,
      `Employer name partially readable`,
      `Some numbers unclear`,
    ],
    alts: [
      { key: "super", pct: 18 }, { key: "contract", pct: 8 },
    ],
  },
  // Low confidence — AI genuinely unsure
  ambiguous: {
    topGuess: "payslips", confidence: "low", confidencePct: 52,
    signals: [
      `Some number columns detected`,
      `No clear employer letterhead`,
      `Document layout is unusual`,
    ],
    alts: [
      { key: "super", pct: 31 }, { key: "bank", pct: 12 }, { key: "contract", pct: 5 },
    ],
  },
  // Unsupported — AI can't tell what this is
  unsupported: {
    topGuess: null, confidence: "none", confidencePct: 0,
    signals: [
      `Image is blurry or low resolution`,
      `No matching document patterns found`,
    ],
    alts: [],
  },
};

// ---------- 1. Universal upload choice ----------
// Entry point: "Add a document" without choosing a bucket first.

const UniversalUploadChoice = ({ onPick, onBack, onShowHelp }) => {
  return (
    <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "8px 4px 4px" }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>Add anything</div>
        <div style={{ font: "600 24px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em" }}>
          Add a document
        </div>
        <div style={{ font: "400 14px/1.5 'IBM Plex Sans'", color: "#6B7280", marginTop: 6, textWrap: "pretty" }}>
          Not sure what it is? That's fine — we'll read it and tell you. You confirm before anything's saved.
        </div>
      </div>

      <UploadMethodCard
        icon="upload" title="Upload a file"
        desc="Any PDF, image or screenshot"
        onClick={() => onPick("file")}
        primary
      />
      <UploadMethodCard
        icon="camera" title="Take a photo"
        desc="Snap whatever you've got on paper"
        onClick={() => onPick("photo")}
      />

      <button onClick={onShowHelp} style={{
        marginTop: 6, padding: "14px 16px", background: "#FAF7F2",
        border: "1px solid #E5E1D8", borderRadius: 12, cursor: "pointer", textAlign: "left",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: "#E8EDF4",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#1F3A5F", flexShrink: 0,
        }}>
          <Icon name="help" size={18} strokeWidth={1.75}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>Not sure what you have?</div>
          <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>See examples of each document type</div>
        </div>
        <Icon name="chevron" size={18} color="#9B9485"/>
      </button>

      <div style={{
        marginTop: 8, padding: "12px 14px", background: "#F0F4F8", borderRadius: 12,
        display: "flex", gap: 10, alignItems: "flex-start",
      }}>
        <Icon name="sparkle" size={16} color="#1F3A5F" style={{ flexShrink: 0, marginTop: 2 }}/>
        <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#1A1D24", textWrap: "pretty" }}>
          After you upload, we'll identify the type and ask you to confirm. You can override us any time.
        </div>
      </div>
    </div>
  );
};

// ---------- 2. ClassifyResult screen ----------
// AI guessed. Worker confirms or overrides.

const ClassifyResult = ({
  classification = SAMPLE_CLASSIFICATIONS.payslip_high,
  onConfirm, onOverride, onCancel, onShowHelp, filename = "document.pdf",
}) => {
  const topBucket = classification.topGuess ? getBucket(classification.topGuess) : null;
  const [selected, setSelected] = React.useState(classification.topGuess);
  const unsupported = classification.confidence === "none";
  const low = classification.confidence === "low";

  return (
    <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* AI did work */}
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
          We read <span style={{ color: "#6B7280" }}>{filename}</span>.
        </div>
      </div>

      {/* Headline */}
      <div style={{ padding: "4px 4px 0" }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>
          {unsupported ? "We couldn't identify this" : "This looks like a…"}
        </div>
        {!unsupported && topBucket ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
            <div style={{
              font: "600 28px/1.15 'IBM Plex Sans'", color: "#1A1D24",
              letterSpacing: "-0.01em", textWrap: "balance",
            }}>
              {topBucket.shortName}
            </div>
            <ConfidencePill level={classification.confidence}/>
          </div>
        ) : (
          <div style={{ font: "600 22px/1.25 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em", textWrap: "pretty", marginTop: 4 }}>
            Sorry — we can't read this document
          </div>
        )}
      </div>

      {/* Low-confidence hint */}
      {low && (
        <div style={{
          padding: "10px 12px", background: "#FBF1DB", borderRadius: 10,
          font: "400 13px/1.45 'IBM Plex Sans'", color: "#7A5A1E", display: "flex", gap: 8,
        }}>
          <Icon name="alert" size={16} color="#7A5A1E" style={{ flexShrink: 0, marginTop: 1 }}/>
          <div>We're not very sure. Please pick the right category below.</div>
        </div>
      )}

      {/* Signals — why we think that */}
      {classification.signals.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E1D8", padding: "14px 16px" }}>
          <div style={{
            font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em",
            color: "#6B7280", marginBottom: 10,
          }}>
            {unsupported ? "What we saw" : "Why we think that"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {classification.signals.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  width: 4, height: 4, borderRadius: "50%", background: "#9B9485",
                  flexShrink: 0, marginTop: 8,
                }}/>
                <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#1A1D24", textWrap: "pretty" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bucket chips */}
      <SectionLabel>{unsupported ? "Pick a category" : "Is that right?"}</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {UPLOADABLE_BUCKETS.map(b => {
          const isSelected = selected === b.key;
          const isTopGuess = classification.topGuess === b.key;
          const alt = classification.alts.find(a => a.key === b.key);
          return (
            <button
              key={b.key}
              onClick={() => setSelected(b.key)}
              style={{
                padding: "14px 16px",
                background: isSelected ? "#E8EDF4" : "#fff",
                border: isSelected ? "1.5px solid #1F3A5F" : "1px solid #E5E1D8",
                borderRadius: 12, cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 12,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: isSelected ? "#1F3A5F" : "#F5F1E7",
                color: isSelected ? "#fff" : "#4B5262",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon name={b.icon} size={18} strokeWidth={1.75}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ font: "500 15px 'IBM Plex Sans'", color: "#1A1D24" }}>{b.name}</div>
                  {isTopGuess && !unsupported && (
                    <span style={{
                      font: "500 10px 'IBM Plex Mono'", color: "#385944",
                      textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>
                      Our guess
                    </span>
                  )}
                </div>
                {alt && alt.pct > 0 && !isTopGuess && (
                  <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>
                    {alt.pct}% chance
                  </div>
                )}
              </div>
              {isSelected && (
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", background: "#1F3A5F",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name="check" size={14} strokeWidth={2.5}/>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button onClick={onShowHelp} style={{
        marginTop: 2, background: "transparent", border: 0, padding: "8px 4px", cursor: "pointer",
        font: "500 13px 'IBM Plex Sans'", color: "#1F3A5F", display: "inline-flex", alignItems: "center", gap: 6,
        alignSelf: "flex-start",
      }}>
        <Icon name="help" size={15}/> Not sure what you have?
      </button>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <Button
          variant="primary" block icon="check"
          onClick={() => selected === classification.topGuess
            ? onConfirm && onConfirm(selected)
            : onOverride && onOverride(selected)}
          disabled={!selected}
        >
          {selected === classification.topGuess && !unsupported
            ? "Yes, save as " + (topBucket ? topBucket.shortName.toLowerCase() : "…")
            : selected
              ? "Save as " + (getBucket(selected).shortName.toLowerCase())
              : "Pick a category"}
        </Button>
        <Button variant="tertiary" block onClick={onCancel}>Cancel</Button>
      </div>

      <div style={{ padding: "10px 4px 4px", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Icon name="lock" size={14} color="#9B9485" style={{ flexShrink: 0, marginTop: 2 }}/>
        <div style={{ font: "400 12px/1.5 'IBM Plex Sans'", color: "#6B7280", textWrap: "pretty" }}>
          Nothing's saved yet. After you confirm, we'll extract the numbers and delete the original.
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

// ---------- 3. Wrong-bucket banner ----------
// Slotted into bucket-specific upload flows (payslip, super, bank) after
// extraction, when the AI thinks this doesn't belong here.

const WrongBucketBanner = ({
  chosenBucket = "payslips",
  detectedBucket = "bank",
  confidencePct = 91,
  onMove, onDismiss,
}) => {
  const chosen = getBucket(chosenBucket);
  const detected = getBucket(detectedBucket);
  if (!detected) return null;
  return (
    <div style={{
      padding: "14px 14px 12px", background: "#FBF1DB",
      border: "1px solid #E8B04B", borderRadius: 12,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Icon name="alert" size={18} color="#7A5A1E" style={{ flexShrink: 0, marginTop: 1 }}/>
        <div style={{ flex: 1 }}>
          <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#7A5A1E", marginBottom: 4 }}>
            This looks like a {detected.shortName.toLowerCase()}, not a {chosen.shortName.toLowerCase()}.
          </div>
          <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#7A5A1E", textWrap: "pretty", opacity: 0.9 }}>
            We're {confidencePct}% sure based on what we read. You can move it to the right bucket, or keep saving here.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, paddingLeft: 28 }}>
        <button onClick={onMove} style={{
          padding: "8px 14px", background: "#1F3A5F", color: "#fff", border: 0, borderRadius: 8,
          font: "500 13px 'IBM Plex Sans'", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          Move to {detected.name}
          <Icon name="chevron" size={14} color="#fff"/>
        </button>
        <button onClick={onDismiss} style={{
          padding: "8px 14px", background: "transparent", color: "#7A5A1E", border: 0,
          font: "500 13px 'IBM Plex Sans'", cursor: "pointer",
        }}>
          Keep here
        </button>
      </div>
    </div>
  );
};

// ---------- 4. Move between buckets sheet ----------
// Opened from a saved doc's edit menu: "Not the right category?"

const MoveBucketSheet = ({
  doc = { title: "Payslip · 16 Mar 2026", currentBucket: "payslips", uploadedAt: "16 Mar 2026" },
  onMove, onClose,
}) => {
  const [target, setTarget] = React.useState(null);
  const current = getBucket(doc.currentBucket);

  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(26,29,36,0.45)",
      display: "flex", alignItems: "flex-end", zIndex: 30,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: "10px 20px 24px", maxHeight: "88%", overflow: "auto",
      }}>
        <div style={{ height: 4, width: 36, borderRadius: 2, background: "#E5E1D8", margin: "6px auto 14px" }}/>

        <div style={{ font: "600 18px 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 4 }}>
          Not the right category?
        </div>
        <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#6B7280", marginBottom: 14, textWrap: "pretty" }}>
          Currently in <strong>{current.name}</strong>. Move to another bucket and we'll re-run the comparisons it affects.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {UPLOADABLE_BUCKETS.filter(b => b.key !== doc.currentBucket).map(b => {
            const isSelected = target === b.key;
            return (
              <button
                key={b.key}
                onClick={() => setTarget(b.key)}
                style={{
                  padding: "14px 16px",
                  background: isSelected ? "#E8EDF4" : "#fff",
                  border: isSelected ? "1.5px solid #1F3A5F" : "1px solid #E5E1D8",
                  borderRadius: 12, cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 12,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: isSelected ? "#1F3A5F" : "#F5F1E7",
                  color: isSelected ? "#fff" : "#4B5262",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon name={b.icon} size={18} strokeWidth={1.75}/>
                </div>
                <div style={{ flex: 1, font: "500 15px 'IBM Plex Sans'", color: "#1A1D24" }}>
                  Move to {b.name}
                </div>
                {isSelected && (
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", background: "#1F3A5F",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name="check" size={14} strokeWidth={2.5}/>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{
          padding: "12px 14px", background: "#F5F1E7", borderRadius: 12, marginBottom: 14,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <Icon name="info" size={16} color="#4B5262" style={{ flexShrink: 0, marginTop: 2 }}/>
          <div style={{ font: "400 12px/1.5 'IBM Plex Sans'", color: "#4B5262", textWrap: "pretty" }}>
            The original upload timestamp ({doc.uploadedAt}) is kept. The move is logged in your event history.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button variant="primary" block disabled={!target} onClick={() => onMove && onMove(target)}>
            {target ? `Move to ${getBucket(target).name}` : "Pick a destination"}
          </Button>
          <Button variant="tertiary" block onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};

// ---------- Move confirmation screen ----------
// Shown after a successful move — lists affected comparisons and preview of
// the event-history entry.

const MoveConfirmationScreen = ({
  fromBucket = "payslips", toBucket = "bank",
  docTitle = "Transactions · Mar 2026",
  uploadedAt = "16 Mar 2026 · 14:22",
  affected = [
    { label: "Full pay comparison",    action: "recalculating" },
    { label: "Bank reconciliation",    action: "newly possible" },
  ],
  onBack,
}) => {
  const from = getBucket(fromBucket);
  const to = getBucket(toBucket);
  return (
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
        <div style={{ font: "600 22px/1.25 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em", marginBottom: 8, textWrap: "pretty" }}>
          Moved to {to.name}
        </div>
        <div style={{ font: "400 14px/1.55 'IBM Plex Sans'", color: "#6B7280", maxWidth: 320, marginInline: "auto", textWrap: "pretty" }}>
          "{docTitle}" is now filed under the right bucket.
        </div>
      </div>

      {/* From → To chip */}
      <div style={{
        background: "#fff", border: "1px solid #E5E1D8", borderRadius: 14, padding: 14,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: "#F5F1E7", color: "#9B9485",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name={from.icon} size={18}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "500 13px 'IBM Plex Sans'", color: "#9B9485", textDecoration: "line-through" }}>{from.name}</div>
        </div>
        <Icon name="chevron" size={16} color="#9B9485"/>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: "#E8EDF4", color: "#1F3A5F",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name={to.icon} size={18}/>
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
          <div style={{ font: "600 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{to.name}</div>
        </div>
      </div>

      {/* Affected comparisons */}
      <div style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 14, padding: 18 }}>
        <div style={{
          font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em",
          color: "#6B7280", marginBottom: 12,
        }}>
          Affected comparisons
        </div>
        {affected.map(a => (
          <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: a.action === "newly possible" ? "#E4EDE6" : "#F0F4F8",
              color: a.action === "newly possible" ? "#385944" : "#1F3A5F",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon name={a.action === "newly possible" ? "check" : "sparkle"} size={12} strokeWidth={2.5}/>
            </div>
            <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24", flex: 1 }}>{a.label}</div>
            <div style={{
              font: "500 11px 'IBM Plex Sans'", textTransform: "uppercase", letterSpacing: "0.06em",
              color: a.action === "newly possible" ? "#385944" : "#1F3A5F",
            }}>
              {a.action}
            </div>
          </div>
        ))}
      </div>

      {/* Event history preview */}
      <div style={{ background: "#FAF7F2", border: "1px solid #E5E1D8", borderRadius: 14, padding: 14 }}>
        <div style={{
          font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em",
          color: "#6B7280", marginBottom: 10,
        }}>
          Logged in your history
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: "#5C8F6B",
            flexShrink: 0, marginTop: 8,
          }}/>
          <div style={{ flex: 1 }}>
            <div style={{ font: "500 13px 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 2 }}>
              Document moved · {from.name} → {to.name}
            </div>
            <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280" }}>
              Today · 14:24 · Original upload {uploadedAt}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "auto" }}>
        <Button variant="primary" block onClick={onBack}>Back to Your data</Button>
      </div>
    </div>
  );
};

// ---------- 5. "Not sure what you have?" help sheet ----------

const DOC_EXAMPLES = [
  {
    bucket: "payslips",
    label: "Payslip",
    desc: "Employer letterhead, pay period dates, hours worked, gross and net amounts.",
    example: { header: "SUNSET COAST HOSPITALITY", lines: ["Pay period: 8–14 Mar 2026", "Hours: 35.0", "Gross: $1,370.24", "Tax: $219.24", "Net: $1,200.00"], bold: 4 },
  },
  {
    bucket: "super",
    label: "Super statement",
    desc: "Super fund name and a list of contributions from your employer.",
    example: { header: "AustralianSuper · Member 1234 5678", lines: ["16 Jul  Employer contrib  $142.10", "13 Aug  Employer contrib  $156.44", "15 Oct  Employer contrib  $163.20", "12 Nov  Employer contrib  $150.73"], bold: null },
  },
  {
    bucket: "bank",
    label: "Bank statement",
    desc: "Transaction list with deposits and withdrawals. BSB and account number at the top.",
    example: { header: "ANZ · BSB 012-345 · Acct 123 456 789", lines: ["13 Mar  OPENING BAL       $2,010.42", "16 Mar  PAY SUNSET COAST  +$1,200.00", "18 Mar  WOOLWORTHS        -$ 84.20", "20 Mar  RENT PMT          -$ 450.00"], bold: 1 },
  },
  {
    bucket: "contract",
    label: "Contract",
    desc: "Signed offer of employment or agreement — has terms, dates and a signature block.",
    example: { header: "OFFER OF EMPLOYMENT", lines: ["Position: Kitchen assistant", "Start date: 1 May 2025", "Base rate: $25.40 / hr", "Signed: A. Tupou  ✓"], bold: 3 },
  },
];

const WhatDoYouHaveSheet = ({ onClose, onPick }) => (
  <div style={{
    position: "absolute", inset: 0, background: "rgba(26,29,36,0.55)",
    display: "flex", alignItems: "flex-end", zIndex: 30,
  }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{
      background: "#FAF7F2", width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: "10px 20px 24px", maxHeight: "92%", overflow: "auto",
    }}>
      <div style={{ height: 4, width: 36, borderRadius: 2, background: "#E5E1D8", margin: "6px auto 14px" }}/>
      <div style={{ font: "600 20px 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 6 }}>
        Not sure what you have?
      </div>
      <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#6B7280", marginBottom: 16, textWrap: "pretty" }}>
        Here's what each document looks like. Tap one to use it as a guide.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {DOC_EXAMPLES.map(e => (
          <DocExampleCard key={e.bucket} example={e} onPick={() => onPick && onPick(e.bucket)}/>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <Button variant="secondary" block onClick={onClose}>Got it</Button>
      </div>
    </div>
  </div>
);

const DocExampleCard = ({ example, onPick }) => {
  const bucket = getBucket(example.bucket);
  return (
    <button onClick={onPick} style={{
      background: "#fff", border: "1px solid #E5E1D8", borderRadius: 14, padding: 14,
      textAlign: "left", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      {/* Tiny fake doc thumbnail */}
      <div style={{
        width: 80, minHeight: 100, background: "#FAF7F2", border: "1px solid #E5E1D8",
        borderRadius: 6, padding: "6px 6px", flexShrink: 0, fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 5.5, lineHeight: 1.35, color: "#2A2A2A", overflow: "hidden",
      }}>
        <div style={{ fontWeight: 700, fontSize: 6, marginBottom: 2, textWrap: "balance" }}>
          {example.example.header}
        </div>
        <div style={{ borderBottom: "1px solid #D8D2C4", margin: "2px 0" }}/>
        {example.example.lines.map((l, i) => (
          <div key={i} style={{
            fontWeight: i === example.example.bold ? 700 : 400,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {l}
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ font: "600 15px 'IBM Plex Sans'", color: "#1A1D24" }}>{example.label}</div>
          <span style={{
            font: "500 10px 'IBM Plex Mono'", color: "#9B9485",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            Bucket {bucket.id}
          </span>
        </div>
        <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#6B7280", textWrap: "pretty" }}>
          {example.desc}
        </div>
      </div>
      <Icon name="chevron" size={18} color="#9B9485" style={{ alignSelf: "center", flexShrink: 0 }}/>
    </button>
  );
};

// ---------- Universal Add card (for Your data screen) ----------
// Primary CTA above the bucket list.

const UniversalAddCard = ({ onAdd, onShowHelp }) => (
  <div style={{
    background: "#1F3A5F", borderRadius: 16, padding: 18, color: "#fff",
    boxShadow: "0 2px 6px rgba(31,58,95,0.18)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <Icon name="sparkle" size={16}/>
      <div style={{
        font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em",
        opacity: 0.8,
      }}>
        Easiest way
      </div>
    </div>
    <div style={{ font: "600 20px/1.2 'IBM Plex Sans'", marginBottom: 6, textWrap: "pretty" }}>
      Add a document
    </div>
    <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", opacity: 0.85, marginBottom: 14, textWrap: "pretty" }}>
      Upload anything — payslip, super statement, bank statement, contract. We'll identify it and ask you to confirm.
    </div>
    <div style={{ display: "flex", gap: 10 }}>
      <button onClick={onAdd} style={{
        padding: "12px 16px", background: "#fff", color: "#1F3A5F", border: 0, borderRadius: 10,
        font: "500 14px 'IBM Plex Sans'", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "center",
      }}>
        <Icon name="upload" size={16}/> Add document
      </button>
      <button onClick={onShowHelp} aria-label="What do you have?" style={{
        width: 44, height: 44, background: "rgba(255,255,255,0.12)", color: "#fff",
        border: 0, borderRadius: 10, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon name="help" size={18}/>
      </button>
    </div>
  </div>
);

Object.assign(window, {
  UniversalUploadChoice,
  ClassifyResult,
  WrongBucketBanner,
  MoveBucketSheet,
  MoveConfirmationScreen,
  WhatDoYouHaveSheet,
  UniversalAddCard,
  DOC_BUCKETS,
  UPLOADABLE_BUCKETS,
  SAMPLE_CLASSIFICATIONS,
});
