// src/components/LandingPage.tsx
"use client";

import { Mode } from "@/lib/types";
import { BookOpen, Brain, Stethoscope, Library } from "lucide-react";

interface LandingPageProps {
  onStart: (mode?: Mode) => void;
}

const cards = [
  {
    mode: "tutor" as Mode,
    icon: BookOpen,
    title: "Tutor Mode",
    description: "Open-ended learning with an AI echocardiography expert",
  },
  {
    mode: "quiz" as Mode,
    icon: Brain,
    title: "Quiz Mode",
    description: "Board-style MCQs in PTEeXAM format with explanations",
  },
  {
    mode: "scenario" as Mode,
    icon: Stethoscope,
    title: "Clinical Scenarios",
    description: "Interactive perioperative cases with staged decisions",
  },
  {
    mode: "reference" as Mode,
    icon: Library,
    title: "Reference Library",
    description: "Quick lookups for normal values, views, and formulas",
  },
];

const LandingPage = ({ onStart }: LandingPageProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-2xl w-full text-center">
        <img
          src="/EchoTutor_logo.png"
          alt="EchoTutor — Perioperative Echocardiography Education"
          className="w-72 md:w-96 mx-auto mb-10 animate-fade-in"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {cards.map((card, i) => (
            <button
              key={card.mode}
              onClick={() => onStart(card.mode)}
              className={`echo-card p-5 text-left cursor-pointer animate-fade-in-delay-${i + 1}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <card.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{card.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => onStart()}
          className="animate-fade-in-delay-4 inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
        >
          Start Learning →
        </button>
        <p className="mt-8 text-xs text-muted-foreground animate-fade-in-delay-4">
          Grounded in ASE/SCA Guidelines · Educational use only · Not a clinical tool
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
