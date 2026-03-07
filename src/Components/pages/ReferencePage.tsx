// src/components/pages/ReferencePage.tsx
"use client";
import ChatInterface from "../ChatInterface";

const ReferencePage = () => (
  <ChatInterface
    mode="reference"
    emptyStateTitle="Quick Reference"
    emptyStateSubtitle="Quick lookups for normal values, grading criteria, TEE views, and formulas."
    suggestedPrompts={[
      "Normal values for LV dimensions and function",
      "Grading criteria for aortic stenosis",
      "All 28 comprehensive TEE views with probe positions",
      "Hemodynamic formulas with sample calculations",
    ]}
  />
);

export default ReferencePage;
