import { useState, useRef, useEffect } from "react";

const CONFIG = {
  n8n_webhook: "https://foundersoffice.app.n8n.cloud/webhook/transcribe",
  supabase_url: "https://mpepqexfbyecedlvhdqb.supabase.co",
  supabase_key: "sb_publishable_BzU8hxYr0YvQTZ36to02-A_XqQqenCM",
  app_name: "CoachUp",
};

const CHAT_WEBHOOK = "https://foundersoffice.app.n8n.cloud/webhook/chat";

const S = {
  LOGIN: "login",
  HOME: "home",
  RECORD: "record",
  RESULT: "result",
  HISTORY: "history",
  PROFILE: "profile",
};

const T = {
  bg: "#ffffff",
  bg2: "#f2f4f6",
  bg3: "#fef3e2",
  border: "#d6d9dc",
  border2: "#f6851b33",
  orange: "#f6851b",
  orangeDark: "#e2761b",
  orangeLight: "#fff3e0",
  text: "#24272a",
  textSub: "#6b7280",
  textLight: "#9ca3af",
  success: "#28a745",
  warning: "#f59e0b",
  error: "#ef4444",
  blue: "#037dd6",
};

async function sbFetch(path, method = "GET", body = null) {
  const res = await fetch(`${CONFIG.supabase_url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: CONFIG.supabase_key,
      Authorization: `Bearer ${CONFIG.supabase_key}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  return res.json();
}

async function getRep(phone, pin) {
  const data = await sbFetch(`reps?phone=eq.${phone}&pin=eq.${pin}&select=*`);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function getSessions(rep_id) {
  const data = await sbFetch(`sessions?rep_id=eq.${rep_id}&select=*&order=created_at.desc&limit=20`);
  return Array.isArray(data) ? data : [];
}

function gradeColor(s) {
  if (s >= 80) return T.success;
  if (s >= 65) return T.blue;
  if (s >= 45) return T.warning;
  return T.error;
}

function gradeLabel(s) {
  if (s >= 80) return "Excellent 🏆";
  if (s >= 65) return "Good 👍";
  if (s >= 45) return "Average ⚠️";
  return "Needs Work 🔴";
}

function ScoreRing({ score, size = 80 }) {
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const dash = ((score || 0) / 100) * circ;
  const color = gradeColor(score || 0);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.bg2} strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={6} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 900, color }}>{score || "--"}</span>
        <span style={{ fontSize: size * 0.12, color: T.textLight }}>/ 100</span>
      </div>
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", ...style }}>
      {children}
    </div>
  );
}

function OrangeBtn({ children, onClick, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "15px", borderRadius: 12, border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? T.bg2 : `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})`,
      color: disabled ? T.textLight : "#fff",
      fontWeight: 800, fontSize: 15,
      boxShadow: disabled ? "none" : `0 4px 12px ${T.orange}44`,
      ...style
    }}>{children}</button>
  );
}

// ─── CHAT INTERFACE ───────────────────────────────────────────────────────────
function ChatInterface({ rep, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi ${rep.name.split(' ')[0]}! 👋 I'm Ask CoachUp, your AI sales coach. Ask me anything about products, objections, presentations, or your performance.` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const history = newMessages.slice(1).slice(-10);
      const res = await fetch(CHAT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, rep_id: rep.id, rep_name: rep.name, history: history.slice(0, -1) })
      });
      const data = await res.json();
      const answer = data.answer || 'Sorry, I could not process that. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection failed. Please check your internet and try again.' }]);
    }
    setLoading(false);
  };

  const suggestions = ["How do I handle price objection?", "What are our product USPs?", "Tips for needs assessment?", "How to close a hesitant client?"];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ background: T.bg, borderRadius: '20px 20px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column', maxWidth: 480, width: '100%', margin: '0 auto' }}>
        <div style={{ background: `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})`, padding: '16px 20px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Ask CoachUp</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>AI Sales Coach</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.role === 'user' ? `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})` : T.bg2, color: m.role === 'user' ? '#fff' : T.text, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: T.bg2, padding: '10px 14px', borderRadius: '18px 18px 18px 4px', fontSize: 13, color: T.textSub }}>Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {messages.length === 1 && (
          <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => setInput(s)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, border: `1px solid ${T.orange}44`, background: T.orangeLight, color: T.orange, fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>{s}</button>
            ))}
          </div>
        )}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask anything about sales, products, objections..." rows={1} style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: `1.5px solid ${T.border}`, background: T.bg2, color: T.text, fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
          <button onClick={send} disabled={!input.trim() || loading} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', background: input.trim() && !loading ? `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})` : T.bg2, color: input.trim() && !loading ? '#fff' : T.textLight, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>➤</button>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    if (phone.length < 10 || pin.length !== 4) { setError("Enter valid phone number and 4-digit PIN"); return; }
    setLoading(true); setError("");
    try {
      const rep = await getRep(phone, pin);
      if (rep) onLogin(rep);
      else setError("Phone number or PIN is incorrect. Contact your manager.");
    } catch { setError("Connection failed. Check your internet and try again."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 8px 24px ${T.orange}44`, fontSize: 32 }}>🎯</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: T.text }}>CoachUp</div>
        <div style={{ fontSize: 13, color: T.textSub, marginTop: 4 }}>Sales Performance Platform</div>
      </div>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: T.textSub, fontWeight: 700, display: "block", marginBottom: 6 }}>MOBILE NUMBER</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" style={{ width: "100%", padding: "14px", borderRadius: 12, background: T.bg2, border: `1.5px solid ${T.border}`, color: T.text, fontSize: 15, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: T.textSub, fontWeight: 700, display: "block", marginBottom: 6 }}>4-DIGIT PIN</label>
          <input type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" maxLength={4} style={{ width: "100%", padding: "14px", borderRadius: 12, background: T.bg2, border: `1.5px solid ${T.border}`, color: T.text, fontSize: 24, letterSpacing: 8, outline: "none", boxSizing: "border-box" }} />
        </div>
        {error && <div style={{ background: "#fef2f2", border: `1px solid ${T.error}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: T.error }}>{error}</div>}
        <OrangeBtn onClick={login} disabled={loading}>{loading ? "Checking..." : "Login"}</OrangeBtn>
        <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: T.textLight }}>Don't have a PIN? Contact your manager</div>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ rep, onNav, sessions }) {
  const scoredSessions = sessions.filter(s => s.overall_score && s.overall_score > 0);
  const avgScore = scoredSessions.length ? Math.round(scoredSessions.reduce((a, b) => a + b.overall_score, 0) / scoredSessions.length) : null;
  const lastSession = sessions[0];
  const thisMonth = sessions.filter(s => { const d = new Date(s.created_at); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });

  return (
    <div>
      <div style={{ background: `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})`, borderRadius: 20, padding: "20px", marginBottom: 20, boxShadow: `0 8px 24px ${T.orange}33` }}>
        <div style={{ fontSize: 13, color: "#fff9", marginBottom: 4 }}>Hello 👋</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{rep.name}</div>
        <div style={{ fontSize: 12, color: "#fff9", marginTop: 2 }}>{rep.territory || "Sales Representative"}</div>
        <div style={{ display: "flex", marginTop: 16, background: "rgba(255,255,255,0.15)", borderRadius: 12, overflow: "hidden" }}>
          {[{ label: "This Month", value: thisMonth.length }, { label: "Avg Score", value: avgScore || "--" }, { label: "Last Score", value: lastSession?.overall_score || "--" }].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "12px 0", textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.2)" : "none" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#fffd", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { screen: "visit", icon: "🏗️", title: "Site\nPresentation", sub: "Record & score your pitch", accent: T.orange },
          { screen: S.HISTORY, icon: "📊", title: "My Sessions", sub: `${sessions.length} recorded`, accent: T.blue },
          { screen: S.PROFILE, icon: "👤", title: "My Profile", sub: rep.name.split(" ")[0], accent: T.success },
        ].map(c => (
          <button key={c.screen} onClick={() => onNav(c.screen)} style={{ background: T.bg, border: `1.5px solid ${c.accent}33`, borderRadius: 16, padding: "18px 14px", cursor: "pointer", textAlign: "left", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 3, whiteSpace: "pre-line" }}>{c.title}</div>
            <div style={{ fontSize: 11, color: T.textLight }}>{c.sub}</div>
          </button>
        ))}
      </div>
      {lastSession?.coach_tip && (
        <Card style={{ borderLeft: `4px solid ${T.orange}`, background: T.orangeLight }}>
          <div style={{ fontSize: 11, color: T.orange, fontWeight: 700, marginBottom: 6 }}>🧠 LAST COACH TIP</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{lastSession.coach_tip}</div>
        </Card>
      )}
    </div>
  );
}

// ─── RECORD ───────────────────────────────────────────────────────────────────
function RecordScreen({ type, rep, onBack, onResult }) {
  const [clientName, setClientName] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [manualText, setManualText] = useState("");
  const [mode, setMode] = useState("record");
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [error, setError] = useState("");
  const [geoData, setGeoData] = useState({ latitude: null, longitude: null });
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeoData({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setRecording(false);
        clearInterval(timerRef.current);
      };
      mr.start(1000);
      mrRef.current = mr;
      setRecording(true);
      setAudioBlob(null);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      setError("Microphone not available. Please use Type mode.");
      setMode("manual");
    }
  };

  const stopRecording = () => { mrRef.current?.stop(); clearInterval(timerRef.current); };

  const analyze = async () => {
    if (!clientName.trim()) { setError("Please enter client name"); return; }
    if (mode === "record" && !audioBlob) { setError("No recording found. Please record first."); return; }
    if (mode === "manual" && !manualText.trim()) { setError("Please enter transcript"); return; }
    setProcessing(true); setError("");
    try {
      if (mode === "record") {
        setProcessingStep("Preparing audio...");
        const base64Audio = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
        setProcessingStep("Uploading audio...");
        const res = await fetch(CONFIG.n8n_webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rep_id: rep.id, rep_name: rep.name, client_name: clientName, session_type: type, mode: "audio", audio_base64: base64Audio, audio_filename: `${rep.name}_${clientName}_${Date.now()}.webm`, latitude: geoData.latitude, longitude: geoData.longitude }),
        });
        const data = await res.json();
        if (data.overall_score !== undefined || data.transcript !== undefined) {
          onResult({ ...data, client_name: clientName, session_type: type });
        } else { setError("Analysis failed. Please try again."); }
      } else {
        setProcessingStep("Analyzing transcript...");
        const res = await fetch(CONFIG.n8n_webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rep_id: rep.id, rep_name: rep.name, client_name: clientName, session_type: type, transcript: manualText.trim(), mode: "text", latitude: geoData.latitude, longitude: geoData.longitude }),
        });
        const data = await res.json();
        if (data.overall_score !== undefined || data.transcript !== undefined) {
          onResult({ ...data, client_name: clientName, session_type: type, transcript: manualText.trim() });
        } else { setError("Analysis failed. Please try again."); }
      }
    } catch { setError("Connection failed. Check internet and try again."); }
    setProcessing(false); setProcessingStep("");
  };

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Back</button>
      <div style={{ background: "#fff7ed", border: `1.5px solid ${T.orange}33`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>🏗️</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Site Presentation</div>
        <div style={{ fontSize: 12, color: T.textSub, marginTop: 4 }}>Record your product presentation</div>
      </div>
      <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client / Architect name *" style={{ width: "100%", padding: "12px 14px", borderRadius: 12, background: T.bg2, border: `1.5px solid ${T.border}`, color: T.text, fontSize: 13, outline: "none", marginBottom: 16, boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["record", "manual"].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1.5px solid ${mode === m ? T.orange : T.border}`, cursor: "pointer", background: mode === m ? T.orangeLight : T.bg, color: mode === m ? T.orange : T.textSub, fontWeight: 700, fontSize: 13 }}>
            {m === "record" ? "🎙️ Voice" : "⌨️ Type"}
          </button>
        ))}
      </div>
      {mode === "record" ? (
        <div style={{ textAlign: "center" }}>
          {recording && <div style={{ background: T.bg2, border: `1px solid ${T.error}33`, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 13, color: T.error, fontWeight: 700 }}>🔴 Recording in progress — speak clearly</div>}
          {audioBlob && !recording && <div style={{ background: "#f0fdf4", border: `1px solid ${T.success}33`, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 13, color: T.success, fontWeight: 700 }}>✅ Recording captured — {fmt(seconds)}</div>}
          <button onClick={recording ? stopRecording : startRecording} style={{ width: 84, height: 84, borderRadius: "50%", border: "none", cursor: "pointer", background: recording ? `linear-gradient(135deg,${T.error},#b91c1c)` : `linear-gradient(135deg,${T.orange},${T.orangeDark})`, color: "#fff", fontSize: 30, boxShadow: recording ? `0 0 0 8px ${T.error}22` : `0 0 0 8px ${T.orange}22` }}>
            {recording ? "⏹" : "🎙"}
          </button>
          <div style={{ marginTop: 10, fontSize: 13, color: T.textSub }}>{recording ? `Recording... ${fmt(seconds)}` : audioBlob ? "Tap to re-record" : "Tap to start recording"}</div>
          {audioBlob && <button onClick={() => { setAudioBlob(null); setSeconds(0); }} style={{ marginTop: 8, background: "none", border: "none", color: T.error, cursor: "pointer", fontSize: 12 }}>🗑 Clear & Re-record</button>}
        </div>
      ) : (
        <textarea value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Paste or type the full conversation here..." style={{ width: "100%", minHeight: 160, background: T.bg2, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: 14, color: T.text, fontSize: 13, lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
      )}
      {error && <div style={{ marginTop: 12, background: "#fef2f2", border: `1px solid ${T.error}33`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.error }}>{error}</div>}
      {(audioBlob || manualText) && !recording && (
        <div style={{ marginTop: 16 }}>
          <OrangeBtn onClick={analyze} disabled={processing}>
            {processing ? `🤖 ${processingStep || "Processing..."}` : "🔍 Analyze & Score"}
          </OrangeBtn>
          {processing && <div style={{ marginTop: 8, textAlign: "center", fontSize: 12, color: T.textLight }}>{mode === "record" ? "Audio uploading → Transcribing → Scoring... ~90 seconds" : "Analyzing... ~30 seconds"}</div>}
        </div>
      )}
    </div>
  );
}

// ─── RESULT ───────────────────────────────────────────────────────────────────
function ResultScreen({ result, onBack, onHome }) {
  const [copied, setCopied] = useState(false);
  const score = result.overall_score || 0;
  const color = gradeColor(score);

  const copyMOM = () => {
    if (result.mom_text) { navigator.clipboard.writeText(result.mom_text); setCopied(true); setTimeout(() => setCopied(false), 3000); }
  };

  return (
    <div>
      <button onClick={onHome} style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Home</button>

      {/* Score Hero */}
      <div style={{ background: `linear-gradient(135deg, ${T.orange}11, ${T.orangeDark}11)`, border: `1.5px solid ${color}33`, borderRadius: 20, padding: "20px 16px", marginBottom: 16, display: "flex", gap: 16, alignItems: "center" }}>
        <ScoreRing score={score} size={90} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: T.textSub, marginBottom: 4 }}>🏗️ Site Presentation</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 6 }}>{result.client_name}</div>
          <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 99, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{gradeLabel(score)}</span>
        </div>
      </div>

      {/* Insight Cards */}
      {[
        { icon: "💪", label: "Strength", value: result.strength, color: T.success, bg: "#f0fdf4" },
        { icon: "🎯", label: "Key Improvement", value: result.improvement, color: T.warning, bg: "#fffbeb" },
        { icon: "🧠", label: "Coach Tip", value: result.coach_tip, color: T.orange, bg: T.orangeLight },
      ].map(item => item.value && (
        <div key={item.label} style={{ background: item.bg, borderLeft: `4px solid ${item.color}`, borderRadius: "0 12px 12px 0", padding: "12px 14px", marginBottom: 10, border: `1px solid ${item.color}22`, borderLeft: `4px solid ${item.color}` }}>
          <div style={{ fontSize: 11, color: item.color, fontWeight: 700, marginBottom: 4 }}>{item.icon} {item.label.toUpperCase()}</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{item.value}</div>
        </div>
      ))}

      {/* Score Breakdown */}
      {result.scores && (() => {
        try {
          const scores = typeof result.scores === 'string' ? JSON.parse(result.scores) : result.scores;
          const entries = Object.entries(scores);
          if (entries.length === 0) return null;
          return (
            <Card style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.orange, fontWeight: 700, marginBottom: 12 }}>📊 DETAILED BREAKDOWN</div>
              {entries.map(([criterion, data]) => {
                const s = data.score || 0;
                const c = s >= 8 ? T.success : s >= 5 ? T.warning : T.error;
                return (
                  <div key={criterion} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{criterion}</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: c }}>{s}/10</span>
                    </div>
                    <div style={{ height: 6, background: T.bg2, borderRadius: 3, marginBottom: 4 }}>
                      <div style={{ height: '100%', width: `${s * 10}%`, background: c, borderRadius: 3 }} />
                    </div>
                    {data.remark && <div style={{ fontSize: 11, color: T.textSub, fontStyle: 'italic' }}>{data.remark}</div>}
                  </div>
                );
              })}
            </Card>
          );
        } catch(e) { return null; }
      })()}

      {/* Audio Analytics */}
      {(result.speech_pace || result.talk_ratio || result.sentiment_score) && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: T.orange, fontWeight: 700, marginBottom: 12 }}>🎙️ AUDIO ANALYTICS</div>
          {[
            { label: 'Speech Pace', value: result.speech_pace, icon: '⚡' },
            { label: 'Talk Ratio', value: result.talk_ratio, icon: '🗣️' },
            { label: 'Filler Words', value: result.filler_words, icon: '💬' },
            { label: 'Sentiment', value: result.sentiment_score, icon: '😊' },
          ].map(item => item.value && item.value !== 'N/A' && (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 12, color: T.textSub }}>{item.icon} {item.label}</span>
              <span style={{ fontSize: 12, color: T.text, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{item.value}</span>
            </div>
          ))}
        </Card>
      )}

      {/* NDFF */}
      {result.ndff && (() => {
        try {
          const ndff = typeof result.ndff === 'string' ? JSON.parse(result.ndff) : result.ndff;
          const tags = ["NEED", "DESIRE", "FEAR", "FRUSTRATION"];
          const hasData = tags.some(t => ndff[t]);
          if (!hasData) return null;
          return (
            <Card>
              <div style={{ fontSize: 11, color: T.orange, fontWeight: 700, marginBottom: 10 }}>🎯 CLIENT SIGNALS (NDFF)</div>
              {tags.map(tag => ndff[tag] && (
                <div key={tag} style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1, color: tag === "NEED" ? T.success : tag === "DESIRE" ? T.blue : tag === "FEAR" ? T.warning : T.error, background: tag === "NEED" ? "#f0fdf4" : tag === "DESIRE" ? "#eff6ff" : tag === "FEAR" ? "#fffbeb" : "#fef2f2", padding: "2px 8px", borderRadius: 99 }}>{tag}</span>
                  <span style={{ fontSize: 12, color: T.textSub, lineHeight: 1.5 }}>{ndff[tag]}</span>
                </div>
              ))}
              {ndff.key_insight && <div style={{ marginTop: 8, padding: "8px 10px", background: T.bg2, borderRadius: 8, fontSize: 12, color: T.textSub, fontStyle: 'italic' }}>💡 {ndff.key_insight}</div>}
            </Card>
          );
        } catch(e) { return null; }
      })()}

      {/* Transcript */}
      {result.transcript && (
        <Card>
          <div style={{ fontSize: 11, color: T.textSub, fontWeight: 700, marginBottom: 8 }}>📝 TRANSCRIPT</div>
          <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.7, maxHeight: 150, overflowY: "auto" }}>{result.transcript}</div>
        </Card>
      )}

      {/* Audio Link */}
      {result.audio_link && (
        <a href={result.audio_link} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 12, color: T.blue, fontSize: 13, textDecoration: "none", fontWeight: 700 }}>
          🎧 Listen to Recording →
        </a>
      )}

      {/* MOM */}
      {result.mom_text && (
        <div>
          <Card style={{ background: "#f0fdf4", borderColor: `${T.success}33` }}>
            <div style={{ fontSize: 11, color: T.success, fontWeight: 700, marginBottom: 8 }}>📋 WHATSAPP MOM</div>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.8, color: T.text, margin: 0, fontFamily: "inherit" }}>{result.mom_text}</pre>
          </Card>
          <button onClick={copyMOM} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: "pointer", background: "#25d366", color: "#fff", fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
            {copied ? "✅ Copied! Paste on WhatsApp" : "📲 Copy MOM for WhatsApp"}
          </button>
        </div>
      )}

      {!result.overall_score && (
        <Card style={{ background: "#fffbeb", borderColor: `${T.warning}33` }}>
          <div style={{ fontSize: 13, color: T.warning, lineHeight: 1.6 }}>⚠️ AI scoring pending. Transcript saved successfully.</div>
        </Card>
      )}
    </div>
  );
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
function HistoryScreen({ onBack, sessions }) {
  const scored = sessions.filter(s => s.overall_score > 0);
  const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b.overall_score, 0) / scored.length) : 0;

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Back</button>
      <div style={{ fontSize: 20, fontWeight: 900, color: T.text, marginBottom: 16 }}>📊 My Sessions</div>
      {sessions.length > 0 && (
        <div style={{ background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, borderRadius: 16, padding: 16, marginBottom: 20, display: "flex", boxShadow: `0 4px 16px ${T.orange}33` }}>
          {[{ label: "Total", value: sessions.length }, { label: "Avg Score", value: avg || "--" }, { label: "Best", value: scored.length ? Math.max(...scored.map(s => s.overall_score)) : "--" }].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.3)" : "none" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#fffd", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {sessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: T.textLight }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 14, color: T.textSub }}>No sessions yet</div>
        </div>
      ) : (
        sessions.map((s, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>🏗️ {s.client_name}</div>
                <div style={{ fontSize: 11, color: T.textLight, marginTop: 3 }}>{new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: gradeColor(s.overall_score || 0) }}>{s.overall_score || "--"}</div>
                <div style={{ fontSize: 10, color: T.textLight }}>/ 100</div>
              </div>
            </div>
            {s.strength && <div style={{ marginTop: 8, padding: "6px 10px", background: "#f0fdf4", borderRadius: 8, fontSize: 11, color: T.success, borderLeft: `2px solid ${T.success}` }}>💪 {s.strength}</div>}
            {s.audio_drive_link && <a href={s.audio_drive_link} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 11, color: T.blue, textDecoration: "none", fontWeight: 700 }}>🎧 Listen →</a>}
          </Card>
        ))
      )}
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function ProfileScreen({ rep, onBack, onLogout, sessions }) {
  const thisMonth = sessions.filter(s => { const d = new Date(s.created_at); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const scored = thisMonth.filter(s => s.overall_score > 0);
  const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b.overall_score, 0) / scored.length) : 0;

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.textSub, cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Back</button>
      <Card style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 26, fontWeight: 900, color: "#fff", boxShadow: `0 4px 14px ${T.orange}44` }}>
          {rep.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>{rep.name}</div>
        <div style={{ fontSize: 12, color: T.textSub, marginTop: 4 }}>{rep.phone}</div>
        {rep.territory && <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>📍 {rep.territory}</div>}
        {rep.manager_name && <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>👔 {rep.manager_name}</div>}
      </Card>
      <Card>
        <div style={{ fontSize: 11, color: T.textSub, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>This Month</div>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          {[{ label: "Sessions", value: thisMonth.length }, { label: "Avg Score", value: avg || "--" }, { label: "Visits", value: thisMonth.filter(s => s.session_type === "visit").length }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: T.orange }}>{s.value}</div>
              <div style={{ fontSize: 10, color: T.textLight, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>
      <button onClick={onLogout} style={{ width: "100%", padding: "14px", borderRadius: 12, border: `1.5px solid ${T.error}44`, cursor: "pointer", background: "#fef2f2", color: T.error, fontWeight: 700, fontSize: 14, marginTop: 8 }}>Logout</button>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState(S.LOGIN);
  const [rep, setRep] = useState(null);
  const [sessionType, setSessionType] = useState(null);
  const [result, setResult] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);

  const loadSessions = async (rep_id) => { const data = await getSessions(rep_id); setSessions(data); };

  const handleLogin = (repData) => { setRep(repData); loadSessions(repData.id); setScreen(S.HOME); };

  const handleNav = (s) => {
    if (s === "visit") { setSessionType("visit"); setScreen(S.RECORD); }
    else setScreen(s);
  };

  const handleResult = (data) => { setResult(data); loadSessions(rep.id); setScreen(S.RESULT); };
  const handleLogout = () => { setRep(null); setSessions([]); setScreen(S.LOGIN); };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: T.bg2, color: T.text, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      {screen !== S.LOGIN && (
        <div style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎯</div>
            <span style={{ fontSize: 16, fontWeight: 900, color: T.text }}>CoachUp</span>
          </div>
          {rep && <div style={{ fontSize: 12, color: T.textSub, background: T.bg2, padding: "4px 10px", borderRadius: 99, border: `1px solid ${T.border}` }}>👤 {rep.name.split(" ")[0]}</div>}
        </div>
      )}
      <div style={{ padding: screen === S.LOGIN ? "0" : "20px 16px 40px" }}>
        {screen === S.LOGIN && <LoginScreen onLogin={handleLogin} />}
        {screen === S.HOME && rep && <HomeScreen rep={rep} onNav={handleNav} sessions={sessions} />}
        {screen === S.RECORD && rep && <RecordScreen type={sessionType} rep={rep} onBack={() => setScreen(S.HOME)} onResult={handleResult} />}
        {screen === S.RESULT && result && <ResultScreen result={result} onBack={() => setScreen(S.RECORD)} onHome={() => setScreen(S.HOME)} />}
        {screen === S.HISTORY && <HistoryScreen onBack={() => setScreen(S.HOME)} sessions={sessions} />}
        {screen === S.PROFILE && rep && <ProfileScreen rep={rep} onBack={() => setScreen(S.HOME)} onLogout={handleLogout} sessions={sessions} />}
      </div>

      {/* Floating Chat Button */}
      {rep && screen !== S.LOGIN && (
        <button onClick={() => setChatOpen(true)} style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})`, color: '#fff', fontSize: 24, boxShadow: `0 4px 16px ${T.orange}66`, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          🤖
        </button>
      )}

      {chatOpen && rep && <ChatInterface rep={rep} onClose={() => setChatOpen(false)} />}

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #9ca3af; }
        input:focus, textarea:focus { border-color: ${T.orange} !important; box-shadow: 0 0 0 3px ${T.orange}22; }
        button:active { transform: scale(0.97); }
        a:hover { opacity: 0.8; }
      `}</style>
    </div>
  );
}
