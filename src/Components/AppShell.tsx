// src/components/AppShell.tsx
"use client";

import { useState } from "react";
import { Mode } from "@/lib/types";
import Sidebar from "./Sidebar";
import TutorPage from "./pages/TutorPage";
import QuizPage from "./pages/QuizPage";
import ScenarioPage from "./pages/ScenarioPage";
import ReferencePage from "./pages/ReferencePage";
import GuidelinesPage from "./pages/GuidelinesPage";
import { Menu } from "lucide-react";

interface AppShellProps {
  initialMode: Mode;
}

const pageTitles: Record<Mode, string> = {
  tutor: "Tutor Mode",
  quiz: "Quiz Mode",
  scenario: "Clinical Scenarios",
  reference: "Quick Reference",
  guidelines: "Guidelines",
};

const AppShell = ({ initialMode }: AppShellProps) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setSidebarOpen(false);
    if (newMode === "quiz") setQuizScore({ correct: 0, total: 0 });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeMode={mode}
        onModeChange={handleModeChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-muted"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">
              {pageTitles[mode]}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {mode === "quiz" && quizScore.total > 0 && (
              <span className="text-sm font-medium text-muted-foreground">
                {quizScore.correct}/{quizScore.total} ·{" "}
                {Math.round((quizScore.correct / quizScore.total) * 100)}%
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">U</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          {mode === "tutor" && <TutorPage />}
          {mode === "quiz" && <QuizPage onScoreUpdate={setQuizScore} />}
          {mode === "scenario" && <ScenarioPage />}
          {mode === "reference" && <ReferencePage />}
          {mode === "guidelines" && <GuidelinesPage />}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
