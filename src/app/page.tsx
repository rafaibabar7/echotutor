// src/app/page.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

// ============================================================
// TYPES
// ============================================================
type Mode = "tutor" | "quiz" | "scenario" | "reference" | "guidelines";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  clinicalPearl: string;
  domain: string;
  difficulty: string;
}

// ============================================================
// SIDEBAR ICONS (clean line icons matching Figma)
// ============================================================
function IconTutor() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>; }
function IconQuiz() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function IconScenario() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>; }
function IconReference() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function IconGuidelines() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function IconMic() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="1" width="6" height="11" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>; }
function IconSend() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>; }

const NAV_ICONS: Record<Mode, () => React.ReactNode> = { tutor: IconTutor, quiz: IconQuiz, scenario: IconScenario, reference: IconReference, guidelines: IconGuidelines };

// ============================================================
// CONFIGURATION
// ============================================================
const NAV_ITEMS: { key: Mode; label: string; section: "modes" | "resources" }[] = [
  { key: "tutor", label: "Tutor Mode", section: "modes" },
  { key: "quiz", label: "Quiz Mode", section: "modes" },
  { key: "scenario", label: "Clinical Scenarios", section: "modes" },
  { key: "reference", label: "Reference Library", section: "modes" },
  { key: "guidelines", label: "Guidelines", section: "resources" },
];

const MODE_TITLES: Record<Mode, string> = { tutor: "Tutor Mode", quiz: "Quiz Mode", scenario: "Clinical Scenarios", reference: "Reference Library", guidelines: "Guidelines" };

const QUIZ_DOMAINS = ["Physics & Instrumentation", "Standard Views & Anatomy", "Valvular Heart Disease", "Ventricular Assessment", "Perioperative Applications", "Structural & Interventional"];
const QUIZ_DIFFICULTIES = ["Foundation", "Intermediate", "Advanced"];

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  tutor: [
    "Walk me through the ME four-chamber view — what structures do I see?",
    "Explain the Carpentier classification of mitral regurgitation",
    "How do I assess diastolic function using the ASE algorithm?",
    "What is the difference between primary and secondary MR?",
  ],
  scenario: [
    "Give me a case involving mitral valve repair assessment",
    "Present a scenario with post-CPB hemodynamic instability",
    "Give me a case where I need to assess a patient for TAVR",
    "Present a case with unexpected intraoperative TEE findings",
  ],
  reference: [
    "Normal values for LV dimensions and function",
    "Grading criteria for aortic stenosis",
    "All 28 comprehensive TEE views with probe positions",
    "Hemodynamic formulas with sample calculations",
  ],
};

const GUIDELINES = [
  { id: "ase-sca-2013-comprehensive", title: "Comprehensive Intraoperative Multiplane TEE", org: "ASE / SCA", year: 2013, description: "Defines the 28-view comprehensive TEE examination.", pdf: "/guidelines/ase-sca-2013-comprehensive-tee.pdf", tags: ["TEE", "28 Views"] },
  { id: "ase-sca-2013-basic", title: "Basic Perioperative TEE Exam", org: "ASE / SCA", year: 2013, description: "Defines the 11-view basic perioperative TEE examination.", pdf: "/guidelines/ase-sca-2013-basic-tee.pdf", tags: ["TEE", "Basic Exam"] },
  { id: "ase-2015-chamber", title: "Cardiac Chamber Quantification", org: "ASE / EACVI", year: 2015, description: "Normal values for all cardiac chambers.", pdf: "/guidelines/ase-2015-chamber-quantification.pdf", tags: ["Normal Values", "LV", "RV"] },
  { id: "aha-acc-2020-vhd", title: "Management of Valvular Heart Disease", org: "AHA / ACC", year: 2020, description: "Classification and management of all valve diseases.", pdf: "/guidelines/aha-acc-2020-valvular-heart-disease.pdf", tags: ["Valve Disease", "AS", "MR"] },
  { id: "ase-2016-diastolic", title: "LV Diastolic Function Evaluation", org: "ASE / EACVI", year: 2016, description: "Diastolic function algorithm: E/A, e\u2019, E/e\u2019, TR velocity.", pdf: "/guidelines/ase-2016-diastolic-function.pdf", tags: ["Diastolic Function"] },
  { id: "ase-2010-right-heart", title: "Echocardiographic Assessment of the Right Heart", org: "ASE", year: 2010, description: "RV function: TAPSE, FAC, S\u2019, RV strain.", pdf: "/guidelines/ase-2010-right-heart.pdf", tags: ["Right Heart", "TAPSE"] },
  { id: "sca-2020-noncardiac", title: "TEE in Noncardiac Surgery", org: "SCA / ASE", year: 2020, description: "Expanding indications for intraoperative TEE.", pdf: "/guidelines/sca-2020-tee-noncardiac.pdf", tags: ["Noncardiac Surgery"] },
  { id: "ase-2025-reporting", title: "Standardized Reporting of Echo Findings", org: "ASE", year: 2025, description: "Newest ASE guideline — standardized echo reports.", pdf: "/guidelines/ase-2025-standardized-reporting.pdf", tags: ["Reporting", "Newest"] },
  { id: "ase-2017-regurgitation", title: "Native Valvular Regurgitation Evaluation", org: "ASE", year: 2017, description: "PISA, vena contracta, EROA, regurgitant volume.", pdf: "/guidelines/ase-2017-valvular-regurgitation.pdf", tags: ["MR", "AR", "PISA"] },
  { id: "bidmc-2022-mv", title: "Algorithmic MV Assessment (BIDMC)", org: "BIDMC Research", year: 2022, description: "Stepwise MV assessment — Carpentier classification.", pdf: "/guidelines/bidmc-2022-mv-assessment.pdf", tags: ["Mitral Valve", "Carpentier"] },
];

// ============================================================
// VOICE INPUT HOOK
// ============================================================
function useVoiceInput(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const toggle = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
    if (!SR) { alert("Voice input is not supported in this browser. Try Chrome or Safari."); return; }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript;
      if (transcript) onResult(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, onResult]);

  return { isListening, toggle };
}

// ============================================================
// INPUT BAR COMPONENT (reusable, inline)
// ============================================================
function InputBar({ input, setInput, onSend, isLoading, placeholder }: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isListening, toggle: toggleVoice } = useVoiceInput((text) => {
    setInput(input ? input + " " + text : text);
  });

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  return (
    <div className="mt-6">
      <div className="flex items-end gap-2 p-3 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm py-2 px-2"
          style={{ color: "var(--text-primary)", maxHeight: "120px" }}
          onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
        />

        {/* Mic button */}
        <button onClick={toggleVoice} title={isListening ? "Stop recording" : "Voice input"}
          className={`p-2.5 rounded-lg transition-all flex-shrink-0 ${isListening ? "animate-mic-pulse" : ""}`}
          style={{ background: isListening ? "var(--error)" : "var(--gray-100)", color: isListening ? "#fff" : "var(--gray-500)" }}>
          <IconMic />
        </button>

        {/* Send button */}
        <button onClick={onSend} disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-lg transition-all flex-shrink-0"
          style={{ background: !input.trim() || isLoading ? "var(--gray-200)" : "var(--accent)", color: "var(--text-on-accent)" }}>
          <IconSend />
        </button>
      </div>
      <p className="text-[11px] mt-2 text-center" style={{ color: "var(--text-muted)" }}>
        Press Enter to send · Shift+Enter for new line · Click mic for voice
      </p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Home() {
  const [showLanding, setShowLanding] = useState(true);
  const [mode, setMode] = useState<Mode>("tutor");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizDomain, setQuizDomain] = useState(QUIZ_DOMAINS[0]);
  const [quizDifficulty, setQuizDifficulty] = useState(QUIZ_DIFFICULTIES[1]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setMessages([]);
    setInput("");
    setQuizQuestion(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuizError(null);
  };

  const sendMessage = async (overrideInput?: string) => {
    const text = overrideInput || input;
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);
    setMessages([...updated, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated.slice(-20).map((m) => ({ role: m.role, content: m.content })), mode }),
      });
      if (!res.ok) throw new Error("API error");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No body");
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...updated, { role: "assistant", content: acc }]);
      }
    } catch {
      setMessages([...updated, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuiz = async () => {
    setIsLoading(true);
    setQuizQuestion(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuizError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Generate a ${quizDifficulty} difficulty board-style question about ${quizDomain}. Respond with ONLY the JSON object, no markdown formatting.` }],
          mode: "quiz",
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const content = data.content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      setQuizQuestion(JSON.parse(content));
    } catch {
      setQuizError("Failed to generate question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = () => {
    if (selectedAnswer === null || !quizQuestion) return;
    setShowExplanation(true);
    setQuizScore((p) => ({ correct: p.correct + (selectedAnswer === quizQuestion.correctAnswer ? 1 : 0), total: p.total + 1 }));
  };

  // ============================================================
  // LANDING PAGE
  // ============================================================
  if (showLanding) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-page)" }}>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="flex flex-col items-center text-center max-w-3xl">
            <img src="/EchoTutor_logo.png" alt="EchoTutor" className="w-80 sm:w-[28rem] h-80 sm:h-[28rem] mb-12 object-contain animate-fade-in" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mt-2 animate-fade-in animate-delay-1">
              {NAV_ITEMS.filter((n) => n.section === "modes").map((m) => (
                <div key={m.key} className="p-6 rounded-xl text-left" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                  <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{m.label}</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{MODE_TITLES[m.key] === m.label ? "" : MODE_TITLES[m.key]}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowLanding(false)}
              className="mt-12 px-10 py-4 rounded-xl text-lg font-semibold transition-all hover:opacity-90 active:scale-[0.98] animate-fade-in animate-delay-2"
              style={{ background: "var(--accent)", color: "var(--text-on-accent)", boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)" }}>
              Start Learning →
            </button>
          </div>
        </div>
        <div className="text-center py-6 text-sm" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
          Grounded in ASE/SCA Guidelines · Educational use only · Not a clinical tool
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN APP
  // ============================================================
  const modeNav = NAV_ITEMS.filter((n) => n.section === "modes");
  const resourceNav = NAV_ITEMS.filter((n) => n.section === "resources");
  const chatMode = mode === "tutor" || mode === "scenario" || mode === "reference";

  return (
    <div className="flex h-screen max-h-screen overflow-hidden" style={{ background: "var(--bg-page)" }}>

      {/* ══════════ SIDEBAR ══════════ */}
      <aside className="flex-shrink-0 flex flex-col h-full" style={{ width: 220, background: "var(--sidebar-bg)" }}>

        {/* Logo area */}
        <div className="flex flex-col items-center px-5 pt-8 pb-8">
          <img src="/EchoTutor_logo.png" alt="EchoTutor" className="w-28 h-28 object-contain" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 overflow-y-auto">
          {modeNav.map((item) => {
            const active = mode === item.key;
            const Icon = NAV_ICONS[item.key];
            return (
              <button key={item.key} onClick={() => switchMode(item.key)}
                className="w-full text-left px-4 py-3.5 rounded-xl text-[13.5px] transition-all flex items-center gap-3.5 mb-1.5"
                style={{
                  color: active ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                  fontWeight: active ? 600 : 400,
                  background: active ? "var(--accent)" : "transparent",
                }}>
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="my-6 mx-2" style={{ borderTop: "1px solid var(--sidebar-border)" }} />

          {resourceNav.map((item) => {
            const active = mode === item.key;
            const Icon = NAV_ICONS[item.key];
            return (
              <button key={item.key} onClick={() => switchMode(item.key)}
                className="w-full text-left px-4 py-3.5 rounded-xl text-[13.5px] transition-all flex items-center gap-3.5 mb-1.5"
                style={{
                  color: active ? "var(--sidebar-text-active)" : "var(--sidebar-text)",
                  fontWeight: active ? 600 : 400,
                  background: active ? "var(--accent)" : "transparent",
                }}>
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-5 py-5" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <p className="text-[10px] text-center leading-relaxed" style={{ color: "var(--sidebar-text)", opacity: 0.4 }}>
            Educational use only<br />ASE/SCA Guidelines
          </p>
        </div>
      </aside>

      {/* ══════════ MAIN AREA ══════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-5" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <h1 className="text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>{MODE_TITLES[mode]}</h1>
          {mode === "quiz" && quizScore.total > 0 && (
            <div className="text-sm px-4 py-2 rounded-lg font-semibold" style={{ background: "var(--accent-50)", color: "var(--accent)" }}>
              {quizScore.correct}/{quizScore.total} · {Math.round((quizScore.correct / quizScore.total) * 100)}%
            </div>
          )}
          {/* User avatar placeholder */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8">

            {/* ════ GUIDELINES ════ */}
            {mode === "guidelines" ? (
              <div className="space-y-6">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Click any guideline to open the PDF.</p>
                {GUIDELINES.map((g) => (
                  <a key={g.id} href={g.pdf} target="_blank" rel="noopener noreferrer"
                    className="block p-6 rounded-xl transition-all"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>{g.org}</span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{g.year}</span>
                        </div>
                        <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{g.title}</h3>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{g.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {g.tags.map((t) => <span key={t} className="text-[11px] px-2 py-0.5 rounded" style={{ background: "var(--gray-100)", color: "var(--gray-500)" }}>{t}</span>)}
                        </div>
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>Open PDF →</span>
                    </div>
                  </a>
                ))}
                <div className="mt-8 p-8 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <h3 className="text-lg font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>Research Contributions</h3>
                  <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>Research integrated into EchoTutor.</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[{ title: "MV Assessment", desc: "Algorithmic intraoperative MV evaluation" }, { title: "3D Tricuspid", desc: "Tricuspid annular geometry via 3D TEE" }, { title: "AI in Echo", desc: "LLM performance on echo board questions" }].map((item) => (
                      <div key={item.title} className="p-5 rounded-xl text-center" style={{ background: "var(--gray-50)", border: "1px solid var(--border)" }}>
                        <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            ) : mode === "quiz" ? (
              /* ════ QUIZ ════ */
              <div className="space-y-8">
                <div className="p-8 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  <div className="flex flex-wrap gap-6 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Domain</label>
                      <select value={quizDomain} onChange={(e) => setQuizDomain(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)" }}>
                        {QUIZ_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="min-w-[150px]">
                      <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Difficulty</label>
                      <select value={quizDifficulty} onChange={(e) => setQuizDifficulty(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)" }}>
                        {QUIZ_DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <button onClick={generateQuiz} disabled={isLoading}
                      className="px-8 py-3 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: isLoading ? "var(--gray-300)" : "var(--accent)", color: "var(--text-on-accent)" }}>
                      {isLoading ? "Generating..." : "Generate Question"}
                    </button>
                  </div>
                </div>

                {isLoading && !quizQuestion && (
                  <div className="flex flex-col items-center py-20">
                    <svg className="animate-spin mb-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Generating question...</p>
                  </div>
                )}

                {quizQuestion && (
                  <div className="p-8 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                    <div className="flex gap-2 mb-5">
                      <span className="text-xs px-2.5 py-1 rounded-md font-medium" style={{ background: "var(--gray-100)", color: "var(--gray-600)" }}>{quizQuestion.domain}</span>
                      <span className="text-xs px-2.5 py-1 rounded-md font-medium" style={{
                        background: quizQuestion.difficulty === "Advanced" ? "var(--error-light)" : quizQuestion.difficulty === "Intermediate" ? "var(--amber-light)" : "var(--success-light)",
                        color: quizQuestion.difficulty === "Advanced" ? "var(--error)" : quizQuestion.difficulty === "Intermediate" ? "var(--amber)" : "var(--success)",
                      }}>{quizQuestion.difficulty}</span>
                    </div>
                    <p className="text-[15px] mb-7" style={{ color: "var(--text-primary)", lineHeight: 1.85 }}>{quizQuestion.question}</p>
                    <div className="space-y-3 mb-7">
                      {quizQuestion.options.map((opt, i) => {
                        let bg = "var(--bg-page)", bdr = "var(--border)", clr = "var(--text-primary)";
                        if (showExplanation) {
                          if (i === quizQuestion.correctAnswer) { bg = "var(--success-light)"; bdr = "var(--success)"; clr = "var(--success)"; }
                          else if (i === selectedAnswer) { bg = "var(--error-light)"; bdr = "var(--error)"; clr = "var(--error)"; }
                        } else if (i === selectedAnswer) { bg = "var(--accent-50)"; bdr = "var(--accent)"; clr = "var(--text-primary)"; }
                        return (
                          <button key={i} onClick={() => !showExplanation && setSelectedAnswer(i)} disabled={showExplanation}
                            className="w-full text-left px-5 py-4 rounded-xl text-sm transition-all"
                            style={{ background: bg, border: `1.5px solid ${bdr}`, color: clr, lineHeight: 1.7 }}>{opt}</button>
                        );
                      })}
                    </div>
                    {!showExplanation ? (
                      <button onClick={submitAnswer} disabled={selectedAnswer === null}
                        className="px-8 py-3 rounded-xl text-sm font-semibold"
                        style={{ background: selectedAnswer === null ? "var(--gray-300)" : "var(--accent)", color: "var(--text-on-accent)" }}>Submit Answer</button>
                    ) : (
                      <div className="space-y-5 mt-6">
                        <div className="p-6 rounded-xl" style={{ background: "var(--gray-50)", lineHeight: 1.85 }}>
                          <p className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>Explanation</p>
                          {quizQuestion.explanation.split(/(?=[A-E] is (?:in)?correct)/g).filter((s: string) => s.trim()).map((para: string, pi: number) => (
                            <p key={pi} className="text-sm mb-3 last:mb-0" style={{ color: "var(--text-secondary)" }}>{para.trim()}</p>
                          ))}
                        </div>
                        <div className="p-6 rounded-xl" style={{ background: "var(--amber-light)", border: "1px solid var(--amber-border)", lineHeight: 1.85 }}>
                          <p className="text-sm font-bold mb-1" style={{ color: "var(--amber-dark)" }}>Clinical Pearl</p>
                          <p className="text-sm" style={{ color: "var(--amber)" }}>{quizQuestion.clinicalPearl}</p>
                        </div>
                        <button onClick={generateQuiz} className="px-8 py-3 rounded-xl text-sm font-semibold"
                          style={{ background: "var(--accent)", color: "var(--text-on-accent)" }}>Next Question →</button>
                      </div>
                    )}
                  </div>
                )}

                {quizError && !quizQuestion && (
                  <div className="p-6 rounded-xl" style={{ background: "var(--error-light)", border: "1px solid var(--error)" }}>
                    <p className="text-sm" style={{ color: "var(--error)" }}>{quizError}</p>
                  </div>
                )}

                {!quizQuestion && !isLoading && !quizError && (
                  <div className="flex flex-col items-center text-center py-20 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <p className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Board-Style Quiz</p>
                    <p className="text-sm max-w-sm" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
                      Select a domain and difficulty, then click Generate Question.
                    </p>
                  </div>
                )}
              </div>

            ) : chatMode ? (
              /* ════ CHAT MODES ════ */
              <div>
                {messages.length === 0 && !isLoading ? (
                  <>
                    {/* Welcome section — compact, no huge whitespace */}
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                        {mode === "tutor" && "Welcome to EchoTutor"}
                        {mode === "scenario" && "Clinical Scenarios"}
                        {mode === "reference" && "Quick Reference"}
                      </h2>
                      <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.75 }}>
                        {mode === "tutor" && "Ask anything about perioperative echocardiography, TEE, cardiac anesthesia, or hemodynamics."}
                        {mode === "scenario" && "Interactive perioperative cases with staged decision-making."}
                        {mode === "reference" && "Quick lookups for normal values, grading criteria, TEE views, and formulas."}
                      </p>
                    </div>

                    {/* Suggestion cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(SUGGESTED_PROMPTS[mode] || []).map((prompt, i) => (
                        <button key={i} onClick={() => sendMessage(prompt)}
                          className="text-left p-6 rounded-xl text-sm transition-all"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", color: "var(--text-secondary)", lineHeight: 1.7 }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}>
                          {prompt}
                          <span className="block mt-3 text-xs font-semibold" style={{ color: "var(--accent)" }}>Ask this →</span>
                        </button>
                      ))}
                    </div>

                    {/* INPUT BAR — directly below cards */}
                    <InputBar input={input} setInput={setInput} onSend={() => sendMessage()} isLoading={isLoading}
                      placeholder={mode === "tutor" ? "Ask about TEE views, valve disease, hemodynamics..." : mode === "scenario" ? "Describe a scenario or request a new case..." : "Look up values, views, formulas..."} />
                  </>
                ) : (
                  <>
                    {/* Messages */}
                    <div className="space-y-6 mb-6">
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] px-6 py-4 rounded-2xl text-sm ${msg.role === "user" ? "rounded-br-lg" : "rounded-bl-lg"}`}
                            style={msg.role === "user"
                              ? { background: "var(--accent)", color: "var(--text-on-accent)" }
                              : { background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", color: "var(--text-primary)" }
                            }>
                            {msg.role === "assistant" ? (
                              msg.content ? <div className="markdown-content"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                                : <span className="animate-pulse-slow" style={{ color: "var(--text-muted)" }}>Thinking...</span>
                            ) : (
                              <p style={{ lineHeight: 1.75 }}>{msg.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* INPUT BAR — below messages */}
                    <InputBar input={input} setInput={setInput} onSend={() => sendMessage()} isLoading={isLoading}
                      placeholder="Type your follow-up question..." />
                  </>
                )}
              </div>
            ) : null}

          </div>
        </main>
      </div>
    </div>
  );
}