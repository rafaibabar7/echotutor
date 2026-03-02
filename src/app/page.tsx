// src/app/page.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

// ============================================================
// TYPES
// ============================================================
type Mode = "tutor" | "quiz" | "scenario" | "reference";

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
// MODE CONFIGURATION
// ============================================================
const MODES: { key: Mode; label: string; icon: string; description: string }[] = [
  {
    key: "tutor",
    label: "Tutor",
    icon: "🎓",
    description: "Ask anything about TEE & echocardiography",
  },
  {
    key: "quiz",
    label: "Quiz",
    icon: "📝",
    description: "Board-style MCQ practice",
  },
  {
    key: "scenario",
    label: "Scenario",
    icon: "🏥",
    description: "Perioperative clinical cases",
  },
  {
    key: "reference",
    label: "Reference",
    icon: "📋",
    description: "Quick lookup: values, views, formulas",
  },
];

const QUIZ_DOMAINS = [
  "Physics & Instrumentation",
  "Standard Views & Anatomy",
  "Valvular Heart Disease",
  "Ventricular Assessment",
  "Perioperative Applications",
  "Structural & Interventional",
];

const QUIZ_DIFFICULTIES = ["Foundation", "Intermediate", "Advanced"];

const SUGGESTED_PROMPTS: Record<Mode, string[]> = {
  tutor: [
    "Walk me through the ME four-chamber view — what structures do I see and what am I looking for?",
    "Explain the Carpentier classification of mitral regurgitation with clinical examples",
    "How do I assess diastolic function step by step using the ASE algorithm?",
    "What is the difference between primary and secondary MR and why does it matter for surgery?",
  ],
  quiz: [],
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

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Home() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Reset state when switching modes
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setMessages([]);
    setInput("");
    setQuizQuestion(null);
    setSelectedAnswer(null);
    setShowExplanation(false);
    if (newMode !== "quiz") {
      // Keep quiz score persistent
    }
  };

  // ============================================================
  // CHAT HANDLER (Tutor, Scenario, Reference modes)
  // ============================================================
  const handleSendMessage = async (overrideInput?: string) => {
    const messageText = overrideInput || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: messageText.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // Add a placeholder for the assistant's response
    const assistantPlaceholder: ChatMessage = { role: "assistant", content: "" };
    setMessages([...updatedMessages, assistantPlaceholder]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode,
        }),
      });

      if (!response.ok) throw new Error("API request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });
        setMessages([
          ...updatedMessages,
          { role: "assistant", content: accumulated },
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // QUIZ HANDLER
  // ============================================================
  const handleGenerateQuiz = async () => {
    setIsLoading(true);
    setQuizQuestion(null);
    setSelectedAnswer(null);
    setShowExplanation(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Generate a ${quizDifficulty} difficulty board-style question about ${quizDomain}. Respond with ONLY the JSON object, no markdown formatting.`,
            },
          ],
          mode: "quiz",
        }),
      });

      if (!response.ok) throw new Error("API request failed");

      const data = await response.json();
      let content = data.content;

      // Clean up any markdown formatting
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      const parsed: QuizQuestion = JSON.parse(content);
      setQuizQuestion(parsed);
    } catch (error) {
      console.error("Quiz generation error:", error);
      alert("Failed to generate question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !quizQuestion) return;
    setShowExplanation(true);
    setQuizScore((prev) => ({
      correct:
        prev.correct + (selectedAnswer === quizQuestion.correctAnswer ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  // ============================================================
  // KEY HANDLER
  // ============================================================
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* ==================== HEADER ==================== */}
      <header
        className="flex-shrink-0 border-b"
        style={{
          background: "var(--navy-900)",
          borderColor: "var(--navy-700)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "var(--teal-500)" }}
            >
              ET
            </div>
            <div>
              <h1
                className="text-lg font-bold tracking-tight"
                style={{
                  color: "white",
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                }}
              >
                EchoTutor
              </h1>
              <p
                className="text-xs"
                style={{ color: "var(--navy-400)" }}
              >
                Valve Research Group, BIDMC — Harvard Medical School
              </p>
            </div>
          </div>
          {mode === "quiz" && quizScore.total > 0 && (
            <div
              className="text-sm px-3 py-1 rounded-full"
              style={{
                background: "var(--navy-700)",
                color: "var(--teal-400)",
              }}
            >
              Score: {quizScore.correct}/{quizScore.total} (
              {Math.round((quizScore.correct / quizScore.total) * 100)}%)
            </div>
          )}
        </div>
      </header>

      {/* ==================== MODE SELECTOR ==================== */}
      <div
        className="flex-shrink-0 border-b"
        style={{ background: "white", borderColor: "var(--border)" }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => handleModeChange(m.key)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                style={{
                  background:
                    mode === m.key ? "var(--navy-900)" : "transparent",
                  color: mode === m.key ? "white" : "var(--text-secondary)",
                }}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* QUIZ MODE */}
          {mode === "quiz" ? (
            <div className="space-y-6">
              {/* Quiz controls */}
              <div
                className="p-4 rounded-xl border"
                style={{
                  background: "white",
                  borderColor: "var(--border)",
                }}
              >
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[180px]">
                    <label
                      className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Domain
                    </label>
                    <select
                      value={quizDomain}
                      onChange={(e) => setQuizDomain(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--navy-50)",
                      }}
                    >
                      {QUIZ_DOMAINS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[150px]">
                    <label
                      className="block text-xs font-semibold mb-1 uppercase tracking-wide"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Difficulty
                    </label>
                    <select
                      value={quizDifficulty}
                      onChange={(e) => setQuizDifficulty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--navy-50)",
                      }}
                    >
                      {QUIZ_DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleGenerateQuiz}
                    disabled={isLoading}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                    style={{
                      background: isLoading
                        ? "var(--navy-400)"
                        : "var(--teal-500)",
                    }}
                  >
                    {isLoading ? "Generating..." : "Generate Question"}
                  </button>
                </div>
              </div>

              {/* Quiz question display */}
              {quizQuestion && (
                <div
                  className="p-6 rounded-xl border"
                  style={{
                    background: "white",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex gap-2 mb-4">
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{
                        background: "var(--navy-100)",
                        color: "var(--navy-700)",
                      }}
                    >
                      {quizQuestion.domain}
                    </span>
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{
                        background:
                          quizQuestion.difficulty === "Advanced"
                            ? "var(--red-100)"
                            : quizQuestion.difficulty === "Intermediate"
                              ? "var(--amber-100)"
                              : "var(--green-100)",
                        color:
                          quizQuestion.difficulty === "Advanced"
                            ? "var(--red-700)"
                            : quizQuestion.difficulty === "Intermediate"
                              ? "var(--amber-700)"
                              : "var(--green-700)",
                      }}
                    >
                      {quizQuestion.difficulty}
                    </span>
                  </div>

                  <p
                    className="text-base leading-relaxed mb-5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {quizQuestion.question}
                  </p>

                  <div className="space-y-2 mb-5">
                    {quizQuestion.options.map((option, idx) => {
                      let optionStyle: React.CSSProperties = {
                        background: "var(--navy-50)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      };

                      if (showExplanation) {
                        if (idx === quizQuestion.correctAnswer) {
                          optionStyle = {
                            background: "var(--green-100)",
                            borderColor: "var(--green-500)",
                            color: "var(--green-700)",
                          };
                        } else if (
                          idx === selectedAnswer &&
                          idx !== quizQuestion.correctAnswer
                        ) {
                          optionStyle = {
                            background: "var(--red-100)",
                            borderColor: "var(--red-500)",
                            color: "var(--red-700)",
                          };
                        }
                      } else if (idx === selectedAnswer) {
                        optionStyle = {
                          background: "white",
                          borderColor: "var(--teal-500)",
                          color: "var(--text-primary)",
                        };
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() =>
                            !showExplanation && setSelectedAnswer(idx)
                          }
                          disabled={showExplanation}
                          className="w-full text-left px-4 py-3 rounded-lg border-2 text-sm transition-all"
                          style={optionStyle}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {!showExplanation ? (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={selectedAnswer === null}
                      className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                      style={{
                        background:
                          selectedAnswer === null
                            ? "var(--navy-300)"
                            : "var(--teal-500)",
                      }}
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <div className="space-y-4 mt-4">
                      <div
                        className="p-4 rounded-lg text-sm leading-relaxed"
                        style={{
                          background: "var(--navy-50)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <p className="font-bold mb-2" style={{ fontFamily: "Plus Jakarta Sans" }}>
                          Explanation
                        </p>
                        <p>{quizQuestion.explanation}</p>
                      </div>
                      <div
                        className="p-4 rounded-lg text-sm leading-relaxed"
                        style={{
                          background: "var(--amber-100)",
                          color: "var(--amber-800)",
                        }}
                      >
                        <p className="font-bold mb-1">💡 Clinical Pearl</p>
                        <p>{quizQuestion.clinicalPearl}</p>
                      </div>
                      <button
                        onClick={handleGenerateQuiz}
                        className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ background: "var(--teal-500)" }}
                      >
                        Next Question →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Empty state */}
              {!quizQuestion && !isLoading && (
                <div className="text-center py-16">
                  <p className="text-5xl mb-4">📝</p>
                  <p
                    className="text-lg font-semibold mb-2"
                    style={{ fontFamily: "Plus Jakarta Sans" }}
                  >
                    Board-Style Quiz
                  </p>
                  <p
                    className="text-sm max-w-md mx-auto"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Select a domain and difficulty, then click Generate Question
                    to start practicing. Questions follow the NBE PTEeXAM
                    format.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* CHAT MODES (Tutor, Scenario, Reference) */
            <div className="space-y-4">
              {messages.length === 0 && !isLoading ? (
                /* Empty state with suggested prompts */
                <div className="py-12">
                  <div className="text-center mb-8">
                    <p className="text-5xl mb-4">
                      {MODES.find((m) => m.key === mode)?.icon}
                    </p>
                    <p
                      className="text-xl font-bold mb-2"
                      style={{ fontFamily: "Plus Jakarta Sans" }}
                    >
                      {mode === "tutor" && "Welcome to EchoTutor"}
                      {mode === "scenario" && "Clinical Scenario Mode"}
                      {mode === "reference" && "Quick Reference"}
                    </p>
                    <p
                      className="text-sm max-w-lg mx-auto"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {mode === "tutor" &&
                        "Ask me anything about perioperative echocardiography, TEE, cardiac anesthesia, or hemodynamics. I'm grounded in ASE/SCA guidelines."}
                      {mode === "scenario" &&
                        "I'll present you with a perioperative case and guide you through clinical decision-making step by step."}
                      {mode === "reference" &&
                        "Quick, concise lookups for normal values, grading criteria, TEE views, and hemodynamic formulas."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {SUGGESTED_PROMPTS[mode]?.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left px-4 py-3 rounded-xl border text-sm transition-all hover:border-[var(--teal-500)]"
                        style={{
                          background: "white",
                          borderColor: "var(--border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Message list */
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"
                      }`}
                      style={
                        msg.role === "user"
                          ? {
                              background: "var(--navy-900)",
                              color: "white",
                            }
                          : {
                              background: "white",
                              border: "1px solid var(--border)",
                              color: "var(--text-primary)",
                            }
                      }
                    >
                      {msg.role === "assistant" ? (
                        msg.content ? (
                          <div className="markdown-content">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <span
                            className="animate-pulse-slow inline-block"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Thinking...
                          </span>
                        )
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* ==================== INPUT BAR ==================== */}
      {mode !== "quiz" && (
        <div
          className="flex-shrink-0 border-t"
          style={{ background: "white", borderColor: "var(--border)" }}
        >
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div
              className="flex items-end gap-3 p-2 rounded-xl border"
              style={{
                background: "var(--navy-50)",
                borderColor: "var(--border)",
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === "tutor"
                    ? "Ask about TEE views, valve disease, hemodynamics..."
                    : mode === "scenario"
                      ? "Respond to the scenario or request a new case..."
                      : "Look up values, views, formulas..."
                }
                rows={1}
                className="flex-1 resize-none bg-transparent outline-none text-sm py-2 px-2"
                style={{
                  color: "var(--text-primary)",
                  maxHeight: "120px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = target.scrollHeight + "px";
                }}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-lg transition-all flex-shrink-0"
                style={{
                  background:
                    !input.trim() || isLoading
                      ? "var(--navy-200)"
                      : "var(--teal-500)",
                  color: "white",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p
              className="text-xs mt-2 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              EchoTutor is for educational purposes only. Not a clinical tool.
              Grounded in ASE/SCA Guidelines.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}