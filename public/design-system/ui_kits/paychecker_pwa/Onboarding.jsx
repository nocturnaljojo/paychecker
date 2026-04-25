// PayChecker PWA — Onboarding flow v2 (educational, not data-entry)
// Six screens that ORIENT the worker. Data collection happens later via
// the "Your data" bucket status screen. Target: Apete, ESL, first-time use.

const ONB2_TOTAL = 6;

// Shared shell ---------------------------------------------------------------

const Obv2Progress = ({ cur, total }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    {Array.from({ length: total }).map((_, i) => (
      <span key={i} style={{
        width: i + 1 === cur ? 22 : 7, height: 7, borderRadius: 999,
        background: i + 1 === cur ? "#1F3A5F" : i + 1 < cur ? "#9BB5C4" : "#D8D1BF",
        transition: "width 200ms cubic-bezier(.2,.6,.2,1)",
      }}/>
    ))}
    <span style={{ font: "500 12px 'IBM Plex Sans'", color: "#6B7280", marginLeft: 4 }}>
      {cur} of {total}
    </span>
  </div>
);

const Obv2Top = ({ step, onBack, onSkip }) => (
  <div style={{
    height: 56, display: "grid", gridTemplateColumns: "48px 1fr auto", alignItems: "center",
    padding: "0 8px", background: "#FAF7F2", borderBottom: "1px solid #EEEAE0",
    position: "sticky", top: 0, zIndex: 5,
  }}>
    <div>{onBack ? <IconButton icon="chevronL" ariaLabel="Back" onClick={onBack}/> : <span/>}</div>
    <div style={{ display: "flex", justifyContent: "center" }}>
      <Obv2Progress cur={step} total={ONB2_TOTAL}/>
    </div>
    <div style={{ paddingRight: 8 }}>
      {onSkip && (
        <button onClick={onSkip} style={{
          background: "transparent", border: 0, padding: "10px 6px",
          font: "500 14px 'IBM Plex Sans'", color: "#6B7280", cursor: "pointer",
        }}>Skip</button>
      )}
    </div>
  </div>
);

const Obv2Body = ({ eyebrow, title, subtitle, children, footer }) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
    <div style={{ flex: 1, overflow: "auto", padding: "20px 24px 16px" }}>
      {eyebrow && <div style={{ font: "500 12px 'IBM Plex Mono'", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6B7280", marginBottom: 10 }}>{eyebrow}</div>}
      {title && <h1 style={{ margin: 0, font: "600 26px/1.2 'IBM Plex Sans'", color: "#1A1D24", textWrap: "pretty" }}>{title}</h1>}
      {subtitle && <p style={{ margin: "10px 0 0", font: "400 16px/1.5 'IBM Plex Sans'", color: "#4B5262", textWrap: "pretty" }}>{subtitle}</p>}
      <div style={{ marginTop: 22 }}>{children}</div>
    </div>
    <div style={{ padding: "12px 20px 22px", borderTop: "1px solid #EEEAE0", background: "#FAF7F2" }}>
      {footer}
    </div>
  </div>
);

// ---------- Small reusable cards ----------

const IconTile = ({ icon, tone = "navy" }) => {
  const tones = {
    navy:  { bg: "#E1E7EF", fg: "#1F3A5F" },
    sage:  { bg: "#E4EDE6", fg: "#385944" },
    amber: { bg: "#FBF1DB", fg: "#7A5A1E" },
  }[tone];
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, background: tones.bg, color: tones.fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon name={icon} size={22} strokeWidth={1.75}/>
    </div>
  );
};

const InfoCard = ({ icon, tone, title, body }) => (
  <div style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 14, padding: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
    <IconTile icon={icon} tone={tone}/>
    <div style={{ flex: 1 }}>
      <div style={{ font: "600 15px 'IBM Plex Sans'", color: "#1A1D24" }}>{title}</div>
      <div style={{ font: "400 14px/1.45 'IBM Plex Sans'", color: "#4B5262", marginTop: 3, textWrap: "pretty" }}>{body}</div>
    </div>
  </div>
);

// ---------- Screen 1: Welcome ----------

const Obv2Welcome = ({ onNext, onReturn, onSkip }) => (
  <>
    <Obv2Top step={1} onSkip={onSkip}/>
    <Obv2Body
      eyebrow="Welcome to PayChecker"
      title="What your pay should be, what it is, and whether the two line up."
      subtitle="Six short screens. No forms yet — we'll just show you how it works."
      footer={
        <>
          <Button variant="primary" block onClick={onNext}>Show me how it works</Button>
          <div style={{ height: 10 }}/>
          <Button variant="tertiary" block onClick={onReturn}>I already know — let me in</Button>
        </>
      }>
      <div style={{ display: "flex", justifyContent: "center", padding: "20px 0 10px" }}>
        <div style={{ width: 92, height: 92, borderRadius: 24, background: "#1F3A5F", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(31,58,95,0.25)" }}>
          <Icon name="wallet" size={44} strokeWidth={1.5}/>
        </div>
      </div>
    </Obv2Body>
  </>
);

// ---------- Screen 2: What this app does ----------

const Obv2What = ({ onBack, onNext, onSkip }) => (
  <>
    <Obv2Top step={2} onBack={onBack} onSkip={onSkip}/>
    <Obv2Body
      eyebrow="What PayChecker does"
      title="Three things, in plain words."
      footer={<Button variant="primary" block onClick={onNext}>Continue</Button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <InfoCard icon="wallet" tone="navy"
          title="Understand"
          body="See your pay clearly. What you earn, what gets taken out, and what reaches you."/>
        <InfoCard icon="calendar" tone="navy"
          title="Forecast"
          body="Know what's coming. Enough to plan ahead."/>
        <InfoCard icon="check" tone="sage"
          title="Verify"
          body="Check the numbers match what should have happened. We show you; you decide."/>
      </div>
    </Obv2Body>
  </>
);

// ---------- Screen 3: What you'll share ----------

const Obv2Share = ({ onBack, onNext, onSkip }) => {
  const items = [
    { icon: "file",     title: "Your employment contract",   body: "Or an offer letter. Tells us what was promised." },
    { icon: "download", title: "Your payslips",              body: "One each pay cycle. Photo, PDF, or forward the email." },
    { icon: "calendar", title: "Your shifts",                body: "Log them in the app as you work." },
    { icon: "wallet",   title: "Your super fund statements", body: "Add them when you get them — usually each quarter." },
    { icon: "lock",     title: "Your bank deposit records",  body: "Only when we need to check a payment actually arrived." },
  ];
  return (
    <>
      <Obv2Top step={3} onBack={onBack} onSkip={onSkip}/>
      <Obv2Body
        eyebrow="What you'll share"
        title="Five things, over time."
        subtitle="You don't need all of this now. Add what you have; we'll guide you through the rest."
        footer={<Button variant="primary" block onClick={onNext}>Continue</Button>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
              <IconTile icon={it.icon} tone="navy"/>
              <div style={{ flex: 1 }}>
                <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>{it.title}</div>
                <div style={{ font: "400 13px/1.4 'IBM Plex Sans'", color: "#6B7280", marginTop: 2 }}>{it.body}</div>
              </div>
            </div>
          ))}
        </div>
      </Obv2Body>
    </>
  );
};

// ---------- Screen 4: Your control ----------

const Obv2Control = ({ onBack, onNext, onSkip }) => (
  <>
    <Obv2Top step={4} onBack={onBack} onSkip={onSkip}/>
    <Obv2Body
      eyebrow="Your control"
      title="Three promises about your data."
      footer={<Button variant="primary" block onClick={onNext}>Continue</Button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <InfoCard icon="user" tone="sage"
          title="Your data stays yours"
          body="Nothing is shared without your permission."/>
        <InfoCard icon="upload" tone="sage"
          title="Only what you upload"
          body="We never connect to your bank account. We only see documents you choose to share."/>
        <InfoCard icon="lock" tone="sage"
          title="Raw documents deleted"
          body="After we extract what matters, we delete the originals. We keep the numbers, not the images."/>
      </div>
    </Obv2Body>
  </>
);

// ---------- Screen 5: What this app isn't ----------

const Obv2Isnt = ({ onBack, onNext, onSkip }) => (
  <>
    <Obv2Top step={5} onBack={onBack} onSkip={onSkip}/>
    <Obv2Body
      eyebrow="Please read this one"
      title="What PayChecker isn't."
      footer={<Button variant="primary" block onClick={onNext}>I understand</Button>}>
      <div style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F5E1DE", color: "#7A3B33", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="alert" size={18} strokeWidth={2}/>
          </div>
          <div style={{ font: "400 15px/1.55 'IBM Plex Sans'", color: "#1A1D24" }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>We are not legal advice.</div>
            We don't tell you if you're owed money. We show you the numbers side by side — <b>you decide</b> what to do next.
          </div>
        </div>
        <div style={{ height: 1, background: "#F0ECE2" }}/>
        <div style={{ font: "400 14px/1.55 'IBM Plex Sans'", color: "#4B5262" }}>
          For determinations about pay or entitlements, contact the <b>Fair Work Ombudsman</b>.
        </div>
        <a href="tel:131394" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#FAF7F2", border: "1px solid #E5E1D8", borderRadius: 10, textDecoration: "none", color: "#1A1D24" }}>
          <Icon name="help" size={18}/>
          <div style={{ flex: 1 }}>
            <div style={{ font: "500 14px 'IBM Plex Sans'" }}>Fair Work Ombudsman</div>
            <div style={{ font: "500 16px 'IBM Plex Mono'", color: "#1F3A5F", marginTop: 2, letterSpacing: "0.02em" }}>13 13 94</div>
          </div>
          <Icon name="chevron" size={16} color="#6B7280"/>
        </a>
      </div>
    </Obv2Body>
  </>
);

// ---------- Screen 6: Consent + minimal profile ----------

const Obv2Consent = ({ data, setData, onBack, onComplete, onSkip }) => {
  const [consent, setConsent] = React.useState(false);
  return (
    <>
      <Obv2Top step={6} onBack={onBack} onSkip={onSkip}/>
      <Obv2Body
        eyebrow="Last thing"
        title="Ready to continue?"
        footer={
          <Button variant="primary" block disabled={!consent || !data.name} onClick={onComplete}>Get started</Button>
        }>
        <div style={{ background: "#fff", border: "1px solid #E5E1D8", borderRadius: 14, padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ marginTop: 2 }}>
            <button onClick={() => setConsent(!consent)} aria-pressed={consent}
              style={{
                width: 22, height: 22, borderRadius: 6,
                background: consent ? "#1F3A5F" : "#fff",
                border: consent ? "0" : "1.5px solid #CFC8B8",
                display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0,
              }}>
              {consent && <Icon name="check" size={16} color="#fff" strokeWidth={2.5}/>}
            </button>
          </div>
          <div style={{ flex: 1, font: "400 14px/1.5 'IBM Plex Sans'", color: "#1A1D24" }}>
            I understand and want to continue.
            <div style={{ marginTop: 6 }}>
              <a href="#" style={{ font: "500 13px 'IBM Plex Sans'", color: "#1F3A5F", textDecoration: "underline" }}>Read the full privacy policy</a>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24", marginBottom: 6 }}>Your name</div>
            <MiniField value={data.name} onChange={v => setData({ ...data, name: v })} placeholder="What should we call you?"/>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>Country of origin</span>
              <span style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280" }}>Optional</span>
            </div>
            <MiniField value={data.country} onChange={v => setData({ ...data, country: v })} placeholder="e.g. Tonga"/>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ font: "500 14px 'IBM Plex Sans'", color: "#1A1D24" }}>Preferred language</span>
              <span style={{ font: "400 12px 'IBM Plex Sans'", color: "#6B7280" }}>Defaults to English</span>
            </div>
            <MiniField value={data.language} onChange={v => setData({ ...data, language: v })} placeholder="English"/>
          </div>
        </div>
      </Obv2Body>
    </>
  );
};

const MiniField = ({ value, onChange, placeholder }) => (
  <label style={{ display: "flex", alignItems: "center", background: "#fff", border: "1.5px solid #E5E1D8", borderRadius: 12, padding: "12px 14px", minHeight: 48 }}>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ border: 0, outline: "none", background: "transparent", flex: 1, font: "400 16px 'IBM Plex Sans'", color: "#1A1D24" }}/>
  </label>
);

// ---------- Flow root ----------

const OnboardingFlow = ({ onComplete, onSkipAll }) => {
  const [step, setStep] = React.useState(1);
  const [data, setData] = React.useState({ name: "", country: "", language: "" });
  const next = () => setStep(s => Math.min(s + 1, ONB2_TOTAL));
  const back = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {step === 1 && <Obv2Welcome onNext={next} onReturn={onSkipAll} onSkip={onSkipAll}/>}
      {step === 2 && <Obv2What onBack={back} onNext={next} onSkip={onSkipAll}/>}
      {step === 3 && <Obv2Share onBack={back} onNext={next} onSkip={onSkipAll}/>}
      {step === 4 && <Obv2Control onBack={back} onNext={next} onSkip={onSkipAll}/>}
      {step === 5 && <Obv2Isnt onBack={back} onNext={next} onSkip={onSkipAll}/>}
      {step === 6 && <Obv2Consent data={data} setData={setData} onBack={back} onComplete={onComplete} onSkip={onSkipAll}/>}
    </div>
  );
};

Object.assign(window, {
  OnboardingFlow,
  Obv2Welcome, Obv2What, Obv2Share, Obv2Control, Obv2Isnt, Obv2Consent,
});
