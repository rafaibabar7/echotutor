// src/lib/types.ts
export type Mode = "tutor" | "quiz" | "scenario" | "reference" | "guidelines";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  clinicalPearl: string;
  domain: string;
  difficulty: string;
}

export interface Guideline {
  title: string;
  organization: string;
  year: number;
  description: string;
  tags: string[];
  filename: string;
}
