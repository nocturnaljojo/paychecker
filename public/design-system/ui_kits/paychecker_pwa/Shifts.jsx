// PayChecker PWA — Workflow B: Shift logging
//
// Low friction is non-negotiable. Daily action. <10 taps to save a shift.
//
// Screens:
//   1. ShiftsListScreen   — grouped by week, FAB, empty state
//   2. LogShiftScreen     — single shift entry
//   3. BatchEntryScreen   — week grid for catch-up logging
//   4. ShiftDetailScreen  — read-only + inline edit + explainers
//
// Auto-inference:
//   - overnight: end < start
//   - day/night type: start >= 18:00 OR crosses midnight → Night
//   - total hours: (end - start) - unpaidBreakMinutes/60
//   - public holiday: date matches PH list (mocked)
//
// Known public holidays (AU 2026, subset for demo):
const PUBLIC_HOLIDAYS = {
  "2026-01-01": "New Year's Day",
  "2026-01-26": "Australia Day",
  "2026-04-03": "Good Friday",
  "2026-04-06": "Easter Monday",
  "2026-04-25": "Anzac Day",
  "2026-12-25": "Christmas Day",
  "2026-12-26": "Boxing Day",
};

// ---------- Shift helpers ----------

const pad = n => String(n).padStart(2, "0");
const parseTime = t => { // "19:00" -> minutes from midnight
  const [h, m] = t.split(":").map(Number); return h * 60 + m;
};
const formatTime = t => t; // already "HH:MM"
const shiftDurationMinutes = (start, end, breakMin = 0) => {
  let s = parseTime(start), e = parseTime(end);
  if (e <= s) e += 24 * 60; // overnight
  return Math.max(0, e - s - breakMin);
};
const formatHours = mins => {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (m === 0) return `${h} hr${h === 1 ? "" : "s"}`;
  return `${h}h ${m}m`;
};
const isOvernight = (start, end) => parseTime(end) <= parseTime(start);
const inferType = (start, end) => {
  const s = parseTime(start);
  if (s >= 18 * 60 || s < 6 * 60) return "night";
  if (isOvernight(start, end)) return "night";
  return "day";
};
const formatDate = iso => {
  const d = new Date(iso);
  const opts = { weekday: "short", day: "numeric", month: "short" };
  return d.toLocaleDateString("en-AU", opts);
};
const formatDayFull = iso => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
};

// Mock shift data — hospitality PALM worker, rolling 2 weeks
const SAMPLE_SHIFTS = [
  // Current week
  { id: "s10", date: "2026-03-14", start: "19:00", end: "02:00", breakMin: 30, type: "night", status: "awaiting" },
  { id: "s9",  date: "2026-03-12", start: "17:00", end: "23:00", breakMin: 30, type: "night", status: "awaiting" },
  { id: "s8",  date: "2026-03-10", start: "11:00", end: "17:30", breakMin: 30, type: "day",   status: "awaiting" },
  // Previous week (linked to processed payslip)
  { id: "s7",  date: "2026-03-08", start: "17:00", end: "23:00", breakMin: 30, type: "night", status: "match" },
  { id: "s6",  date: "2026-03-07", start: "11:00", end: "17:00", breakMin: 30, type: "day",   status: "match" },
  { id: "s5",  date: "2026-03-05", start: "19:00", end: "04:00", breakMin: 30, type: "night", status: "diff", diff: 43.55 },
];

// Group shifts by ISO week-of-year (Mon-starting)
const weekKey = iso => {
  const d = new Date(iso);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
};
const groupByWeek = (shifts) => {
  const out = {};
  for (const s of shifts) {
    const k = weekKey(s.date);
    (out[k] = out[k] || []).push(s);
  }
  return Object.entries(out).sort((a, b) => b[0].localeCompare(a[0]));
};

// ---------- Screen 1: Shifts list ----------

const ShiftsListScreen = ({ shifts = SAMPLE_SHIFTS, onOpenShift, onLog, onBatch }) => {
  const weeks = groupByWeek(shifts);
  const empty = shifts.length === 0;

  if (empty) {
    return (
      <div style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16, height: "100%" }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: "#E8EDF4", color: "#1F3A5F", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="calendar" size={36} strokeWidth={1.5}/>
        </div>
        <div>
          <div style={{ font: "600 22px 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em", marginBottom: 6, textWrap: "pretty" }}>
            No shifts yet
          </div>
          <div style={{ font: "400 15px/1.55 'IBM Plex Sans'", color: "#6B7280", maxWidth: 300, textWrap: "pretty" }}>
            Tap + to add today's shift, or catch up on last week all at once.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", marginTop: 12 }}>
          <Button variant="primary" block icon="plus" onClick={onLog}>Log today's shift</Button>
          <Button variant="secondary" block onClick={onBatch}>Add last week's shifts</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px 100px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "8px 4px 4px" }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>Shifts · Bucket F</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ font: "600 24px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em" }}>
            Your shifts
          </div>
          <button onClick={onBatch} style={{
            background: "transparent", border: 0, padding: "6px 8px", cursor: "pointer",
            font: "500 13px 'IBM Plex Sans'", color: "#1F3A5F",
          }}>Log multiple</button>
        </div>
      </div>

      {weeks.map(([weekStart, ws], i) => {
        const totalMin = ws.reduce((a, s) => a + shiftDurationMinutes(s.start, s.end, s.breakMin), 0);
        const rateEstimate = (totalMin / 60) * 20.96;
        return (
          <div key={weekStart}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              padding: "12px 4px 8px",
            }}>
              <div style={{ font: "500 11px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B7280" }}>
                Week of {formatDate(weekStart)}{i === 0 ? " · this week" : ""}
              </div>
              <div style={{ font: "500 12px 'IBM Plex Mono'", color: "#4B5262", fontVariantNumeric: "tabular-nums" }}>
                {formatHours(totalMin)} · est. ${rateEstimate.toFixed(0)}
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E1D8", overflow: "hidden" }}>
              {ws.map((s, idx) => (
                <ShiftRowCompact key={s.id} shift={s} onClick={() => onOpenShift && onOpenShift(s)} isLast={idx === ws.length - 1}/>
              ))}
            </div>
          </div>
        );
      })}

      {/* FAB */}
      <button onClick={onLog} style={{
        position: "absolute", bottom: 86, right: 20,
        width: 56, height: 56, borderRadius: 28,
        background: "#1F3A5F", color: "#fff", border: 0,
        boxShadow: "0 6px 16px rgba(26,29,36,0.25)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }} aria-label="Log a shift">
        <Icon name="plus" size={26} strokeWidth={2}/>
      </button>
    </div>
  );
};

const ShiftRowCompact = ({ shift, onClick, isLast }) => {
  const mins = shiftDurationMinutes(shift.start, shift.end, shift.breakMin);
  const overnight = isOvernight(shift.start, shift.end);
  const ph = PUBLIC_HOLIDAYS[shift.date];
  return (
    <button onClick={onClick} style={{
      width: "100%", background: "transparent", border: 0, cursor: "pointer",
      padding: "14px 16px", borderBottom: isLast ? 0 : "1px solid #F0ECE2",
      display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", textAlign: "left",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ font: "500 15px 'IBM Plex Sans'", color: "#1A1D24" }}>{formatDate(shift.date)}</span>
          {ph && <Pill tone="coral">PH</Pill>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, font: "400 13px 'IBM Plex Sans'", color: "#6B7280" }}>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontVariantNumeric: "tabular-nums" }}>
            {shift.start}–{shift.end}{overnight && <span style={{ marginLeft: 4, color: "#9B9485" }}>+1</span>}
          </span>
          <span>·</span>
          <span>{formatHours(mins)}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
        <ShiftTypeChip type={shift.type}/>
        <ShiftStatus status={shift.status} diff={shift.diff}/>
      </div>
      <Icon name="chevron" size={18} color="#9B9485"/>
    </button>
  );
};

const ShiftTypeChip = ({ type }) => {
  const cfg = type === "night"
    ? { bg: "#EEEAE0", fg: "#4B5262", label: "Night" }
    : { bg: "#F5F1E7", fg: "#4B5262", label: "Day" };
  return <span style={{
    display: "inline-flex", padding: "2px 8px", borderRadius: 9999,
    background: cfg.bg, color: cfg.fg, font: "500 11px 'IBM Plex Sans'",
  }}>{cfg.label}</span>;
};

const ShiftStatus = ({ status, diff }) => {
  if (!status || status === "awaiting") return null;
  if (status === "match")
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, font: "500 11px 'IBM Plex Sans'", color: "#385944" }}>
      <Icon name="check" size={11} strokeWidth={2.5}/> Matches
    </span>;
  if (status === "diff")
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, font: "500 11px 'IBM Plex Sans'", color: "#7A5A1E" }}>
      <Icon name="alert" size={11}/> +${diff?.toFixed(2)}
    </span>;
  return null;
};

// ---------- Screen 2: Log a shift ----------

const LogShiftScreen = ({ onSave, onSaveAndNext, onCancel, defaults = {} }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = React.useState(defaults.date || today);
  const [start, setStart] = React.useState(defaults.start || "09:00");
  const [end, setEnd] = React.useState(defaults.end || "17:00");
  const [breakMin, setBreakMin] = React.useState(defaults.breakMin ?? 30);
  const [type, setType] = React.useState(null); // null = auto
  const [phOverride, setPhOverride] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [showNotes, setShowNotes] = React.useState(false);

  const overnight = isOvernight(start, end);
  const autoType = inferType(start, end);
  const resolvedType = type || autoType;
  const mins = shiftDurationMinutes(start, end, breakMin);
  const ph = PUBLIC_HOLIDAYS[date];
  const isPh = phOverride || !!ph;

  const snap15 = (t) => {
    const [h, m] = t.split(":").map(Number);
    const snapped = Math.round(m / 15) * 15;
    if (snapped === 60) return `${pad(h + 1)}:00`;
    return `${pad(h)}:${pad(snapped)}`;
  };

  const save = (andNext) => {
    const shift = { date, start: snap15(start), end: snap15(end), breakMin, type: resolvedType, isPh, notes };
    (andNext ? onSaveAndNext : onSave)?.(shift);
  };

  return (
    <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: "4px 4px 0" }}>
        <div style={{ font: "600 22px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em" }}>
          Log a shift
        </div>
      </div>

      {/* Date */}
      <Field label="Date">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={inputStyle}/>
        <div style={hintStyle}>{formatDayFull(date)}</div>
      </Field>

      {/* Time row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Start">
          <input type="time" value={start} onChange={e => setStart(e.target.value)} step="900"
            style={{ ...inputStyle, fontFamily: "'IBM Plex Mono'", fontSize: 18, fontVariantNumeric: "tabular-nums" }}/>
        </Field>
        <Field label="End">
          <input type="time" value={end} onChange={e => setEnd(e.target.value)} step="900"
            style={{ ...inputStyle, fontFamily: "'IBM Plex Mono'", fontSize: 18, fontVariantNumeric: "tabular-nums" }}/>
        </Field>
      </div>

      {/* Summary */}
      <div style={{
        padding: "12px 14px", background: "#F5F1E7", borderRadius: 10,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ font: "400 13px 'IBM Plex Sans'", color: "#6B7280" }}>
          {overnight ? "Overnight shift — crosses midnight." : "Same day"}
        </div>
        <div style={{ font: "600 15px 'IBM Plex Mono'", color: "#1A1D24", fontVariantNumeric: "tabular-nums" }}>
          {formatHours(mins)} paid
        </div>
      </div>

      {/* Break */}
      <Field label="Unpaid break">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[0, 15, 30, 45, 60].map(n => (
            <ChoiceChip key={n} selected={breakMin === n} onClick={() => setBreakMin(n)}>
              {n === 0 ? "None" : `${n} min`}
            </ChoiceChip>
          ))}
          <ChoiceChip selected={![0, 15, 30, 45, 60].includes(breakMin)} onClick={() => setBreakMin(20)}>
            Other
          </ChoiceChip>
        </div>
      </Field>

      {/* Type */}
      <Field label="Shift type" hint={type === null ? `Auto: ${autoType}` : null}>
        <div style={{ display: "flex", gap: 8 }}>
          <ChoiceChip selected={resolvedType === "day"} onClick={() => setType("day")}>
            Day
          </ChoiceChip>
          <ChoiceChip selected={resolvedType === "night"} onClick={() => setType("night")}>
            Night
          </ChoiceChip>
        </div>
      </Field>

      {/* PH */}
      {ph && (
        <div style={{
          padding: "12px 14px", background: "#F5E1DE", borderRadius: 10,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#7A3B33" }}>{ph}</div>
            <div style={{ font: "400 12px/1.4 'IBM Plex Sans'", color: "#7A3B33", opacity: 0.8, marginTop: 2 }}>
              Public holiday rates apply.
            </div>
          </div>
          <Pill tone="coral">PH</Pill>
        </div>
      )}

      {/* Notes */}
      {!showNotes ? (
        <button onClick={() => setShowNotes(true)} style={{
          padding: "10px 0", background: "transparent", border: 0, cursor: "pointer",
          font: "500 14px 'IBM Plex Sans'", color: "#1F3A5F", textAlign: "left",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <Icon name="plus" size={16}/> Add a note
        </button>
      ) : (
        <Field label="Note">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Anything worth remembering…"
            style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}/>
        </Field>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <Button variant="primary" block icon="check" onClick={() => save(false)}>Save shift</Button>
        <Button variant="secondary" block onClick={() => save(true)}>Save and log another</Button>
        <Button variant="tertiary" block onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <label style={{ font: "500 13px 'IBM Plex Sans'", color: "#1A1D24" }}>{label}</label>
      {hint && <span style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280" }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const inputStyle = {
  padding: "12px 14px", border: "1px solid #E5E1D8", borderRadius: 10,
  background: "#fff", font: "500 15px 'IBM Plex Sans'", color: "#1A1D24",
  outline: "none", width: "100%", boxSizing: "border-box",
};
const hintStyle = { font: "400 12px 'IBM Plex Sans'", color: "#6B7280", marginTop: 4 };

const ChoiceChip = ({ selected, onClick, children }) => (
  <button onClick={onClick} style={{
    padding: "10px 14px", borderRadius: 9999, cursor: "pointer",
    background: selected ? "#1F3A5F" : "#fff",
    color: selected ? "#fff" : "#1A1D24",
    border: selected ? "1px solid #1F3A5F" : "1px solid #E5E1D8",
    font: "500 13px 'IBM Plex Sans'",
    minHeight: 36,
  }}>{children}</button>
);

// ---------- Screen 3: Batch entry ----------

const BatchEntryScreen = ({ onSave, onCancel, weekStart = "2026-03-09" }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const [shifts, setShifts] = React.useState({}); // date -> {start,end,breakMin}
  const [expanded, setExpanded] = React.useState(null);

  const update = (date, patch) => setShifts(s => ({ ...s, [date]: { ...(s[date] || { start: "17:00", end: "23:00", breakMin: 30 }), ...patch } }));
  const clear = (date) => setShifts(s => { const n = { ...s }; delete n[date]; return n; });

  const count = Object.keys(shifts).length;

  return (
    <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "4px 4px 0" }}>
        <div style={{ font: "600 22px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em" }}>
          Log multiple shifts
        </div>
        <div style={{ font: "400 14px/1.5 'IBM Plex Sans'", color: "#6B7280", marginTop: 6 }}>
          Week of {formatDate(weekStart)} · tap a day to add a shift.
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E1D8", overflow: "hidden" }}>
        {days.map((d, i) => {
          const s = shifts[d];
          const open = expanded === d;
          const ph = PUBLIC_HOLIDAYS[d];
          return (
            <div key={d} style={{ borderBottom: i === 6 ? 0 : "1px solid #F0ECE2" }}>
              <button onClick={() => { setExpanded(open ? null : d); if (!s) update(d, {}); }} style={{
                width: "100%", padding: "14px 16px", background: open ? "#F5F1E7" : "transparent",
                border: 0, cursor: "pointer", textAlign: "left",
                display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 14, alignItems: "center",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: s ? "#1F3A5F" : "#F5F1E7",
                  color: s ? "#fff" : "#1A1D24",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  font: "500 10px 'IBM Plex Sans'", letterSpacing: "0.04em",
                }}>
                  <span style={{ fontSize: 9, opacity: 0.85, textTransform: "uppercase" }}>
                    {new Date(d).toLocaleDateString("en-AU", { weekday: "short" })}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {new Date(d).getDate()}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>
                    {new Date(d).toLocaleDateString("en-AU", { weekday: "long" })}
                  </div>
                  {s ? (
                    <div style={{ font: "500 12px 'IBM Plex Mono'", color: "#4B5262", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                      {s.start}–{s.end} · {formatHours(shiftDurationMinutes(s.start, s.end, s.breakMin))}
                    </div>
                  ) : (
                    <div style={{ font: "400 12px 'IBM Plex Sans'", color: "#9B9485", marginTop: 2 }}>
                      Tap to add
                    </div>
                  )}
                </div>
                {ph && <Pill tone="coral">PH</Pill>}
                <Icon name={open ? "chevron" : "plus"} size={18} color="#9B9485" style={{ transform: open ? "rotate(90deg)" : "", transition: "transform 120ms" }}/>
              </button>
              {open && s && (
                <div style={{ padding: "10px 16px 16px", display: "flex", flexDirection: "column", gap: 10, background: "#F5F1E7" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Start">
                      <input type="time" value={s.start} onChange={e => update(d, { start: e.target.value })} step="900"
                        style={{ ...inputStyle, fontFamily: "'IBM Plex Mono'", fontSize: 16 }}/>
                    </Field>
                    <Field label="End">
                      <input type="time" value={s.end} onChange={e => update(d, { end: e.target.value })} step="900"
                        style={{ ...inputStyle, fontFamily: "'IBM Plex Mono'", fontSize: 16 }}/>
                    </Field>
                  </div>
                  <Field label="Unpaid break">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[0, 15, 30, 45, 60].map(n => (
                        <ChoiceChip key={n} selected={s.breakMin === n} onClick={() => update(d, { breakMin: n })}>
                          {n === 0 ? "None" : `${n}m`}
                        </ChoiceChip>
                      ))}
                    </div>
                  </Field>
                  <button onClick={() => { clear(d); setExpanded(null); }} style={{
                    background: "transparent", border: 0, padding: "6px 0", cursor: "pointer",
                    font: "500 13px 'IBM Plex Sans'", color: "#7A3B33", textAlign: "left",
                  }}>Remove this day</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <Button variant="primary" block icon="check" onClick={() => onSave && onSave(shifts)} disabled={count === 0}>
          {count === 0 ? "Add a shift to continue" : `Save all ${count} shift${count === 1 ? "" : "s"}`}
        </Button>
        <Button variant="tertiary" block onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

// ---------- Screen 4: Shift detail ----------

const ShiftDetailScreen = ({ shift = SAMPLE_SHIFTS[0], onBack, onEdit, onDelete, onNeverHappened }) => {
  const mins = shiftDurationMinutes(shift.start, shift.end, shift.breakMin);
  const overnight = isOvernight(shift.start, shift.end);
  const type = shift.type || inferType(shift.start, shift.end);
  const ph = PUBLIC_HOLIDAYS[shift.date];

  return (
    <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "4px 4px 0" }}>
        <div style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280", marginBottom: 4 }}>Shift</div>
        <div style={{ font: "600 22px/1.2 'IBM Plex Sans'", color: "#1A1D24", letterSpacing: "-0.005em" }}>
          {formatDayFull(shift.date)}
        </div>
      </div>

      {/* Summary card */}
      <div style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 14, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div style={{
            font: "600 28px/1 'IBM Plex Mono'", color: "#1A1D24", fontVariantNumeric: "tabular-nums",
          }}>
            {shift.start}–{shift.end}
            {overnight && <span style={{ fontSize: 14, color: "#6B7280", marginLeft: 6 }}>(+1)</span>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <ShiftTypeChip type={type}/>
            {ph && <Pill tone="coral">PH</Pill>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SummaryRow k="Duration" v={`${formatHours(mins + shift.breakMin)} (${shift.breakMin}m unpaid)`}/>
          <SummaryRow k="Paid hours" v={formatHours(mins)}/>
        </div>
      </div>

      {/* Comparison */}
      {shift.status === "diff" && (
        <div style={{
          padding: "14px 16px", background: "#FBF1DB", borderRadius: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Icon name="alert" size={16} color="#7A5A1E"/>
            <span style={{ font: "500 14px 'IBM Plex Sans'", color: "#7A5A1E" }}>Difference on payslip</span>
          </div>
          <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#7A5A1E" }}>
            Payslip shows ${((mins / 60) * 20.96 - shift.diff).toFixed(2)} for this shift. Expected ${((mins / 60) * 20.96).toFixed(2)}. <strong>+${shift.diff?.toFixed(2)}</strong>
          </div>
        </div>
      )}
      {shift.status === "match" && (
        <div style={{
          padding: "12px 14px", background: "#E4EDE6", borderRadius: 10,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Icon name="check" size={16} color="#385944"/>
          <span style={{ font: "500 13px 'IBM Plex Sans'", color: "#385944" }}>Matches payslip</span>
        </div>
      )}

      {/* Explainer */}
      <div style={{ background: "#F5F1E7", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon name="info" size={16} color="#4B5262"/>
          <span style={{ font: "500 13px 'IBM Plex Sans'", color: "#1A1D24" }}>Why "{type === "night" ? "Night" : "Day"}"?</span>
        </div>
        <div style={{ font: "400 13px/1.5 'IBM Plex Sans'", color: "#4B5262", textWrap: "pretty" }}>
          {type === "night"
            ? overnight
              ? "Starts after 6pm and crosses midnight — night shift."
              : "Starts at 6pm or later — night shift."
            : "Starts between 6am and 6pm — day shift."}
          {" "}You can override this when editing.
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        <Button variant="primary" block icon="pencil" onClick={onEdit}>Edit shift</Button>
        <Button variant="tertiary" block onClick={onNeverHappened}>This shift never happened</Button>
        <button onClick={onDelete} style={{
          background: "transparent", border: 0, padding: "10px 12px", cursor: "pointer",
          font: "400 13px 'IBM Plex Sans'", color: "#6B7280",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Icon name="trash" size={14}/> Delete this shift
        </button>
      </div>
    </div>
  );
};

const SummaryRow = ({ k, v }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
    <span style={{ font: "400 14px 'IBM Plex Sans'", color: "#6B7280" }}>{k}</span>
    <span style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24", fontVariantNumeric: "tabular-nums" }}>{v}</span>
  </div>
);

Object.assign(window, {
  ShiftsListScreen, LogShiftScreen, BatchEntryScreen, ShiftDetailScreen,
  SAMPLE_SHIFTS, PUBLIC_HOLIDAYS,
});
