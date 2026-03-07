// src/components/pages/QuizPage.tsx
// ADAPTED: Lovable UI + your existing /api/chat backend
// Changes from Lovable version:
//   1. Fetch URL: Supabase → /api/chat
//   2. No Authorization header
//   3. Response: our route returns { content: jsonString }, we parse content
"use client";

import { useState, useCallback } from "react";
import { QuizQuestion } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";

const domains = [
  "Physics & Instrumentation",
  "Standard Views & Anatomy",
  "Valvular Heart Disease",
  "Ventricular Assessment",
  "Perioperative Applications",
  "Structural & Interventional",
];

const difficulties = ["Foundation", "Intermediate", "Advanced"];

interface QuizPageProps {
  onScoreUpdate: (score: { correct: number; total: number }) => void;
}

const QuizPage = ({ onScoreUpdate }: QuizPageProps) => {
  const [domain, setDomain] = useState(domains[0]);
  const [difficulty, setDifficulty] = useState(difficulties[0]);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const generateQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    setQuestion(null);
    setSelected(null);
    setSubmitted(false);

    try {
      // ---- ADAPTED: calls your Next.js API route ----
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Generate a ${difficulty} difficulty board-style question about ${domain}. Respond with ONLY the JSON object, no markdown formatting.`,
            },
          ],
          mode: "quiz",
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Error ${resp.status}`);
      }

      // ---- ADAPTED: our route returns { content: jsonString } ----
      const data = await resp.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const parsed: QuizQuestion = JSON.parse(data.content);
      setQuestion(parsed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate question";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [domain, difficulty]);

  const submitAnswer = () => {
    if (selected === null || !question) return;
    setSubmitted(true);
    const isCorrect = selected === question.correctAnswer;
    const newScore = {
      correct: score.correct + (isCorrect ? 1 : 0),
      total: score.total + 1,
    };
    setScore(newScore);
    onScoreUpdate(newScore);
  };

  const optionClass = (i: number) => {
    const base =
      "w-full text-left p-4 rounded-xl border-2 transition-colors text-[15px] leading-relaxed";
    if (!submitted) {
      return `${base} ${
        selected === i
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 bg-card"
      }`;
    }
    if (i === question!.correctAnswer)
      return `${base} border-success bg-success-light`;
    if (i === selected)
      return `${base} border-destructive bg-destructive/5`;
    return `${base} border-border bg-card opacity-60`;
  };

  return (
    <div className="h-full overflow-y-auto px-4 lg:px-6 py-6">
      <div className="max-w-3xl mx-auto">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none"
          >
            {domains.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none"
          >
            {difficulties.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <button
            onClick={generateQuestion}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Generate Question
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="echo-card p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Generating question...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="echo-card p-6 border-destructive bg-destructive/5">
            <p className="text-destructive font-medium mb-2">Error</p>
            <p className="text-sm text-destructive/80">{error}</p>
            <button
              onClick={generateQuestion}
              className="mt-3 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!question && !loading && !error && (
          <div className="echo-card p-12 text-center">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Board-Style Quiz
            </h2>
            <p className="text-muted-foreground">
              Select a domain and difficulty, then click &quot;Generate
              Question&quot; to begin.
            </p>
          </div>
        )}

        {/* Question */}
        {question && !loading && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <span className="echo-badge-blue">{question.domain}</span>
              <span className="echo-badge-amber">{question.difficulty}</span>
            </div>

            <div className="echo-card p-6">
              <p className="text-[15px] leading-relaxed text-foreground">
                {question.question}
              </p>
            </div>

            <div className="space-y-3">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => !submitted && setSelected(i)}
                  disabled={submitted}
                  className={optionClass(i)}
                >
                  {opt}
                </button>
              ))}
            </div>

            {!submitted ? (
              <button
                onClick={submitAnswer}
                disabled={selected === null}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Submit Answer
              </button>
            ) : (
              <>
                {/* Explanation */}
                <div className="echo-card p-5 bg-muted/50">
                  <h4 className="font-semibold text-foreground mb-2">
                    Explanation
                  </h4>
                  <div className="markdown-content text-sm">
                    <ReactMarkdown>{question.explanation}</ReactMarkdown>
                  </div>
                </div>

                {/* Clinical Pearl */}
                <div className="rounded-xl p-5 border bg-warning-light border-warning-border">
                  <h4 className="font-semibold text-foreground mb-1">
                    💡 Clinical Pearl
                  </h4>
                  <p className="text-sm text-foreground/80">
                    {question.clinicalPearl}
                  </p>
                </div>

                <button
                  onClick={generateQuestion}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Next Question →
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
