// src/components/pages/ScenarioPage.tsx
"use client";
import ChatInterface from "../ChatInterface";

const ScenarioPage = () => (
  <ChatInterface
    mode="scenario"
    emptyStateTitle="Clinical Scenarios"
    emptyStateSubtitle="Interactive perioperative cases with staged decision-making."
    suggestedPrompts={[
      "Give me a case involving mitral valve repair assessment",
      "Present a scenario with post-CPB hemodynamic instability",
      "Give me a case where I need to assess a patient for TAVR",
      "Present a case with unexpected intraoperative TEE findings",
    ]}
  />
);

export default ScenarioPage;
