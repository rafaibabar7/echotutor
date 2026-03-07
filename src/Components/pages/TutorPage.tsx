// src/components/pages/TutorPage.tsx
"use client";
import ChatInterface from "../ChatInterface";

const TutorPage = () => (
  <ChatInterface
    mode="tutor"
    emptyStateTitle="Welcome to EchoTutor"
    emptyStateSubtitle="Ask anything about perioperative echocardiography, TEE, cardiac anesthesia, or hemodynamics."
    suggestedPrompts={[
      "Walk me through the ME four-chamber view — what structures do I see?",
      "Explain the Carpentier classification of mitral regurgitation",
      "How do I assess diastolic function using the ASE algorithm?",
      "What is the difference between primary and secondary MR?",
    ]}
  />
);

export default TutorPage;
